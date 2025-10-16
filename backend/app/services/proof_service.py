from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from pathlib import Path
import json
import time

from app.models.verification import ProofJob, Verification, ProofStatus
from app.models.model_registry import ModelRegistry
from app.models.user import User
from app.schemas.proof import ProofJobCreate
from app.services.zkml_proof_service import ZKMLProofService
from app.workers.celery_app import celery_app
from app.core.config import settings


class ProofService:
    """Service for managing proof generation and verification."""
    
    @staticmethod
    async def create_proof_job(
        proof_data: ProofJobCreate,
        user: User,
        db: AsyncSession
    ) -> ProofJob:

        # Verify model exists and user has access
        result = await db.execute(
            select(ModelRegistry).where(ModelRegistry.id == proof_data.model_id)
        )
        model = result.scalar_one_or_none()
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Access control: public models or owned models
        if not model.is_public and model.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to private model"
            )
        
        # Only ONNX models supported for now
        if model.model_type != "onnx":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only ONNX models are supported for proof generation"
            )
        
        # Compute input hash
        input_hash = ZKMLProofService.compute_input_hash(proof_data.input_data)
        
        # Save input data to temporary location first
        # We need to save it before creating the proof job to get the path
        import tempfile
        import uuid
        
        # Generate a unique ID for this proof job
        unique_id = str(uuid.uuid4())[:8]
        proof_dir = ZKMLProofService.prepare_proof_directory(unique_id)
        input_path = await ZKMLProofService.save_input_data(
            proof_data.input_data,
            proof_dir
        )
        
        # Create proof job with input path
        proof_job = ProofJob(
            model_id=model.id,
            user_id=user.id,
            input_data_hash=input_hash,
            input_data_path=str(input_path),
            status=ProofStatus.PENDING
        )
        
        db.add(proof_job)
        await db.commit()
        await db.refresh(proof_job)
        
        # Rename directory to use the actual proof job ID
        import shutil
        final_proof_dir = Path(settings.EZKL_PROOFS_DIR) / str(proof_job.id)
        if final_proof_dir.exists():
            shutil.rmtree(final_proof_dir)
        shutil.move(str(proof_dir), str(final_proof_dir))
        
        # Update input path with new location
        final_input_path = final_proof_dir / "input.json"
        proof_job.input_data_path = str(final_input_path)
        await db.commit()
        
        # Queue Celery task
        from app.workers.tasks.proof_generation import generate_zkml_proof_task
        task = generate_zkml_proof_task.delay(proof_job.id)
        
        # Update with Celery task ID
        proof_job.celery_task_id = task.id
        await db.commit()
        
        return proof_job
    
    @staticmethod
    async def get_proof_job_status(
        proof_job_id: int,
        user: User,
        db: AsyncSession
    ) -> ProofJob:
        """Get proof job status with access control."""
        result = await db.execute(
            select(ProofJob).where(ProofJob.id == proof_job_id)
        )
        proof_job = result.scalar_one_or_none()
        
        if not proof_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proof job not found"
            )
        
        # Access control: only job owner can view
        if proof_job.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this proof job"
            )
        
        return proof_job
    
    @staticmethod
    async def verify_proof(
        proof_job_id: int,
        user: User,
        db: AsyncSession
    ) -> Verification:

        import time
        
        # Get proof job
        result = await db.execute(
            select(ProofJob).where(ProofJob.id == proof_job_id)
        )
        proof_job = result.scalar_one_or_none()
        
        if not proof_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proof job not found"
            )
        
        if proof_job.status != ProofStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot verify proof with status: {proof_job.status}"
            )
        
        # Verify proof using EZKL
        proof_path = Path(proof_job.proof_path)
        settings_path = Path(proof_job.settings_path)
        vk_path = proof_path.parent / "vk.key"
        srs_path = proof_path.parent / "kzg.srs"
        
        start_time = time.time()
        
        try:
            is_valid = await ZKMLProofService.verify_proof(
                proof_path=proof_path,
                settings_path=settings_path,
                vk_path=vk_path,
                srs_path=srs_path
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Verification failed: {str(e)}"
            )
        
        verification_time_ms = int((time.time() - start_time) * 1000)
        
        # Create verification record
        verification = Verification(
            proof_job_id=proof_job.id,
            model_id=proof_job.model_id,
            verifier_id=user.id,
            is_valid=is_valid,
            verification_time_ms=verification_time_ms,
            verification_method="ezkl"
        )
        
        db.add(verification)
        await db.commit()
        await db.refresh(verification)
        
        return verification
    
    @staticmethod
    async def list_user_proof_jobs(
        user: User,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[list[ProofJob], int]:
        """List all proof jobs for a user."""
        # Get total count
        count_result = await db.execute(
            select(func.count()).select_from(ProofJob).where(ProofJob.user_id == user.id)
        )
        total = count_result.scalar()
        
        # Get proof jobs
        result = await db.execute(
            select(ProofJob)
            .where(ProofJob.user_id == user.id)
            .order_by(ProofJob.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        proof_jobs = result.scalars().all()
        
        return list(proof_jobs), total

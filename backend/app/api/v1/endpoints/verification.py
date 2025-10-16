from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database.session import get_db
from app.schemas.proof import (
    ProofJobCreate,
    ProofJobResponse,
    ProofJobStatus,
    VerificationRequest,
    VerificationResponse
)
from app.services.proof_service import ProofService
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.verification import ProofJob, ProofStatus as ProofStatusEnum
from sqlalchemy import select, func

router = APIRouter()


@router.post("/generate-proof", response_model=ProofJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_proof(
    proof_data: ProofJobCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    # Rate limit: max 10 pending or processing proof jobs per user
    result = await db.execute(
        select(func.count())
        .select_from(ProofJob)
        .where(
            ProofJob.user_id == current_user.id,
            ProofJob.status.in_([ProofStatusEnum.PENDING, ProofStatusEnum.PROCESSING])
        )
    )
    if result.scalar() >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many pending proof jobs. Please wait for existing jobs to complete."
        )

    proof_job = await ProofService.create_proof_job(
        proof_data=proof_data,
        user=current_user,
        db=db
    )
    
    return proof_job


@router.get("/status/{proof_job_id}", response_model=ProofJobStatus)
async def get_proof_status(
    proof_job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    proof_job = await ProofService.get_proof_job_status(
        proof_job_id=proof_job_id,
        user=current_user,
        db=db
    )
    
    return {
        "id": proof_job.id,
        "status": proof_job.status,
        "error_message": proof_job.error_message,
        "proof_available": proof_job.status == ProofStatusEnum.COMPLETED
    }


@router.get("/job/{proof_job_id}", response_model=ProofJobResponse)
async def get_proof_job_details(
    proof_job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get full details of a proof job."""
    proof_job = await ProofService.get_proof_job_status(
        proof_job_id=proof_job_id,
        user=current_user,
        db=db
    )
    
    return proof_job


@router.post("/verify", response_model=VerificationResponse)
async def verify_proof(
    verification_data: VerificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    verification = await ProofService.verify_proof(
        proof_job_id=verification_data.proof_job_id,
        user=current_user,
        db=db
    )
    
    return verification


@router.get("/my-proofs", response_model=List[ProofJobResponse])
async def list_my_proofs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all proof jobs for the current user."""
    proof_jobs, total = await ProofService.list_user_proof_jobs(
        user=current_user,
        db=db,
        skip=skip,
        limit=limit
    )
    
    return proof_jobs

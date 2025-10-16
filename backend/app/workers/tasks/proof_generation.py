import logging
from pathlib import Path
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError, SQLAlchemyError
import asyncio

from app.workers.celery_app import celery_app
from app.core.config import settings
from app.models.verification import ProofJob, ProofStatus
from app.models.model_registry import ModelRegistry
from app.models.user import User
from app.services.zkml_proof_service import ZKMLProofService

# Setup logging
logger = logging.getLogger(__name__)

# Create synchronous database engine for Celery tasks
sync_engine = create_engine(
    str(settings.DATABASE_URL).replace("+asyncpg", ""),
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections after 1 hour
    pool_size=5,
    max_overflow=10,
)
SyncSession = sessionmaker(bind=sync_engine)


@celery_app.task(
    bind=True,
    name="generate_zkml_proof",
    autoretry_for=(OperationalError, ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=600,  # Max 10 minutes
    retry_jitter=True,
    max_retries=3,
    acks_late=True,
)
def generate_zkml_proof_task(self, proof_job_id: int):

    db = SyncSession()
    
    try:
        # Update job status to processing
        proof_job = db.query(ProofJob).filter(ProofJob.id == proof_job_id).first()
        if not proof_job:
            logger.error(f"ProofJob {proof_job_id} not found")
            raise ValueError(f"ProofJob {proof_job_id} not found")
        
        # Skip if already completed
        if proof_job.status == ProofStatus.COMPLETED:
            logger.info(f"ProofJob {proof_job_id} already completed, skipping")
            return {
                "proof_job_id": proof_job_id,
                "status": "already_completed",
                "proof_path": proof_job.proof_path
            }
        
        proof_job.status = ProofStatus.PROCESSING
        proof_job.started_at = datetime.utcnow()
        proof_job.celery_task_id = self.request.id
        db.commit()
        
        logger.info(f"Starting proof generation for job {proof_job_id} (attempt {self.request.retries + 1})")
        
        # Load model
        model = db.query(ModelRegistry).filter(ModelRegistry.id == proof_job.model_id).first()
        if not model:
            logger.error(f"Model {proof_job.model_id} not found")
            raise ValueError(f"Model {proof_job.model_id} not found")
        
        model_path = Path(model.storage_path)
        if not model_path.exists():
            logger.error(f"Model file not found: {model_path}")
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        # Prepare proof directory
        proof_dir = Path(settings.EZKL_PROOFS_DIR) / str(proof_job_id)
        proof_dir.mkdir(parents=True, exist_ok=True)
        
        # Load input data
        input_path = Path(proof_job.input_data_path)
        if not input_path.exists():
            logger.error(f"Input data not found: {input_path}")
            raise FileNotFoundError(f"Input data not found: {input_path}")
        
        # Generate proof using asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            proof_path, witness_path = loop.run_until_complete(
                ZKMLProofService.generate_proof(
                    model_path=model_path,
                    input_path=input_path,
                    proof_dir=proof_dir,
                    model_hash=getattr(model, "model_hash", "unknown") or "unknown"
                )
            )
        finally:
            loop.close()
        
        # Update job with results
        proof_job.status = ProofStatus.COMPLETED
        proof_job.proof_path = str(proof_path)
        proof_job.witness_path = str(witness_path)
        proof_job.settings_path = str(proof_dir / "settings.json")
        proof_job.completed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"✅ Proof generation completed for job {proof_job_id}")
        
        return {
            "proof_job_id": proof_job_id,
            "status": "completed",
            "proof_path": str(proof_path),
            "attempts": self.request.retries + 1,
        }
        
    except (OperationalError, ConnectionError, TimeoutError) as e:
        # These errors will be automatically retried by Celery
        logger.warning(
            f"Retriable error for job {proof_job_id} (attempt {self.request.retries + 1}): {e}"
        )
        
        # Update job status to show retry attempt
        try:
            proof_job = db.query(ProofJob).filter(ProofJob.id == proof_job_id).first()
            if proof_job:
                proof_job.error_message = f"Retry {self.request.retries + 1}: {str(e)}"
                db.commit()
        except:
            pass
        
        raise  # Let Celery handle the retry
        
    except Exception as e:
        logger.error(f"❌ Proof generation failed for job {proof_job_id}: {e}", exc_info=True)
        
        # Update job status to failed
        try:
            proof_job = db.query(ProofJob).filter(ProofJob.id == proof_job_id).first()
            if proof_job:
                proof_job.status = ProofStatus.FAILED
                proof_job.error_message = str(e)
                proof_job.completed_at = datetime.utcnow()
                db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update job status: {db_error}")
        
        # Don't raise - task is permanently failed
        return {
            "proof_job_id": proof_job_id,
            "status": "failed",
            "error": str(e),
        }
        
    finally:
        db.close()


@celery_app.task(name="cleanup_old_proofs")
def cleanup_old_proofs_task(days_old: int = 7):
    logger.info(f"Starting proof cleanup task (removing proofs older than {days_old} days)")
    
    from datetime import timedelta
    import shutil
    
    db = SyncSession()
    
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Find old completed proof jobs
        old_jobs = db.query(ProofJob).filter(
            ProofJob.status == ProofStatus.COMPLETED,
            ProofJob.completed_at < cutoff_date
        ).all()
        
        cleaned_count = 0
        freed_bytes = 0
        
        for job in old_jobs:
            try:
                proof_dir = Path(settings.EZKL_PROOFS_DIR) / str(job.id)
                
                if proof_dir.exists():
                    # Calculate directory size before deletion
                    dir_size = sum(f.stat().st_size for f in proof_dir.rglob('*') if f.is_file())
                    
                    # Delete directory
                    shutil.rmtree(proof_dir)
                    
                    # Update job record
                    job.proof_path = None
                    job.witness_path = None
                    job.settings_path = None
                    
                    cleaned_count += 1
                    freed_bytes += dir_size
                    
                    logger.info(f"Cleaned proof job {job.id} ({dir_size / 1024 / 1024:.2f} MB)")
                    
            except Exception as e:
                logger.error(f"Failed to cleanup proof job {job.id}: {e}")
                continue
        
        db.commit()
        
        freed_mb = freed_bytes / 1024 / 1024
        logger.info(f"✅ Cleanup completed: {cleaned_count} jobs, {freed_mb:.2f} MB freed")
        
        return {
            "cleaned_count": cleaned_count,
            "freed_mb": freed_mb,
            "cutoff_date": cutoff_date.isoformat(),
        }
        
    except Exception as e:
        logger.error(f"Cleanup task failed: {e}", exc_info=True)
        raise
        
    finally:
        db.close()

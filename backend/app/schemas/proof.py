from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.verification import ProofStatus


class ProofJobCreate(BaseModel):
    """Schema for creating a proof generation job."""
    model_id: int = Field(..., description="ID of the model to prove")
    input_data: Dict[str, Any] = Field(..., description="Input data for the model")
    expected_output: Optional[Dict[str, Any]] = Field(None, description="Expected output (optional)")


class ProofJobResponse(BaseModel):
    """Schema for proof job response."""
    id: int
    model_id: int
    user_id: int
    status: ProofStatus
    celery_task_id: Optional[str]
    input_data_hash: str
    proof_path: Optional[str]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    
    model_config = {"from_attributes": True}


class ProofJobStatus(BaseModel):
    """Schema for checking proof job status."""
    id: int
    status: ProofStatus
    progress: Optional[str] = None
    error_message: Optional[str] = None
    proof_available: bool = False


class VerificationRequest(BaseModel):
    """Schema for proof verification request."""
    proof_job_id: int = Field(..., description="ID of proof job to verify")


class VerificationResponse(BaseModel):
    """Schema for verification result."""
    id: int
    proof_job_id: int
    model_id: int
    is_valid: bool
    verification_time_ms: Optional[int]
    verified_at: datetime
    
    model_config = {"from_attributes": True}

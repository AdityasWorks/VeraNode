from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Base schema
class ModelBase(BaseModel):
    """Base model schema with common attributes."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    version: str = Field(default="1.0.0", pattern=r"^\d+\.\d+\.\d+$")
    model_type: str = Field(..., description="Model type: pytorch, onnx, tensorflow")
    is_public: bool = False


# Schema for model registration
class ModelCreate(ModelBase):
    """Schema for registering a new model."""
    pass


# Schema for model response
class ModelResponse(ModelBase):
    """Schema for model data in responses."""
    id: int
    owner_id: int
    model_hash: str
    merkle_root: Optional[str] = None
    model_size_bytes: int
    blockchain_tx_hash: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


# Schema for model commitment (just the hash)
class ModelCommitment(BaseModel):
    """Schema for model cryptographic commitment."""
    model_id: int
    model_hash: str
    merkle_root: Optional[str] = None


# Schema for model list response
class ModelListResponse(BaseModel):
    """Schema for paginated model list."""
    total: int
    models: list[ModelResponse]
    page: int
    page_size: int

from pathlib import Path
from typing import Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status, UploadFile
import aiofiles
import os

from app.models.model_registry import ModelRegistry
from app.models.user import User
from app.schemas.model import ModelCreate, ModelResponse
from app.core.config import settings
from app.utils.crypto import (
    compute_file_hash,
    generate_merkle_root_from_weights,
    compute_stream_hash
)
from app.utils.model_validator import ModelValidator


class ModelRegistryService:
    """Service for managing AI model registration and storage."""
    
    @staticmethod
    async def save_uploaded_file(
        file: UploadFile,
        owner_id: int,
        model_name: str
    ) -> tuple[Path, int]:

        # Create directory structure: models/{owner_id}/{timestamp}_{model_name}/
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        model_dir = Path(settings.EZKL_MODELS_DIR) / str(owner_id) / f"{timestamp}_{model_name}"
        model_dir.mkdir(parents=True, exist_ok=True)
        
        # Save file with original filename
        file_path = model_dir / file.filename
        
        # Write file in chunks to handle large files
        file_size = 0
        async with aiofiles.open(file_path, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # Read 1MB at a time
                await out_file.write(content)
                file_size += len(content)
        
        return file_path, file_size
    
    @staticmethod
    async def register_model(
        model_data: ModelCreate,
        file: UploadFile,
        owner: User,
        db: AsyncSession
    ) -> ModelRegistry:

        # Check if model with same name and owner exists
        result = await db.execute(
            select(ModelRegistry).where(
                ModelRegistry.name == model_data.name,
                ModelRegistry.owner_id == owner.id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Model '{model_data.name}' already exists for this user"
            )
        
        # Validate file extension matches model type
        file_ext = ModelValidator.get_file_extension(file.filename)
        expected_extensions = {
            "onnx": ["onnx"],
            "pytorch": ["pt", "pth"],
            "tensorflow": ["h5", "pb"]
        }
        
        if file_ext not in expected_extensions.get(model_data.model_type, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension .{file_ext} does not match model type {model_data.model_type}"
            )
        
        # Save file to storage
        try:
            file_path, file_size = await ModelRegistryService.save_uploaded_file(
                file, owner.id, model_data.name
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )
        
        # Validate file size and model structure
        is_valid, error_msg = ModelValidator.validate_model_file(
            file_path, model_data.model_type, file_size
        )
        if not is_valid:
            # Clean up saved file
            try:
                os.remove(file_path)
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Compute cryptographic commitments
        try:
            model_hash = compute_file_hash(file_path)
            
            # Generate Merkle root for weight verification (optional but recommended)
            merkle_root = None
            if model_data.model_type == "onnx":
                # For ONNX models, compute Merkle root from weight chunks
                merkle_root = generate_merkle_root_from_weights(file_path)
        
        except Exception as e:
            # Clean up on error
            try:
                os.remove(file_path)
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to compute model hash: {str(e)}"
            )
        
        # Check if hash already exists (duplicate model)
        result = await db.execute(
            select(ModelRegistry).where(ModelRegistry.model_hash == model_hash)
        )
        if result.scalar_one_or_none():
            # Clean up duplicate file
            try:
                os.remove(file_path)
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A model with identical weights already exists in the registry"
            )
        
        # Create database entry
        new_model = ModelRegistry(
            name=model_data.name,
            description=model_data.description,
            owner_id=owner.id,
            version=model_data.version,
            model_type=model_data.model_type,
            model_hash=model_hash,
            merkle_root=merkle_root,
            model_size_bytes=file_size,
            storage_path=str(file_path),
            is_public=model_data.is_public,
        )
        
        db.add(new_model)
        await db.commit()
        await db.refresh(new_model)
        
        return new_model
    
    @staticmethod
    async def get_model_by_id(
        model_id: int,
        db: AsyncSession,
        current_user: Optional[User] = None
    ) -> Optional[ModelRegistry]:

        result = await db.execute(
            select(ModelRegistry).where(ModelRegistry.id == model_id)
        )
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        # Access control: public models or owned models
        if not model.is_public:
            if not current_user or model.owner_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to private model"
                )
        
        return model
    
    @staticmethod
    async def list_models(
        db: AsyncSession,
        current_user: Optional[User] = None,
        skip: int = 0,
        limit: int = 20,
        owner_id: Optional[int] = None,
        model_type: Optional[str] = None,
        public_only: bool = False
    ) -> tuple[list[ModelRegistry], int]:

        # Build query
        query = select(ModelRegistry)
        
        # Apply filters
        if public_only or not current_user:
            query = query.where(ModelRegistry.is_public == True)
        elif current_user:
            # Show public models + user's own models
            query = query.where(
                (ModelRegistry.is_public == True) | 
                (ModelRegistry.owner_id == current_user.id)
            )
        
        if owner_id:
            query = query.where(ModelRegistry.owner_id == owner_id)
        
        if model_type:
            query = query.where(ModelRegistry.model_type == model_type)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(ModelRegistry.created_at.desc())
        
        result = await db.execute(query)
        models = result.scalars().all()
        
        return list(models), total
    
    @staticmethod
    async def delete_model(
        model_id: int,
        current_user: User,
        db: AsyncSession
    ) -> bool:

        result = await db.execute(
            select(ModelRegistry).where(ModelRegistry.id == model_id)
        )
        model = result.scalar_one_or_none()
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        # Access control: only owner or admin can delete
        from app.models.user import UserRole
        if model.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only model owner or admin can delete this model"
            )
        
        # Delete file from storage
        try:
            file_path = Path(model.storage_path)
            if file_path.exists():
                os.remove(file_path)
                # Try to remove parent directory if empty
                try:
                    file_path.parent.rmdir()
                except:
                    pass
        except Exception as e:
            # Log error but continue with database deletion
            import logging
            logging.error(f"Failed to delete model file: {e}")
        
        # Delete from database
        await db.delete(model)
        await db.commit()
        
        return True

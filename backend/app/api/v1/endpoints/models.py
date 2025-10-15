from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database.session import get_db
from app.schemas.model import ModelCreate, ModelResponse, ModelListResponse, ModelCommitment
from app.services.model_registry_service import ModelRegistryService
from app.api.deps import get_current_active_user, require_model_provider
from app.models.user import User

router = APIRouter()


@router.post("/register", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def register_model(
    name: str = Query(..., description="Model name"),
    description: Optional[str] = Query(None, description="Model description"),
    version: str = Query("1.0.0", description="Model version (semver format)"),
    model_type: str = Query(..., description="Model type: onnx, pytorch, or tensorflow"),
    is_public: bool = Query(False, description="Make model publicly accessible"),
    file: UploadFile = File(..., description="Model file to upload"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    # Create model data object
    model_data = ModelCreate(
        name=name,
        description=description,
        version=version,
        model_type=model_type,
        is_public=is_public
    )
    
    # Register model
    model = await ModelRegistryService.register_model(
        model_data=model_data,
        file=file,
        owner=current_user,
        db=db
    )
    
    return model


@router.get("/", response_model=ModelListResponse)
async def list_models(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    owner_id: Optional[int] = Query(None, description="Filter by owner ID"),
    model_type: Optional[str] = Query(None, description="Filter by model type"),
    public_only: bool = Query(False, description="Only show public models"),
    current_user: Optional[User] = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    models, total = await ModelRegistryService.list_models(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        owner_id=owner_id,
        model_type=model_type,
        public_only=public_only
    )
    
    page = (skip // limit) + 1
    
    return {
        "total": total,
        "models": models,
        "page": page,
        "page_size": limit
    }


@router.get("/my-models", response_model=ModelListResponse)
async def get_my_models(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    models, total = await ModelRegistryService.list_models(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        owner_id=current_user.id
    )
    
    page = (skip // limit) + 1
    
    return {
        "total": total,
        "models": models,
        "page": page,
        "page_size": limit
    }


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: int,
    current_user: Optional[User] = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    model = await ModelRegistryService.get_model_by_id(
        model_id=model_id,
        db=db,
        current_user=current_user
    )
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    return model


@router.get("/{model_id}/commitment", response_model=ModelCommitment)
async def get_model_commitment(
    model_id: int,
    current_user: Optional[User] = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    model = await ModelRegistryService.get_model_by_id(
        model_id=model_id,
        db=db,
        current_user=current_user
    )
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    return {
        "model_id": model.id,
        "model_hash": model.model_hash,
        "merkle_root": model.merkle_root
    }


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    await ModelRegistryService.delete_model(
        model_id=model_id,
        current_user=current_user,
        db=db
    )
    
    return None

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    APIKeyResponse
)
from app.services.auth_service import AuthService
from app.core.security import create_access_token, create_refresh_token
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):

    user = await AuthService.register_user(user_data, db)
    return user


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):

    user = await AuthService.authenticate_user(login_data, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    access_token = create_access_token(
        subject=user.id,
        additional_claims={"role": user.role.value, "email": user.email}
    )
    refresh_token = create_refresh_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):

    return current_user


@router.post("/api-key", response_model=APIKeyResponse)
async def generate_api_key(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    api_key = await AuthService.generate_user_api_key(current_user.id, db)
    
    return {
        "api_key": api_key,
        "message": "Store this API key securely. It will not be shown again."
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):

    return {
        "message": "Successfully logged out",
        "detail": "Please discard your access token"
    }

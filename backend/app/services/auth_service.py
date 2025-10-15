from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    generate_api_key
)
import logging

logger = logging.getLogger(__name__)


class AuthService:
    
    @staticmethod
    async def register_user(user_data: UserCreate, db: AsyncSession) -> User:
        # Check if email already exists
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if username already exists
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Create new user
        try:
        # Create new user
            new_user = User(
                email=user_data.email,
                username=user_data.username,
                hashed_password=get_password_hash(user_data.password),
                role=user_data.role,
                is_active=True,
                is_verified=False  # Will implement email verification later
            )
            
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            
            return new_user
        except ValueError as e:
            # Handle validation errors
            logger.error(f"Error during user registration: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    
    @staticmethod
    async def authenticate_user(
        login_data: UserLogin,
        db: AsyncSession
    ) -> Optional[User]:
        result = await db.execute(
            select(User).where(User.email == login_data.email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        if not verify_password(login_data.password, user.hashed_password):
            return None
        
        return user
    
    @staticmethod
    async def generate_user_api_key(user_id: int, db: AsyncSession) -> str:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Generate API key
        api_key = generate_api_key()
        
        # Store hashed version
        user.api_key_hash = get_password_hash(api_key)
        await db.commit()
        
        return api_key

from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.session import get_db
from app.core.security import decode_token, verify_api_key
from app.models.user import User, UserRole
from app.core.config import settings

# OAuth2 scheme for JWT tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

# API Key scheme
api_key_header = APIKeyHeader(name=settings.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decode token
    payload = decode_token(token)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Get user from database
    result = await db.execute(
        select(User).where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_current_user_with_api_key(
    api_key: Optional[str] = Depends(api_key_header),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:

    if not api_key:
        return None
    
    # Query user with matching API key hash
    result = await db.execute(
        select(User).where(User.api_key_hash != None)
    )
    users = result.scalars().all()
    
    for user in users:
        if verify_api_key(api_key, user.api_key_hash):
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Inactive user"
                )
            return user
    
    return None


async def get_current_user_flexible(
    jwt_user: Optional[User] = Depends(get_current_active_user),
    api_user: Optional[User] = Depends(get_current_user_with_api_key)
) -> User:

    user = jwt_user or api_user
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


# Role-based access control decorators
def require_role(required_role: UserRole):
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        # Admin has access to everything
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        # Check if user has required role
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role.value}"
            )
        
        return current_user
    
    return role_checker


# Specific role dependencies
require_admin = require_role(UserRole.ADMIN)
require_model_provider = require_role(UserRole.MODEL_PROVIDER)
require_verifier = require_role(UserRole.VERIFIER)

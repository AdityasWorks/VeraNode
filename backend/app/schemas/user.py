from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


# Base schema with common attributes
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)


# Schema for user registration
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    role: Optional[UserRole] = UserRole.USER
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        password_bytes = v.encode('utf-8')
        if len(password_bytes) > 72:
            raise ValueError("Password is too long. Use a maximum of 72 bytes (some special characters count as multiple bytes).")
            
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in v):
            raise ValueError("Password must contain at least one lowercase letter")
        
        return v


# Schema for user login
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Schema for user response (no sensitive data)
class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


# Schema for user update
class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)


# Schema for token response
class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


# Schema for token payload
class TokenPayload(BaseModel):
    sub: str  # Subject (user_id)
    exp: Optional[datetime] = None  # Expiration
    iat: Optional[datetime] = None  # Issued at


# Schema for API key generation
class APIKeyResponse(BaseModel):
    api_key: str
    message: str = "Store this API key securely. It will not be shown again."

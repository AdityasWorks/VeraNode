from fastapi import APIRouter
from app.api.v1.endpoints import health, auth , models


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(models.router, prefix="/models", tags=["Models"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])


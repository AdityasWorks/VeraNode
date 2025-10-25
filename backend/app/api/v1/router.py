from fastapi import APIRouter
from app.api.v1.endpoints import health, auth  # , models, verification


api_router = APIRouter()
# Auth is now enabled - User model is complete
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
# Still disabled until models are complete:
# api_router.include_router(models.router, prefix="/models", tags=["Models"])
# api_router.include_router(verification.router, prefix="/verification", tags=["Verification"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])


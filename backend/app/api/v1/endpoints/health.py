from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text
from app.database.session import get_db
from app.core.config import settings  # Add this import
import psutil
import time

router = APIRouter()


@router.get("/detailed")
async def detailed_health(db: AsyncSession = Depends(get_db)):

    start_time = time.time()
    
    # Database check
    db_latency = None
    try:
        db_start = time.time()
        await db.execute(text("SELECT 1"))
        db_latency = (time.time() - db_start) * 1000  # ms
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # System metrics
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    response_time = (time.time() - start_time) * 1000  # ms
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": time.time(),
        "response_time_ms": round(response_time, 2),
        "database": {
            "status": db_status,
            "latency_ms": round(db_latency, 2) if db_latency else None,
        },
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_mb": memory.available // (1024 * 1024),
            "disk_percent": disk.percent,
        },
    }

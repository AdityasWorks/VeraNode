from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# Create Celery app instance
celery_app = Celery(
    "veranode_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks.proof_generation"]
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    
    # Timezone
    timezone="UTC",
    enable_utc=True,
    
    # Task execution
    task_track_started=True,
    task_time_limit=7200,  # 2 hours hard limit
    task_soft_time_limit=6000,  # 100 minutes soft limit
    task_acks_late=True,  # Acknowledge after task completes (safer)
    task_reject_on_worker_lost=True,  # Reject if worker crashes
    
    # Worker configuration
    worker_prefetch_multiplier=1,  # One task at a time for heavy ML tasks
    worker_max_tasks_per_child=5,  # Restart worker after 5 tasks (prevent memory leaks)
    worker_disable_rate_limits=False,  # Enable rate limiting
    
    # Broker connection
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    
    # Result backend
    result_expires=86400,  # Results expire after 24 hours
    result_backend_transport_options={
        'master_name': 'mymaster',  # For Redis Sentinel
        'visibility_timeout': 3600,
    },
    
    # Task routing and priority
    task_default_priority=5,
    task_queue_max_priority=10,
    
    # Retry configuration
    task_autoretry_for=(Exception,),  # Auto-retry on any exception
    task_retry_backoff=True,  # Exponential backoff
    task_retry_backoff_max=600,  # Max 10 minutes between retries
    task_retry_jitter=True,  # Add randomness to prevent thundering herd
    task_max_retries=3,  # Max 3 retries


)


# Periodic task schedule
celery_app.conf.beat_schedule = {
    'cleanup-old-proofs': {
        'task': 'cleanup_old_proofs',
        'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM
        'args': (7,),  # Delete proofs older than 7 days
    },
}
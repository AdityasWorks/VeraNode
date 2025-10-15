import logging
import sys
from pathlib import Path
import os

from app.core.config import settings


def setup_logging():
    """
    Configure application-wide logging.
    Logs to both console and file with graceful fallback.
    """
    
    # Configure format and level
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    log_level = getattr(logging, settings.LOG_LEVEL)
    
    # Always set up console logging
    handlers = [logging.StreamHandler(sys.stdout)]
    
    # Try to set up file logging
    try:
        # Create logs directory relative to current working directory
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True, mode=0o755)  # Explicit permissions
        
        log_file = log_dir / "veranode.log"
        
        # Ensure the file is writable or can be created
        if log_file.exists() and not os.access(log_file, os.W_OK):
            print(f"Warning: Log file {log_file} exists but is not writable. Using console logging only.")
        else:
            handlers.append(logging.FileHandler(log_file))
            print(f"Logging to file: {log_file}")
    except Exception as e:
        print(f"Warning: Could not set up file logging: {e}. Using console logging only.")
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=handlers,
    )
    
    # Set third-party loggers to WARNING
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
from pathlib import Path
from typing import Optional
import hashlib
import shutil
from app.core.config import settings


class ProofCacheService:
    """Service for caching and reusing proof artifacts across jobs."""
    
    @staticmethod
    def get_model_cache_key(model_hash: str, input_hash: str) -> str:
        """Generate cache key for model + input combination."""
        combined = f"{model_hash}_{input_hash}"
        return hashlib.sha256(combined.encode()).hexdigest()[:16]
    
    @staticmethod
    def get_cache_dir() -> Path:
        """Get base cache directory."""
        cache_dir = Path(settings.EZKL_PROOFS_DIR) / "_cache"
        cache_dir.mkdir(exist_ok=True)
        return cache_dir
    
    @staticmethod
    def cache_setup_artifacts(
        proof_job_id: int,
        model_hash: str
    ) -> None:

        source_dir = Path(settings.EZKL_PROOFS_DIR) / str(proof_job_id)
        cache_dir = ProofCacheService.get_cache_dir() / model_hash
        
        if cache_dir.exists():
            return  # Already cached
        
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy reusable artifacts
        artifacts = [
            "network.ezkl",
            "settings.json",
            "pk.key",
            "vk.key",
            "kzg.srs"
        ]
        
        for artifact in artifacts:
            src = source_dir / artifact
            if src.exists():
                shutil.copy2(src, cache_dir / artifact)
    
    @staticmethod
    def get_cached_artifacts(model_hash: str) -> Optional[Path]:
        """Get cached setup artifacts for a model."""
        cache_dir = ProofCacheService.get_cache_dir() / model_hash
        
        # Verify all required artifacts exist
        required = ["network.ezkl", "settings.json", "pk.key", "vk.key", "kzg.srs"]
        if all((cache_dir / art).exists() for art in required):
            return cache_dir
        
        return None

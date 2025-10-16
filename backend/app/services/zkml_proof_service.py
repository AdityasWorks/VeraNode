import json
import os
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from datetime import datetime
import asyncio
from fastapi import HTTPException, status

from app.core.config import settings
from app.utils.crypto import hash_string
from app.utils.ezkl_helper import (
    sync_gen_settings,
    sync_calibrate_settings,
    sync_compile_circuit,
    sync_get_srs,
    sync_setup,
    sync_gen_witness,
    sync_prove,
    sync_verify
)



class ZKMLProofService:
    """Service for ZKML proof generation and verification using EZKL."""
    
    @staticmethod
    def prepare_proof_directory(proof_job_id: int) -> Path:

        proof_dir = Path(settings.EZKL_PROOFS_DIR) / str(proof_job_id)
        proof_dir.mkdir(parents=True, exist_ok=True)
        return proof_dir
    
    @staticmethod
    async def save_input_data(input_data: Dict[str, Any], proof_dir: Path) -> Path:

        input_path = proof_dir / "input.json"
        
        # Convert input data to EZKL format
        # EZKL expects format: {"input_data": [[values]]}
        ezkl_input = {
            "input_data": input_data.get("input_data", []),
        }
        
        if "output_data" in input_data:
            ezkl_input["output_data"] = input_data["output_data"]
        
        with open(input_path, 'w') as f:
            json.dump(ezkl_input, f)
        
        return input_path
    
    @staticmethod
    def fix_settings_types(settings_path: Path) -> None:
        with open(settings_path, 'r') as f:
            settings_data = json.load(f)
        
        # Function to recursively convert string numbers to int/float
        def convert_value(value):
            if isinstance(value, str):
                # Try to convert to int
                try:
                    return int(value)
                except ValueError:
                    pass
                
                # Try to convert to float
                try:
                    return float(value)
                except ValueError:
                    pass
                
                # Check for boolean strings
                if value.lower() == 'true':
                    return True
                elif value.lower() == 'false':
                    return False
                
                # Return as is if no conversion worked
                return value
            elif isinstance(value, dict):
                return {k: convert_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [convert_value(v) for v in value]
            else:
                return value
        
        # Convert all values
        settings_data = convert_value(settings_data)
        
        # Write back
        with open(settings_path, 'w') as f:
            json.dump(settings_data, f, indent=2)
    
    @staticmethod
    async def setup_model(
        model_path: Path, 
        proof_dir: Path, 
        input_path: Path
    ) -> Tuple[Path, Path, Path]:

        compiled_model = proof_dir / "network.ezkl"
        settings_path = proof_dir / "settings.json"
        pk_path = proof_dir / "pk.key"
        vk_path = proof_dir / "vk.key"
        srs_path = proof_dir / "kzg.srs"
        
        try:
            loop = asyncio.get_event_loop()
            
            # Step 1: Generate initial settings
            print("Step 1: Generating settings...")
            await loop.run_in_executor(None, sync_gen_settings, str(model_path), str(settings_path))
            
            # Step 2: Calibrate settings with input data
            print("Step 2: Calibrating settings...")
            await loop.run_in_executor(
                None,
                sync_calibrate_settings,
                str(input_path),
                str(model_path),
                str(settings_path),
                "resources"
            )
            
            # Step 3: Fix data types in settings.json
            print("Step 3: Fixing settings data types...")
            ZKMLProofService.fix_settings_types(settings_path)
            
            # Step 4: Compile circuit
            print("Step 4: Compiling circuit...")
            await loop.run_in_executor(
                None,
                sync_compile_circuit,
                str(model_path),
                str(compiled_model),
                str(settings_path)
            )
            
            # Step 5: Get SRS (Structured Reference String)
            print("Step 5: Getting SRS...")

            # Generate SRS using the settings file, which contains the logrows
            await loop.run_in_executor(None, sync_get_srs, str(srs_path), str(settings_path))

            # Step 6: Setup (generate proving and verifying keys)
            print("Step 6: Generating proving and verification keys...")
            await loop.run_in_executor(
                None,
                sync_setup,
                str(compiled_model),
                str(vk_path),
                str(pk_path),
                str(srs_path)
            )
            
            print("Setup completed successfully!")
            return compiled_model, pk_path, vk_path
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Setup error details:\n{error_details}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"EZKL setup failed: {str(e)}"
            )
    
    @staticmethod
    async def generate_proof(
        model_path: Path,
        input_path: Path,
        proof_dir: Path,
        model_hash: str
    ) -> Tuple[Path, Path]:
        witness_path = proof_dir / "witness.json"
        proof_path = proof_dir / "proof.json"
        settings_path = proof_dir / "settings.json"
        compiled_model = proof_dir / "network.ezkl"
        pk_path = proof_dir / "pk.key"
        srs_path = proof_dir / "kzg.srs"
        
        try:
            loop = asyncio.get_event_loop()
            
            # Try to reuse cached setup artifacts first
            from app.services.proof_cache_service import ProofCacheService
            cached_dir = ProofCacheService.get_cached_artifacts(model_hash)
            if cached_dir:
                print("Using cached setup artifacts!")
                import shutil
                for artifact in ["network.ezkl", "settings.json", "pk.key", "vk.key", "kzg.srs"]:
                    src = cached_dir / artifact
                    if src.exists():
                        shutil.copy2(src, proof_dir / artifact)
            else:
                # Run full setup (will create compiled model, keys, SRS)
                print("No cached artifacts found – running setup...")
                await ZKMLProofService.setup_model(model_path, proof_dir, input_path)
                # Cache for future proofs of the same model
                try:
                    # proof_dir.name should be the proof job id; cache only needs model-hash key
                    ProofCacheService.cache_setup_artifacts(int(proof_dir.name), model_hash)
                except Exception as cache_err:
                    print(f"Warning: failed to cache setup artifacts: {cache_err}")
            
            # Step 1: Generate witness
            print("Generating witness...")
            await loop.run_in_executor(
                None,
                sync_gen_witness,
                str(input_path),
                str(compiled_model),
                str(witness_path)
            )
            
            # Step 2: Generate proof
            print("Generating proof...")
            await loop.run_in_executor(
                None,
                sync_prove,
                str(witness_path),
                str(compiled_model),
                str(pk_path),
                str(proof_path),
                str(srs_path),
                "single"  # explicit proof type
            )
            
            print("Proof generation completed!")
            return proof_path, witness_path
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Proof generation error details:\n{error_details}")
            raise Exception(f"Proof generation failed: {str(e)}")
    
    @staticmethod
    async def verify_proof(
        proof_path: Path,
        settings_path: Path,
        vk_path: Path,
        srs_path: Path
    ) -> bool:
        try:
            loop = asyncio.get_event_loop()
            
            print("Verifying proof...")
            result = await loop.run_in_executor(
                None,
                sync_verify,
                str(proof_path),
                str(settings_path),
                str(vk_path),
                str(srs_path)
            )
            
            print(f"Verification result: {result}")
            return result
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Verification error details:\n{error_details}")
            raise Exception(f"Proof verification failed: {str(e)}")
    
    @staticmethod
    def compute_input_hash(input_data: Dict[str, Any]) -> str:
        """Compute hash of input data for tracking."""
        input_json = json.dumps(input_data, sort_keys=True)
        return hash_string(input_json)
    
    @staticmethod
    def compute_output_hash(output_data: Dict[str, Any]) -> str:
        """Compute hash of output data."""
        output_json = json.dumps(output_data, sort_keys=True)
        return hash_string(output_json)

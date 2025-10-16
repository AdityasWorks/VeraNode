import ezkl
import json
from pathlib import Path
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


def sync_gen_settings(model_path: str, settings_path: str) -> bool:
    """Synchronous wrapper for gen_settings."""
    try:
        result = ezkl.gen_settings(model_path, settings_path)
        logger.info(f"gen_settings result: {result}")
        return result
    except Exception as e:
        logger.error(f"gen_settings failed: {e}")
        raise


def sync_calibrate_settings(data_path: str, model_path: str, settings_path: str, target: str) -> None:
    """Synchronous wrapper for calibrate_settings."""
    try:
        ezkl.calibrate_settings(data_path, model_path, settings_path, target)
        logger.info("calibrate_settings completed")
    except Exception as e:
        logger.error(f"calibrate_settings failed: {e}")
        raise


def sync_compile_circuit(model_path: str, compiled_path: str, settings_path: str) -> None:
    """Synchronous wrapper for compile_circuit."""
    try:
        ezkl.compile_circuit(model_path, compiled_path, settings_path)
        logger.info("compile_circuit completed")
    except Exception as e:
        logger.error(f"compile_circuit failed: {e}")
        raise


def sync_get_srs(srs_path: str, settings_path: str) -> None:
    """Synchronous wrapper for get_srs using a settings file."""
    try:
        logger.info(f"Calling get_srs with keyword settings_path={settings_path}")
        # Use keyword argument to be explicit
        ezkl.get_srs(srs_path=srs_path, settings_path=settings_path)
        logger.info("get_srs completed")
    except Exception as e:
        logger.error(f"get_srs failed: {e}")
        raise


def sync_setup(compiled_path: str, vk_path: str, pk_path: str, srs_path: str) -> None:
    """Synchronous wrapper for setup."""
    try:
        ezkl.setup(compiled_path, vk_path, pk_path, srs_path)
        logger.info("setup completed")
    except Exception as e:
        logger.error(f"setup failed: {e}")
        raise


def sync_gen_witness(input_path: str, compiled_path: str, witness_path: str) -> None:
    """Synchronous wrapper for gen_witness."""
    try:
        ezkl.gen_witness(input_path, compiled_path, witness_path)
        logger.info("gen_witness completed")
    except Exception as e:
        logger.error(f"gen_witness failed: {e}")
        raise


def sync_prove(
    witness_path: str,
    compiled_path: str,
    pk_path: str,
    proof_path: str,
    srs_path: str,
    proof_type: str = "single",
) -> None:
    try:
        ezkl.prove(
            witness=witness_path,
            model=compiled_path,
            pk_path=pk_path,
            proof_path=proof_path,
            proof_type=proof_type,  # must be 'single' or 'for-aggr'
            srs_path=srs_path,
        )
        logger.info("prove completed (type=%s)" % proof_type)
    except Exception as e:
        logger.error(f"prove failed: {e}")
        raise


def sync_verify(proof_path: str, settings_path: str, vk_path: str, srs_path: str) -> bool:
    """Synchronous wrapper for verify."""
    try:
        result = ezkl.verify(proof_path, settings_path, vk_path, srs_path)
        logger.info(f"verify result: {result}")
        return result
    except Exception as e:
        logger.error(f"verify failed: {e}")
        raise

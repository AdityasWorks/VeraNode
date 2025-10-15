from pathlib import Path
from typing import Optional, Tuple
import magic
import onnx
from onnx import checker


class ModelValidator:
    """Validator for AI model files."""
    
    # Supported model types and their MIME types
    SUPPORTED_TYPES = {
        "onnx": ["application/octet-stream"],
        "pytorch": ["application/zip", "application/octet-stream"],
        "tensorflow": ["application/x-hdf", "application/octet-stream"],
    }
    
    MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024  # 5GB max
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Extract file extension from filename."""
        return Path(filename).suffix.lower().lstrip(".")
    
    @staticmethod
    def validate_file_size(file_size: int) -> Tuple[bool, Optional[str]]:

        if file_size <= 0:
            return False, "File is empty"
        
        if file_size > ModelValidator.MAX_FILE_SIZE:
            max_size_gb = ModelValidator.MAX_FILE_SIZE / (1024 ** 3)
            return False, f"File size exceeds maximum allowed size of {max_size_gb}GB"
        
        return True, None
    
    @staticmethod
    def validate_onnx_model(file_path: Path) -> Tuple[bool, Optional[str]]:

        try:
            # Load ONNX model
            model = onnx.load(str(file_path))
            
            # Check model validity
            checker.check_model(model)
            
            return True, None
            
        except onnx.checker.ValidationError as e:
            return False, f"ONNX validation failed: {str(e)}"
        except Exception as e:
            return False, f"Failed to validate ONNX model: {str(e)}"
    
    @staticmethod
    def validate_model_file(
        file_path: Path,
        model_type: str,
        file_size: int
    ) -> Tuple[bool, Optional[str]]:
        
        # Validate file size
        is_valid, error = ModelValidator.validate_file_size(file_size)
        if not is_valid:
            return False, error
        
        # Validate based on model type
        if model_type == "onnx":
            return ModelValidator.validate_onnx_model(file_path)
        
        elif model_type == "pytorch":
            # Basic check: PyTorch models are typically .pt or .pth files
            if file_path.suffix.lower() not in [".pt", ".pth"]:
                return False, "PyTorch model must have .pt or .pth extension"
            return True, None
        
        elif model_type == "tensorflow":
            # TensorFlow models can be .h5, .pb, or SavedModel format
            if file_path.suffix.lower() not in [".h5", ".pb", ""]:
                return False, "TensorFlow model must have .h5 or .pb extension"
            return True, None
        
        else:
            return False, f"Unsupported model type: {model_type}"

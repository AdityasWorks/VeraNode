"""
ONNX Model Fixer for EZKL compatibility.
Fixes common issues like missing padding parameters in Conv/Pool layers.
"""

import onnx
from onnx import helper, numpy_helper
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def fix_onnx_model(model_path: Path, output_path: Path = None) -> Path:
    """
    Fix ONNX model to be EZKL-compatible by adding missing parameters.
    
    Args:
        model_path: Path to input ONNX model
        output_path: Path to save fixed model (if None, overwrites input)
    
    Returns:
        Path to fixed model
    """
    try:
        # Load the model
        logger.info(f"Loading ONNX model from {model_path}")
        model = onnx.load(str(model_path))
        
        # Check model validity
        onnx.checker.check_model(model)
        logger.info("Model loaded successfully")
        
        # Track if any changes were made
        changes_made = False
        
        # Iterate through all nodes
        for node in model.graph.node:
            # Handle Conv, MaxPool, AveragePool nodes
            if node.op_type in ['Conv', 'MaxPool', 'AveragePool', 'ConvTranspose']:
                logger.debug(f"Checking {node.op_type} node: {node.name}")
                
                # Check for padding attribute
                attr_names = [attr.name for attr in node.attribute]
                
                if 'pads' not in attr_names:
                    logger.warning(f"Adding missing 'pads' attribute to {node.op_type} node: {node.name}")
                    
                    # Determine default padding based on operation
                    if node.op_type == 'Conv':
                        # For Conv, use [0, 0, 0, 0] (no padding)
                        default_pads = [0, 0, 0, 0]
                    elif node.op_type in ['MaxPool', 'AveragePool']:
                        # For pooling, use [0, 0, 0, 0]
                        default_pads = [0, 0, 0, 0]
                    else:
                        default_pads = [0, 0, 0, 0]
                    
                    # Add padding attribute
                    padding_attr = helper.make_attribute('pads', default_pads)
                    node.attribute.append(padding_attr)
                    changes_made = True
                    logger.info(f"✅ Added pads={default_pads} to {node.name}")
                
                # Ensure auto_pad is set correctly if present
                auto_pad_attr = next((attr for attr in node.attribute if attr.name == 'auto_pad'), None)
                if auto_pad_attr and auto_pad_attr.s.decode('utf-8') in ['SAME_UPPER', 'SAME_LOWER']:
                    # If auto_pad is set to SAME_*, change it to NOTSET and add explicit pads
                    logger.warning(f"Changing auto_pad from {auto_pad_attr.s.decode('utf-8')} to NOTSET for {node.name}")
                    auto_pad_attr.s = b'NOTSET'
                    changes_made = True
        
        # Only save if changes were made
        if changes_made:
            if output_path is None:
                output_path = model_path.parent / f"{model_path.stem}_fixed{model_path.suffix}"
            
            logger.info(f"Saving fixed model to {output_path}")
            onnx.save(model, str(output_path))
            logger.info("✅ Model fixed and saved successfully")
            
            return output_path
        else:
            logger.info("No changes needed, model is already compatible")
            return model_path
            
    except Exception as e:
        logger.error(f"Failed to fix ONNX model: {e}")
        raise


def validate_onnx_for_ezkl(model_path: Path) -> tuple[bool, list[str]]:
    """
    Validate if ONNX model is compatible with EZKL.
    
    Returns:
        (is_valid, list_of_issues)
    """
    issues = []
    
    try:
        model = onnx.load(str(model_path))
        onnx.checker.check_model(model)
        
        for node in model.graph.node:
            # Check Conv/Pool nodes for missing parameters
            if node.op_type in ['Conv', 'MaxPool', 'AveragePool', 'ConvTranspose']:
                attr_names = [attr.name for attr in node.attribute]
                
                if 'pads' not in attr_names:
                    issues.append(f"{node.op_type} node '{node.name}' missing 'pads' attribute")
                
                # Check for problematic auto_pad
                auto_pad_attr = next((attr for attr in node.attribute if attr.name == 'auto_pad'), None)
                if auto_pad_attr and auto_pad_attr.s.decode('utf-8') in ['SAME_UPPER', 'SAME_LOWER']:
                    issues.append(f"{node.op_type} node '{node.name}' has auto_pad={auto_pad_attr.s.decode('utf-8')} (should be NOTSET or explicit pads)")
        
        return (len(issues) == 0, issues)
        
    except Exception as e:
        issues.append(f"Model validation error: {str(e)}")
        return (False, issues)


def get_model_info(model_path: Path) -> dict:
    """Get basic information about an ONNX model."""
    try:
        model = onnx.load(str(model_path))
        
        # Get input/output info
        inputs = []
        for inp in model.graph.input:
            shape = [dim.dim_value if dim.dim_value > 0 else -1 
                    for dim in inp.type.tensor_type.shape.dim]
            inputs.append({
                "name": inp.name,
                "shape": shape,
                "dtype": inp.type.tensor_type.elem_type
            })
        
        outputs = []
        for out in model.graph.output:
            shape = [dim.dim_value if dim.dim_value > 0 else -1 
                    for dim in out.type.tensor_type.shape.dim]
            outputs.append({
                "name": out.name,
                "shape": shape,
                "dtype": out.type.tensor_type.elem_type
            })
        
        # Count nodes by type
        node_types = {}
        for node in model.graph.node:
            node_types[node.op_type] = node_types.get(node.op_type, 0) + 1
        
        return {
            "opset_version": model.opset_import[0].version,
            "inputs": inputs,
            "outputs": outputs,
            "node_types": node_types,
            "total_nodes": len(model.graph.node)
        }
        
    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        return {}

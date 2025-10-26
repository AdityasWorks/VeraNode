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
        
        # Fix 1: Merge Conv + Add (bias) into Conv with bias
        print("="*60)
        print("STEP 1: Merging Conv + Add patterns")
        print("="*60)
        changes_made = _merge_conv_add_bias(model) or changes_made
        print(f"Changes made: {changes_made}")
        print()
        
        # Fix 2: Replace Reshape with Flatten for EZKL compatibility
        print("="*60)
        print("STEP 2: Replacing Reshape with Flatten")
        print("="*60)
        changes_made = _replace_reshape_with_flatten(model) or changes_made
        print(f"Changes made: {changes_made}")
        print()
        
        # Fix 3: Convert MatMul patterns to Gemm
        print("="*60)
        print("STEP 3: Converting MatMul to Gemm")
        print("="*60)
        changes_made = _convert_matmul_to_gemm(model) or changes_made
        print(f"Changes made: {changes_made}")
        print()
        
        # Fix 4: Fix padding attributes
        print("="*60)
        print("STEP 4: Fixing padding attributes")
        print("="*60)
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
        
        # Fix 5: Change Opset to 10 (EZKL examples use Opset 10)
        print("="*60)
        print("STEP 5: Changing Opset to 10 (EZKL compatibility)")
        print("="*60)
        current_opset = model.opset_import[0].version
        if current_opset != 10:
            logger.info(f"Changing Opset from {current_opset} to 10")
            model.opset_import[0].version = 10
            changes_made = True
            logger.info("✅ Changed Opset to 10")
        else:
            logger.info("Opset is already 10")
        print(f"Opset version: {model.opset_import[0].version}")
        print()
        
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


def _merge_conv_add_bias(model: onnx.ModelProto) -> bool:
    """
    Merge Conv + Add (bias) pattern into Conv with bias.
    EZKL has issues with separate Add nodes for bias - prefers bias in Conv.
    Also reshapes bias to 1D if needed (EZKL requires 1D bias).
    
    Returns:
        True if any changes were made
    """
    changes_made = False
    
    logger.info("Checking for Conv + Add patterns to merge...")
    
    # Build a map of node name/output -> node
    output_to_node = {}
    for node in model.graph.node:
        for output in node.output:
            output_to_node[output] = node
    
    # Build initializer map
    initializers = {init.name: init for init in model.graph.initializer}
    
    # First, fix any 3D bias shapes to 1D for existing Conv nodes with bias
    for node in model.graph.node:
        if node.op_type == 'Conv' and len(node.input) == 3:
            bias_name = node.input[2]
            if bias_name in initializers:
                bias_init = initializers[bias_name]
                if len(bias_init.dims) > 1:
                    logger.info(f"🔧 Reshaping bias '{bias_name}' from {list(bias_init.dims)} to 1D")
                    # Convert to numpy, reshape, convert back
                    bias_array = numpy_helper.to_array(bias_init)
                    bias_flat = bias_array.reshape(-1)
                    
                    # Create new initializer with flattened bias
                    new_bias_init = numpy_helper.from_array(bias_flat, name=bias_name)
                    
                    # Replace in model
                    for i, init in enumerate(model.graph.initializer):
                        if init.name == bias_name:
                            model.graph.initializer[i].CopyFrom(new_bias_init)
                            changes_made = True
                            logger.info(f"✅ Reshaped bias '{bias_name}' to {list(new_bias_init.dims)}")
                            break
    
    # Find Conv -> Add patterns
    nodes_to_remove = []
    
    for i, node in enumerate(model.graph.node):
        if node.op_type != 'Conv':
            continue
            
        # Skip if Conv already has bias (3 inputs)
        if len(node.input) == 3:
            logger.debug(f"Conv '{node.name}' already has bias, skipping")
            continue
        
        conv_output = node.output[0]
        logger.debug(f"Checking Conv '{node.name}' output '{conv_output}'")
        
        # Find nodes that consume this Conv's output
        for next_node in model.graph.node:
            if next_node.op_type == 'Add' and conv_output in next_node.input:
                logger.debug(f"  Found Add node '{next_node.name}' consuming Conv output")
                
                # Get the other input (potential bias)
                bias_input = None
                for inp in next_node.input:
                    if inp != conv_output:
                        bias_input = inp
                        break
                
                if not bias_input:
                    logger.debug(f"  Add node has no other input, skipping")
                    continue
                
                # Check if it's an initializer (constant)
                if bias_input in initializers:
                    logger.info(f"🔧 Found Conv + Add pattern:")
                    logger.info(f"   Conv: '{node.name}' -> '{conv_output}'")
                    logger.info(f"   Add: '{next_node.name}' adding bias '{bias_input}'")
                    logger.info(f"   Merging into Conv with bias...")
                    
                    # Check if bias needs reshaping (must be 1D for EZKL)
                    bias_init = initializers[bias_input]
                    if len(bias_init.dims) > 1:
                        logger.info(f"   Bias has shape {list(bias_init.dims)}, reshaping to 1D")
                        bias_array = numpy_helper.to_array(bias_init)
                        bias_flat = bias_array.reshape(-1)
                        
                        # Create new flattened bias initializer
                        new_bias_init = numpy_helper.from_array(bias_flat, name=bias_input)
                        
                        # Replace in model
                        for idx, init in enumerate(model.graph.initializer):
                            if init.name == bias_input:
                                model.graph.initializer[idx].CopyFrom(new_bias_init)
                                logger.info(f"   ✅ Reshaped bias to {list(new_bias_init.dims)}")
                                break
                    
                    # Add bias as third input to Conv
                    node.input.append(bias_input)
                    
                    # Update Conv output to skip the Add node
                    node.output[0] = next_node.output[0]
                    
                    # Mark Add node for removal
                    nodes_to_remove.append(next_node)
                    changes_made = True
                    logger.info(f"✅ Merged bias '{bias_input}' into Conv '{node.name}'")
                    break  # Only merge one Add per Conv
                else:
                    logger.debug(f"  Other input '{bias_input}' is not an initializer, skipping")
    
    # Remove the merged Add nodes
    for node in nodes_to_remove:
        logger.info(f"Removing merged Add node: '{node.name}'")
        model.graph.node.remove(node)
    
    if changes_made:
        logger.info(f"✅ Merged {len(nodes_to_remove)} Conv + Add patterns")
    else:
        logger.info("No Conv + Add patterns found to merge")
    
    return changes_made


def _replace_reshape_with_flatten(model: onnx.ModelProto) -> bool:
    """
    Replace Reshape nodes with Flatten where possible for EZKL compatibility.
    EZKL has issues with Reshape operations even with static shapes.
    
    Returns:
        True if any changes were made
    """
    changes_made = False
    
    logger.info("Checking for Reshape nodes to replace with Flatten...")
    
    nodes_to_replace = []
    
    for i, node in enumerate(model.graph.node):
        if node.op_type != 'Reshape':
            continue
        
        logger.debug(f"Found Reshape node: '{node.name}'")
        
        # Check if this is a flatten operation (reshaping to 2D for dense layer)
        # Typically: [batch, channels, height, width] -> [batch, channels*height*width]
        shape_input = node.input[1]
        
        # Find the shape initializer
        shape_init = None
        for init in model.graph.initializer:
            if init.name == shape_input:
                shape_init = init
                break
        
        if shape_init:
            shape_array = numpy_helper.to_array(shape_init)
            logger.debug(f"  Shape: {shape_array}")
            
            # Check if it's a flatten pattern (2D output with batch size 1)
            if len(shape_array) == 2 and shape_array[0] == 1:
                logger.info(f"🔧 Replacing Reshape '{node.name}' with Flatten")
                logger.info(f"   Original shape: {shape_array}")
                
                # Create Flatten node
                # Flatten has an 'axis' attribute (default 1) that specifies from which axis to flatten
                flatten_node = helper.make_node(
                    'Flatten',
                    inputs=[node.input[0]],  # Only need the data input, not the shape
                    outputs=node.output,
                    name=f"{node.name}_flatten",
                    axis=1  # Flatten from axis 1 (keep batch dimension)
                )
                
                nodes_to_replace.append((i, flatten_node))
                changes_made = True
                logger.info(f"✅ Will replace with Flatten(axis=1)")
    
    # Replace the nodes
    for idx, flatten_node in reversed(nodes_to_replace):
        logger.info(f"Replacing node at index {idx} with Flatten")
        model.graph.node[idx].CopyFrom(flatten_node)
    
    if changes_made:
        logger.info(f"✅ Replaced {len(nodes_to_replace)} Reshape nodes with Flatten")
    else:
        logger.info("No Reshape nodes to replace")
    
    return changes_made


def _convert_matmul_to_gemm(model: onnx.ModelProto) -> bool:
    """
    Convert Reshape + MatMul + Add pattern to Gemm operation.
    EZKL prefers Gemm for fully connected layers over MatMul.
    
    Pattern: Flatten/Reshape -> MatMul(input, Reshape(weight)) -> Add(bias)
    Replace with: Gemm(input, weight, bias)
    
    Returns:
        True if any changes were made
    """
    changes_made = False
    
    logger.info("Checking for MatMul patterns to convert to Gemm...")
    
    # Build initializer map
    initializers = {init.name: init for init in model.graph.initializer}
    
    nodes_to_remove = []
    
    for i, node in enumerate(model.graph.node):
        if node.op_type != 'MatMul':
            continue
        
        logger.debug(f"Found MatMul node: '{node.name}'")
        
        # Check if second input comes from a Reshape of an initializer
        matmul_input_a = node.input[0]  # Feature map
        matmul_input_b = node.input[1]  # Weight (possibly reshaped)
        
        # Find if input B comes from a Reshape
        reshape_node = None
        weight_init_name = None
        
        for n in model.graph.node:
            if n.op_type == 'Reshape' and n.output[0] == matmul_input_b:
                reshape_node = n
                weight_init_name = n.input[0]  # Original weight before reshape
                break
        
        if not reshape_node or weight_init_name not in initializers:
            logger.debug(f"  MatMul '{node.name}' doesn't match pattern (no Reshape of initializer)")
            continue
        
        logger.info(f"🔧 Found MatMul + Reshape pattern:")
        logger.info(f"   MatMul: '{node.name}'")
        logger.info(f"   Reshape: '{reshape_node.name}' reshaping '{weight_init_name}'")
        
        # Check if MatMul output goes to an Add (for bias)
        matmul_output = node.output[0]
        add_node = None
        bias_init_name = None
        
        for n in model.graph.node:
            if n.op_type == 'Add' and matmul_output in n.input:
                add_node = n
                # Find the bias input (the one that's not from MatMul)
                for inp in n.input:
                    if inp != matmul_output and inp in initializers:
                        bias_init_name = inp
                        break
                break
        
        if add_node and bias_init_name:
            logger.info(f"   Add: '{add_node.name}' adding bias '{bias_init_name}'")
            
            # Get weight initializer and reshape if needed
            weight_init = initializers[weight_init_name]
            weight_array = numpy_helper.to_array(weight_init)
            
            logger.info(f"   Original weight shape: {weight_array.shape}")
            
            # Reshape weight to 2D if needed
            if len(weight_array.shape) > 2:
                # Flatten all dimensions except last for Gemm
                # E.g., [16, 4, 4, 10] -> [256, 10]
                new_shape = (-1, weight_array.shape[-1])
                weight_array_2d = weight_array.reshape(new_shape)
                
                # For transB=1, we need [out_features, in_features] = [10, 256]
                # So transpose the reshaped weight
                weight_array_2d = weight_array_2d.T  # [256, 10] -> [10, 256]
                logger.info(f"   Reshaping weight to: {weight_array_2d.shape} (transposed for transB=1)")
                
                # Create new 2D weight initializer
                new_weight_init = numpy_helper.from_array(weight_array_2d, name=weight_init_name)
                
                # Replace in model
                for idx, init in enumerate(model.graph.initializer):
                    if init.name == weight_init_name:
                        model.graph.initializer[idx].CopyFrom(new_weight_init)
                        logger.info(f"   ✅ Weight reshaped to 2D for Gemm (transB=1)")
                        break
            
            # Also reshape bias to 1D if needed
            bias_init = initializers[bias_init_name]
            if len(bias_init.dims) > 1:
                bias_array = numpy_helper.to_array(bias_init)
                bias_flat = bias_array.reshape(-1)
                new_bias_init = numpy_helper.from_array(bias_flat, name=bias_init_name)
                
                for idx, init in enumerate(model.graph.initializer):
                    if init.name == bias_init_name:
                        model.graph.initializer[idx].CopyFrom(new_bias_init)
                        logger.info(f"   ✅ Bias reshaped to 1D")
                        break
            
            # Create Gemm node
            # Gemm: Y = alpha * A * B + beta * C
            # We want: Y = input * weight + bias
            # EZKL examples use transB=1, so weight should be transposed shape
            # For input [batch, in_features] * weight^T, weight should be [out_features, in_features]
            
            gemm_node = helper.make_node(
                'Gemm',
                inputs=[matmul_input_a, weight_init_name, bias_init_name],
                outputs=add_node.output,  # Use Add's output
                name=f"{node.name}_gemm",
                alpha=1.0,
                beta=1.0,
                transA=0,  # Don't transpose input
                transB=1   # Transpose weight (like EZKL examples)
            )
            
            # Replace MatMul with Gemm
            model.graph.node[i].CopyFrom(gemm_node)
            
            # Mark Reshape and Add for removal
            nodes_to_remove.append(reshape_node)
            nodes_to_remove.append(add_node)
            
            changes_made = True
            logger.info(f"✅ Converted to Gemm: '{gemm_node.name}'")
        
        else:
            # Just MatMul + Reshape, no bias
            logger.info(f"   No Add node found, converting MatMul only")
            
            # Get weight and reshape to 2D
            weight_init = initializers[weight_init_name]
            weight_array = numpy_helper.to_array(weight_init)
            
            if len(weight_array.shape) > 2:
                new_shape = (-1, weight_array.shape[-1])
                weight_array_2d = weight_array.reshape(new_shape)
                
                # For transB=1, transpose the weight
                weight_array_2d = weight_array_2d.T
                logger.info(f"   Reshaping weight to: {weight_array_2d.shape} (transposed for transB=1)")
                
                new_weight_init = numpy_helper.from_array(weight_array_2d, name=weight_init_name)
                
                for idx, init in enumerate(model.graph.initializer):
                    if init.name == weight_init_name:
                        model.graph.initializer[idx].CopyFrom(new_weight_init)
                        break
            
            gemm_node = helper.make_node(
                'Gemm',
                inputs=[matmul_input_a, weight_init_name],
                outputs=node.output,
                name=f"{node.name}_gemm",
                alpha=1.0,
                beta=0.0,  # No bias
                transA=0,
                transB=1   # Transpose weight (like EZKL examples)
            )
            
            model.graph.node[i].CopyFrom(gemm_node)
            nodes_to_remove.append(reshape_node)
            
            changes_made = True
            logger.info(f"✅ Converted to Gemm (no bias): '{gemm_node.name}'")
    
    # Remove the Reshape and Add nodes
    for node in nodes_to_remove:
        if node in model.graph.node:
            logger.info(f"Removing node: '{node.name}'")
            model.graph.node.remove(node)
    
    if changes_made:
        logger.info(f"✅ Converted {len([n for n in model.graph.node if n.op_type == 'Gemm'])} MatMul patterns to Gemm")
    else:
        logger.info("No MatMul patterns to convert")
    
    return changes_made


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

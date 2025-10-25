#!/usr/bin/env python3
"""
Script to fix existing ONNX models in the data directory.
"""

import sys
from pathlib import Path
sys.path.insert(0, '/app')

from app.utils.onnx_fixer import fix_onnx_model, validate_onnx_for_ezkl, get_model_info

def find_and_fix_models():
    """Find all ONNX models and fix them if needed."""
    models_dir = Path("/app/data/models")
    
    print("="*60)
    print("ONNX MODEL FIXER")
    print("="*60 + "\n")
    
    # Find all ONNX files
    onnx_files = list(models_dir.rglob("*.onnx"))
    
    if not onnx_files:
        print("❌ No ONNX models found in /app/data/models/")
        return
    
    print(f"Found {len(onnx_files)} ONNX model(s)\n")
    
    for model_path in onnx_files:
        print("-"*60)
        print(f"Model: {model_path.relative_to(models_dir)}")
        print("-"*60)
        
        # Get model info
        try:
            info = get_model_info(model_path)
            print(f"  Opset version: {info.get('opset_version', 'unknown')}")
            print(f"  Total nodes: {info.get('total_nodes', 0)}")
            print(f"  Inputs: {len(info.get('inputs', []))}")
            print(f"  Outputs: {len(info.get('outputs', []))}")
            
            # Show node types
            node_types = info.get('node_types', {})
            if node_types:
                print(f"  Node types:")
                for op_type, count in sorted(node_types.items()):
                    print(f"    - {op_type}: {count}")
        except Exception as e:
            print(f"  ⚠️  Could not get model info: {e}")
        
        # Validate model
        is_valid, issues = validate_onnx_for_ezkl(model_path)
        
        if is_valid:
            print(f"\n  ✅ Model is EZKL-compatible!")
        else:
            print(f"\n  ⚠️  Compatibility issues found:")
            for issue in issues:
                print(f"    - {issue}")
            
            # Try to fix
            print(f"\n  🔧 Attempting to fix model...")
            try:
                fixed_path = model_path.parent / f"{model_path.stem}_fixed{model_path.suffix}"
                result_path = fix_onnx_model(model_path, fixed_path)
                
                # Validate fixed model
                is_fixed, remaining_issues = validate_onnx_for_ezkl(result_path)
                
                if is_fixed:
                    print(f"  ✅ Model fixed successfully!")
                    print(f"  📁 Fixed model: {result_path.relative_to(models_dir)}")
                    print(f"\n  💡 Use the fixed model for proof generation")
                else:
                    print(f"  ⚠️  Some issues remain:")
                    for issue in remaining_issues:
                        print(f"    - {issue}")
            except Exception as e:
                print(f"  ❌ Failed to fix model: {e}")
        
        print()
    
    print("="*60)
    print("DONE")
    print("="*60)

if __name__ == "__main__":
    find_and_fix_models()

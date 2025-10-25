#!/usr/bin/env python3
"""
Test script to verify EZKL setup and proof generation pipeline.
This creates a simple test model and generates a proof.
"""

import sys
import json
import torch
import torch.nn as nn
from pathlib import Path
import tempfile

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

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

class SimpleModel(nn.Module):
    """Simple neural network for testing."""
    def __init__(self):
        super(SimpleModel, self).__init__()
        self.fc1 = nn.Linear(3, 4)
        self.fc2 = nn.Linear(4, 2)
    
    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x

def create_test_model(output_dir: Path):
    """Create and export a simple ONNX model."""
    print("Creating test model...")
    model = SimpleModel()
    model.eval()
    
    # Create dummy input
    dummy_input = torch.randn(1, 3)
    
    # Export to ONNX
    model_path = output_dir / "test_model.onnx"
    torch.onnx.export(
        model,
        dummy_input,
        str(model_path),
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        }
    )
    
    print(f"✅ Model exported to {model_path}")
    return model_path

def create_test_input(output_dir: Path):
    """Create test input data in EZKL format."""
    print("Creating test input data...")
    
    # Create input data
    input_data = {
        "input_data": [[1.0, 2.0, 3.0]]
    }
    
    input_path = output_dir / "input.json"
    with open(input_path, 'w') as f:
        json.dump(input_data, f)
    
    print(f"✅ Input data created at {input_path}")
    return input_path

def test_ezkl_pipeline():
    """Test the complete EZKL proof generation pipeline."""
    print("\n" + "="*60)
    print("EZKL SETUP VERIFICATION TEST")
    print("="*60 + "\n")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        work_dir = Path(temp_dir)
        print(f"Working directory: {work_dir}\n")
        
        try:
            # Step 1: Create test model
            print("Step 1: Creating test model...")
            model_path = create_test_model(work_dir)
            
            # Step 2: Create test input
            print("\nStep 2: Creating test input...")
            input_path = create_test_input(work_dir)
            
            # Step 3: Generate settings
            print("\nStep 3: Generating EZKL settings...")
            settings_path = work_dir / "settings.json"
            sync_gen_settings(str(model_path), str(settings_path))
            print("✅ Settings generated")
            
            # Step 4: Calibrate settings
            print("\nStep 4: Calibrating settings...")
            sync_calibrate_settings(
                str(input_path),
                str(model_path),
                str(settings_path),
                "resources"
            )
            print("✅ Settings calibrated")
            
            # Step 5: Compile circuit
            print("\nStep 5: Compiling circuit...")
            compiled_path = work_dir / "network.ezkl"
            sync_compile_circuit(
                str(model_path),
                str(compiled_path),
                str(settings_path)
            )
            print("✅ Circuit compiled")
            
            # Step 6: Get SRS
            print("\nStep 6: Getting SRS (Structured Reference String)...")
            srs_path = work_dir / "kzg.srs"
            sync_get_srs(str(srs_path), str(settings_path))
            print("✅ SRS obtained")
            
            # Step 7: Setup (generate keys)
            print("\nStep 7: Generating proving and verification keys...")
            pk_path = work_dir / "pk.key"
            vk_path = work_dir / "vk.key"
            sync_setup(
                str(compiled_path),
                str(vk_path),
                str(pk_path),
                str(srs_path)
            )
            print("✅ Keys generated")
            
            # Step 8: Generate witness
            print("\nStep 8: Generating witness...")
            witness_path = work_dir / "witness.json"
            sync_gen_witness(
                str(input_path),
                str(compiled_path),
                str(witness_path)
            )
            print("✅ Witness generated")
            
            # Step 9: Generate proof
            print("\nStep 9: Generating proof...")
            proof_path = work_dir / "proof.json"
            sync_prove(
                str(witness_path),
                str(compiled_path),
                str(pk_path),
                str(proof_path),
                str(srs_path),
                "single"
            )
            print("✅ Proof generated")
            
            # Step 10: Verify proof
            print("\nStep 10: Verifying proof...")
            result = sync_verify(
                str(proof_path),
                str(settings_path),
                str(vk_path),
                str(srs_path)
            )
            
            if result:
                print("✅ Proof verified successfully!")
            else:
                print("❌ Proof verification failed!")
                return False
            
            # Check file sizes
            print("\n" + "-"*60)
            print("Generated Files:")
            print("-"*60)
            for file_path in [model_path, settings_path, compiled_path, 
                             srs_path, pk_path, vk_path, witness_path, proof_path]:
                if file_path.exists():
                    size_kb = file_path.stat().st_size / 1024
                    print(f"  {file_path.name}: {size_kb:.2f} KB")
            
            print("\n" + "="*60)
            print("✅ EZKL SETUP VERIFICATION PASSED!")
            print("="*60 + "\n")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error during EZKL test: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = test_ezkl_pipeline()
    sys.exit(0 if success else 1)

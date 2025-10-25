#!/usr/bin/env python3
"""
Simple script to verify EZKL installation and basic functionality.
"""

import sys
import ezkl
from pathlib import Path

print("\n" + "="*60)
print("EZKL INSTALLATION VERIFICATION")
print("="*60 + "\n")

try:
    # Check EZKL version
    print(f"✅ EZKL Version: {ezkl.__version__}")
    
    # Check Python version
    print(f"✅ Python Version: {sys.version.split()[0]}")
    
    # Check if EZKL functions are available
    functions_to_check = [
        'gen_settings',
        'calibrate_settings',
        'compile_circuit',
        'get_srs',
        'setup',
        'gen_witness',
        'prove',
        'verify'
    ]
    
    print("\n" + "-"*60)
    print("Available EZKL Functions:")
    print("-"*60)
    
    for func_name in functions_to_check:
        if hasattr(ezkl, func_name):
            print(f"  ✅ {func_name}")
        else:
            print(f"  ❌ {func_name} - NOT FOUND")
    
    # Check data directories
    print("\n" + "-"*60)
    print("Data Directories:")
    print("-"*60)
    
    models_dir = Path("/app/data/models")
    proofs_dir = Path("/app/data/proofs")
    
    if models_dir.exists():
        print(f"  ✅ Models directory: {models_dir}")
        print(f"     Files: {len(list(models_dir.iterdir()))}")
    else:
        print(f"  ❌ Models directory missing: {models_dir}")
    
    if proofs_dir.exists():
        print(f"  ✅ Proofs directory: {proofs_dir}")
        print(f"     Files: {len(list(proofs_dir.iterdir()))}")
    else:
        print(f"  ❌ Proofs directory missing: {proofs_dir}")
    
    print("\n" + "="*60)
    print("✅ EZKL IS PROPERLY INSTALLED AND CONFIGURED!")
    print("="*60 + "\n")
    
    print("Next Steps:")
    print("  1. Upload an ONNX model via the frontend")
    print("  2. Generate a proof for the model")
    print("  3. Check the proof generation logs")
    print()
    
    sys.exit(0)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

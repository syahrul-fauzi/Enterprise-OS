#!/usr/bin/env python3
import os
import sys
import subprocess
from datetime import datetime


def run_command(command):
    try:
        result = subprocess.run(
            command,
            cwd="/root/Enterprise OS",
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)


def main():
    print("🚀 Starting EOS Full Workflow...")
    print(f"⏰ Started at", datetime.now().isoformat())

    # Step 1: Run Observer
    print("\n" + "="*50)
    print("1. Running Observer Engine...")
    run_command([sys.executable, "implementation/eos/engines/observer/engine.py"])

    # Step 2: Run Validator
    print("\n" + "="*50)
    print("2. Running Validator Engine...")
    run_command([sys.executable, "implementation/eos/engines/validator/engine.py"])

    # Step 3: Run Pattern Detection
    print("\n" + "="*50)
    print("3. Running Pattern Engine...")
    run_command([sys.executable, "implementation/eos/engines/pattern/engine.py"])

    # Step 4: Run Doctor
    print("\n" + "="*50)
    print("4. Running Doctor Engine...")
    run_command([sys.executable, "implementation/eos/engines/doctor/engine.py", "lawyershub"])

    print("\n✅ EOS Full Workflow Completed!")
    print("⏰ Completed at", datetime.now().isoformat())


if __name__ == "__main__":
    main()

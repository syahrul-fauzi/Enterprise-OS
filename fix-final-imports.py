import os

# Path to search
base_path = "/home/ios-id/eos/workspace/packages/core/runtime/src"

# Find all runtime files with wrong import path
runtime_files = []
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
                if 'import { getNow } from' in content:
                    runtime_files.append(file_path)

print(f"Found {len(runtime_files)} runtime files with import statement")

# Fix each file
for file_path in runtime_files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace wrong path with correct relative path
    fixed_content = content.replace(
        'import { getNow } from "../../kernel/timing/time-provider.js";',
        'import { getNow } from "../kernel/time/time.provider.js";'
    )
    
    with open(file_path, 'w') as f:
        f.write(fixed_content)
    
    print(f"Fixed import path in {file_path}")
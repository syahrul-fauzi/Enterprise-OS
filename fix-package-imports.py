import os

# Path to search
base_path = "/home/ios-id/eos/workspace/packages/core/runtime/src"

# Find all files with wrong import path
files_to_fix = []
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
                if 'from "../kernel/dist/src/time/time.provider.js"' in content:
                    files_to_fix.append(file_path)

print(f"Found {len(files_to_fix)} files with wrong path")

# Fix each file
for file_path in files_to_fix:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace wrong path with correct package import
    content = content.replace('../kernel/dist/src/time/time.provider.js', '@repo/core-kernel/time/time.provider.js')
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed {file_path}")
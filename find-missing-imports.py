import os

# Path to search
base_path = "/home/ios-id/eos/workspace/packages/core/runtime/src"

# Find all files that use getNow() but don't import it
files_to_fix = []
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
                if 'getNow()' in content and '@repo/core-kernel/time/time.provider.js' not in content:
                    files_to_fix.append(file_path)

print(f"Found {len(files_to_fix)} files missing import")

# Add import to each file
for file_path in files_to_fix:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Add import at the beginning of the file
    import_line = 'import { getNow } from "@repo/core-kernel/time/time.provider.js";\n'
    new_content = import_line + content
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    print(f"Fixed {file_path}")
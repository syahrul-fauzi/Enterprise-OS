import os

# Path to search
base_path = "/home/ios-id/eos/workspace/capabilities"

# Find all files with broken imports
broken_files = []
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
                # Check if import { getNow } is inside an import type block
                if "import type {" in content and "import { getNow }" in content:
                    # Find the line where import { getNow } is inserted
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if "import { getNow }" in line:
                            # Check if previous line is part of an import type statement
                            if i > 0 and lines[i-1].strip().startswith("import type {"):
                                broken_files.append(file_path)
                                break

print(f"Found {len(broken_files)} files with broken imports")

# Fix each file
for file_path in broken_files:
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # Find and remove the misplaced import
    get_now_line = -1
    for i, line in enumerate(lines):
        if "import { getNow }" in line:
            get_now_line = i
            break
    
    if get_now_line != -1:
        # Remove the misplaced line
        get_now_import = lines.pop(get_now_line)
        
        # Find the end of the import block
        import_end = -1
        for i, line in enumerate(lines):
            if line.strip().startswith("} from"):
                import_end = i
                break
        
        # Insert the getNow import after the import block
        if import_end != -1:
            lines.insert(import_end + 1, get_now_import)
            
            with open(file_path, 'w') as f:
                f.writelines(lines)
            
            print(f"Fixed import in {file_path}")
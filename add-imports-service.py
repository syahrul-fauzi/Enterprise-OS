import os

# Path to search
base_path = "/home/ios-id/eos/workspace/capabilities"

# Find all service files that use getNow()
service_files = []
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith(".ts") and "services" in root:
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
                if "getNow()" in content and "import.*getNow" not in content:
                    service_files.append(file_path)

print(f"Found {len(service_files)} service files that need import")

# Add import to each file
for file_path in service_files:
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # Find the first import line
    import_index = -1
    for i, line in enumerate(lines):
        if line.strip().startswith("import"):
            import_index = i
            break
    
    # Add import after the first import line
    if import_index != -1:
        import_line = 'import { getNow } from "#core/kernel/timing/time-provider.js";\n'
        lines.insert(import_index + 1, import_line)
        
        with open(file_path, 'w') as f:
            f.writelines(lines)
        
        print(f"Added import to {file_path}")
    else:
        print(f"No import found in {file_path}")
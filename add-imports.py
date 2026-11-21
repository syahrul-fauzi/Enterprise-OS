import os
import re

# Get all files that use getNow but don't have the import
result = os.popen("grep -r 'getNow' /home/ios-id/eos/workspace/capabilities/**/implementation/commands/*.ts | grep -v 'import' | awk -F: '{print $1}' | sort | uniq").read()
files = result.strip().split('\n')

for file_path in files:
    if not file_path:
        continue
    
    # Check if file already has the import
    with open(file_path, 'r') as f:
        content = f.read()
    
    if 'time-provider' in content:
        continue
    
    # Find the first import line and add our import after it
    import_lines = []
    lines = content.split('\n')
    insert_pos = 0
    
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            insert_pos = i + 1
            break
    
    # Insert the import
    import_line = 'import { getNow } from "../../../../packages/core/kernel/src/utils/time-provider.js";'
    lines.insert(insert_pos, import_line)
    
    # Write back
    with open(file_path, 'w') as f:
        f.write('\n'.join(lines))
    
    print(f"Added import to: {file_path}")

print("Done!")
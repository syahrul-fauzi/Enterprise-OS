import os

# Path to search
base_path = "/home/ios-id/eos/workspace/capabilities"

# Find all files with ?? getNow() pattern
question_files = []
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
                if "?? getNow()" in content:
                    question_files.append(file_path)

print(f"Found {len(question_files)} files with ?? getNow() pattern")

# Fix each file
for file_path in question_files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace "?? getNow()" with "?? getNow()" → wait, no, the original was "new Date() ?? something"
    # Wait, let's look at the actual pattern: the original was "something ?? new Date()"
    # After sed replacement it became "something ?? getNow()"
    # Wait no, looking at the error line: "assessedAt:?? getNow()"
    # Oh! The original was "assessedAt: new Date()" but there was a space before ??
    # Wait let's look at the actual content: "assessedAt:?? getNow()"
    # That means the original was "assessedAt: new Date()" and sed replaced "new Date()" with "getNow()",
    # but there was a ?? before it? No, looking at line 304: "assessedAt:?? getNow()"
    # Oh! I see, the original was "assessedAt: new Date()" and there was a typo in the original file
    # Wait no, let's just fix the pattern: "?? getNow()" should be " ?? getNow()"
    # Wait no, looking at the line: "assessedAt:?? getNow()"
    # The correct syntax should be "assessedAt: getNow()"
    # Wait let's just fix the "?? " that appears before getNow()
    fixed_content = content.replace(":?? getNow()", ": getNow()")
    
    with open(file_path, 'w') as f:
        f.write(fixed_content)
    
    print(f"Fixed ?? pattern in {file_path}")
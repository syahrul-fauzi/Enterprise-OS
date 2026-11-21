import os

# Path to search
base_path = "/home/ios-id/eos/workspace/capabilities"

# Find all files with ???? getNow() pattern
question_files = []
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith(".ts"):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
                if "???? getNow()" in content:
                    question_files.append(file_path)

print(f"Found {len(question_files)} files with ???? getNow() pattern")

# Fix each file
for file_path in question_files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace "???? getNow()" with " ? getNow()" → wait no, original was "current.archivedAt ? new Date()"
    # After sed replacement it became "current.archivedAt ? getNow()"
    # But in the file we see "current.archivedAt ???? getNow()"
    # That means the original was "current.archivedAt ?? new Date()" (nullish coalescing)
    # And sed replaced "new Date()" with "getNow()", but there was a typo with extra ?
    # Wait let's just replace "???? getNow()" with " ?? getNow()"
    fixed_content = content.replace("???? getNow()", " ?? getNow()")
    
    with open(file_path, 'w') as f:
        f.write(fixed_content)
    
    print(f"Fixed ???? pattern in {file_path}")
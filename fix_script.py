import os

file_path = r'c:\Users\AI\Documents\GitHub\DailyOrganiser\src\hooks\useAccomplishmentLogs.ts'

# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File size: {len(content)} bytes")

# Check if getDocs is already imported
if 'getDocs' in content:
    print("getDocs already imported - no fix needed")
else:
    # Add getDocs to the firebase/firestore import
    old_import = 'from "firebase/firestore"'
    new_import = ', getDocs from "firebase/firestore"'
    
    if old_import in content:
        content = content.replace(old_import, new_import, 1)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed: Added getDocs import")
    else:
        print("Could not find firebase/firestore import pattern")

print("Done!")

#!/usr/bin/env python3
"""Fix the missing getDocs import in useAccomplishmentLogs.ts"""

import re

file_path = r'c:\Users\AI\Documents\GitHub\DailyOrganiser\src\hooks\useAccomplishmentLogs.ts'

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Current imports in file:")
import_section = content[:content.find('//') if '//' in content else 500]
print(import_section)

# Check if getDocs is already imported
if 'getDocs' in content:
    print("\ngetDocs is already imported!")
else:
    print("\ngetDocs is NOT imported - need to add it")
    
    # Find the firebase/firestore import line
    pattern = r"(import\s+\{[^}]*\}\s+from\s+['"]firebase/firestore['"])"
    match = re.search(pattern, content)
    
    if match:
        import_line = match.group(1)
        print(f"\nFound import line: {import_line}")
        
        # Add getDocs to the imports
        if '}' in import_line:
            new_import = import_line.replace('}', ', getDocs}')
            print(f"\nNew import line: {new_import}")
            content = content.replace(import_line, new_import)
            
            # Write the fixed content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("\n✅ File updated successfully!")
        else:
            print("Could not parse import line format")
    else:
        print("\nNo firebase/firestore import found - checking for other patterns")
        # Look for any import from firebase/firestore
        if 'firebase/firestore' in content:
            print("Found firebase/firestore reference but couldn't parse import")
        else:
            print("No firebase/firestore import found at all!")

import os

filepath = r"c:\Users\AI\Documents\GitHub\DailyOrganiser\src\hooks\useAccomplishmentLogs.ts"

if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    print(content)
else:
    print(f"File not found: {filepath}")

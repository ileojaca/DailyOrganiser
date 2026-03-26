import os

base_path = r"c:\Users\AI\Documents\GitHub\DailyOrganiser"

# List directory structure
print("=== DIRECTORY STRUCTURE ===")
for root, dirs, files in os.walk(base_path):
    level = root.replace(base_path, '').count(os.sep)
    indent = ' ' * 2 * level
    print(f'{indent}{os.path.basename(root)}/')
    subindent = ' ' * 2 * (level + 1)
    for file in files[:20]:  # Limit files shown
        print(f'{subindent}{file}')

# Read the specific files
print("\n\n=== useAccomplishmentLogs.ts ===")
try:
    with open(os.path.join(base_path, 'src', 'hooks', 'useAccomplishmentLogs.ts'), 'r') as f:
        print(f.read())
except Exception as e:
    print(f"Error: {e}")

print("\n\n=== firebase.ts ===")
try:
    with open(os.path.join(base_path, 'src', 'lib', 'firebase.ts'), 'r') as f:
        print(f.read())
except Exception as e:
    print(f"Error: {e}")

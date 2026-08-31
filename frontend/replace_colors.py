import os
import re

# Mapping of hardcoded classes to semantic classes
REPLACEMENTS = {
    # Backgrounds
    r'\bbg-slate-950(?:/\d+)?\b': 'bg-background',
    r'\bbg-slate-900(?:/\d+)?\b': 'bg-surface',
    r'\bbg-slate-850(?:/\d+)?\b': 'bg-surface-elevated',
    r'\bbg-slate-800(?:/\d+)?\b': 'bg-surface-elevated',

    # Text
    r'\btext-white\b': 'text-text-main',
    r'\btext-slate-100\b': 'text-text-main',
    r'\btext-slate-200\b': 'text-text-main',
    r'\btext-slate-300\b': 'text-text-sub',
    r'\btext-slate-350\b': 'text-text-sub',
    r'\btext-slate-400\b': 'text-text-sub',
    r'\btext-slate-500\b': 'text-text-muted',
    r'\btext-slate-600\b': 'text-text-muted',
    r'\btext-slate-650\b': 'text-text-muted',
    r'\btext-slate-700\b': 'text-text-muted',
    
    # Borders
    r'\bborder-slate-850(?:/\d+)?\b': 'border-border-custom',
    r'\bborder-slate-800(?:/\d+)?\b': 'border-border-custom',
    r'\bborder-slate-900(?:/\d+)?\b': 'border-border-custom',
    r'\bborder-slate-700(?:/\d+)?\b': 'border-border-custom',
    r'\bborder-white/5\b': 'border-border-custom',

    # Accents - Indigo -> Primary
    r'\bbg-indigo-600(?:/\d+)?\b': 'bg-primary',
    r'\bbg-indigo-500(?:/\d+)?\b': 'bg-primary-hover',
    r'\bhover:bg-indigo-500\b': 'hover:bg-primary-hover',
    r'\bhover:bg-indigo-600\b': 'hover:bg-primary',
    r'\btext-indigo-400\b': 'text-primary',
    r'\btext-indigo-500\b': 'text-primary',
    r'\btext-indigo-600\b': 'text-primary',
    r'\bborder-indigo-500\b': 'border-primary',
    r'\bborder-indigo-600\b': 'border-primary',
    r'\bborder-t-indigo-500\b': 'border-t-primary',
    r'\bborder-l-indigo-500\b': 'border-l-primary',
    r'\bring-indigo-500\b': 'ring-primary',
    r'\bring-indigo-600\b': 'ring-primary',
    r'\bshadow-indigo-600(?:/\d+)?\b': 'shadow-primary',
    r'\bshadow-indigo-500(?:/\d+)?\b': 'shadow-primary',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # Apply regex replacements
    for pattern, replacement in REPLACEMENTS.items():
        content = re.sub(pattern, replacement, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    root_dir = os.path.join(os.path.dirname(__file__), 'src')
    modified_count = 0
    file_count = 0

    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(('.tsx', '.ts')):
                filepath = os.path.join(dirpath, filename)
                if process_file(filepath):
                    modified_count += 1
                file_count += 1

    print(f"Scanned {file_count} files.")
    print(f"Modified {modified_count} files with color replacements.")

if __name__ == "__main__":
    main()

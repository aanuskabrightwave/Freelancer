const fs = require('fs');
const path = require('path');

const REPLACEMENTS = {
    '\\bplaceholder-slate-[4|5|6|7]\\d\\d(?:/\\d+)?\\b': 'placeholder-text-muted',
    '\\bplaceholder-slate-650\\b': 'placeholder-text-muted',
    '\\bbg-slate-950/40\\b': 'bg-background',
    '\\btext-slate-550\\b': 'text-text-muted',
    '\\btext-slate-555\\b': 'text-text-muted',
    '\\btext-slate-450\\b': 'text-text-sub',
    '\\bborder-slate-855\\b': 'border-border-custom',
};

function processFile(filepath) {
    const originalContent = fs.readFileSync(filepath, 'utf-8');
    let content = originalContent;

    for (const [pattern, replacement] of Object.entries(REPLACEMENTS)) {
        const regex = new RegExp(pattern, 'g');
        content = content.replace(regex, replacement);
    }

    if (content !== originalContent) {
        fs.writeFileSync(filepath, content, 'utf-8');
        return true;
    }
    return false;
}

function walkDir(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            walkDir(filepath, callback);
        } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
            callback(filepath);
        }
    }
}

function main() {
    const rootDir = path.join(__dirname, 'src');
    let modifiedCount = 0;
    let fileCount = 0;

    walkDir(rootDir, (filepath) => {
        if (processFile(filepath)) {
            modifiedCount++;
        }
        fileCount++;
    });

    console.log(`Scanned ${fileCount} files.`);
    console.log(`Modified ${modifiedCount} files with color replacements.`);
}

main();

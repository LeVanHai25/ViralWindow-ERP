const fs = require('fs');
const path = require('path');

const directory = __dirname;
const extns = ['.html', '.js'];
const IGNORE_DIRS = ['node_modules', '.git', 'css'];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2B06}\u{2B07}\u{2B05}\u{27A1}\u{2194}\u{2195}\u{2B1B}\u{2B1C}\u{25AA}\u{25AB}\u{25FB}\u{25FC}\u{25FD}\u{25FE}]/gu;

function scanDir(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                results = results.concat(scanDir(fullPath));
            }
        } else if (extns.includes(path.extname(fullPath))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                const matches = line.match(emojiRegex);
                if (matches) {
                    results.push({
                        file: fullPath.replace(directory, ''),
                        line: index + 1,
                        emojis: [...new Set(matches)],
                        content: line.trim().substring(0, 100)
                    });
                }
            });
        }
    }
    return results;
}

const found = scanDir(directory);
const emojiMap = {};

found.forEach(f => {
    f.emojis.forEach(e => {
        if (!emojiMap[e]) emojiMap[e] = [];
        emojiMap[e].push(f);
    });
});

console.log(`Found emojis: ${Object.keys(emojiMap).join(', ')}`);
Object.keys(emojiMap).forEach(e => {
    console.log(`\nEmoji ${e} found in ${emojiMap[e].length} places.`);
    emojiMap[e].slice(0, 5).forEach(f => {
        console.log(`  ${f.file}:${f.line} -> ${f.content}`);
    });
    if (emojiMap[e].length > 5) {
        console.log(`  ... and ${emojiMap[e].length - 5} more.`);
    }
});

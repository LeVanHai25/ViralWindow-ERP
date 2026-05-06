
const fs = require('fs');
const content = fs.readFileSync('inventory.html', 'utf8');
const pos = 594978;
const line = content.substring(0, pos).split('\n').length;
console.log('Line number:', line);
console.log('Context:', content.substring(pos - 50, pos + 200));

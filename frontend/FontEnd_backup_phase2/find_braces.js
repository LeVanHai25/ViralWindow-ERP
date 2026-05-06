
const fs = require('fs');
const content = fs.readFileSync('inventory.html', 'utf8');

let count = 0;
let stack = [];
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
        count++;
        stack.push(i);
    } else if (content[i] === '}') {
        count--;
        stack.pop();
    }
}

console.log('Final count:', count);
if (count > 0) {
    console.log('Unclosed braces at positions:', stack.slice(-5));
    stack.slice(-5).forEach(pos => {
        console.log('--- Unclosed brace at position ' + pos + ' ---');
        console.log(content.substring(Math.max(0, pos - 100), pos + 100));
    });
} else if (count < 0) {
    console.log('Too many closing braces');
}

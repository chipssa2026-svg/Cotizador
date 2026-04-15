const fs = require('fs');
const content = fs.readFileSync('logo_b64.txt', 'utf8');
const chunks = content.match(/.{1,500}/g);
fs.writeFileSync('logo_split.txt', chunks.join('\n'), 'utf8');
console.log('Split into', chunks.length, 'lines');

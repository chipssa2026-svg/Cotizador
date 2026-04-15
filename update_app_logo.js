const fs = require('fs');
const b64 = fs.readFileSync('logo_b64.txt', 'utf8').trim();
let appJs = fs.readFileSync('app.js', 'utf8');

// Buscamos el lugar donde está la constante y la actualizamos con la cadena real
const regex = /const LOGO_CHIPS_B64 = '[^']*'/;
appJs = appJs.replace(regex, `const LOGO_CHIPS_B64 = '${b64}'`);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('app.js actualizado con éxito');

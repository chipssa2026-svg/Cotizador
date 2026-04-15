// Script para convertir Logo.png a base64 y guardarlo en logo_b64.txt
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'Logo.png');
const outputPath = path.join(__dirname, 'logo_b64.txt');

if (!fs.existsSync(logoPath)) {
    console.error('ERROR: No se encontro Logo.png en este directorio');
    process.exit(1);
}

const bytes = fs.readFileSync(logoPath);
const b64 = 'data:image/png;base64,' + bytes.toString('base64');

fs.writeFileSync(outputPath, b64, 'utf8');
console.log('OK! logo_b64.txt creado. Longitud:', b64.length, 'chars');

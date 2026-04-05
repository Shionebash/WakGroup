const fs = require('fs');

console.log('=== Verificación de texto original ===\n');

const equipmentTypes = JSON.parse(fs.readFileSync('./data/wakfu-gamedata/equipmentItemTypes.json', 'utf8'));

// Buscar el tipo 113 (Bastón)
const bastonType = equipmentTypes.find(entry => entry.definition?.id === 113);

if (bastonType) {
    console.log('Tipo 113 (Bastón):');
    console.log('ES:', JSON.stringify(bastonType.title?.es));
    console.log('EN:', JSON.stringify(bastonType.title?.en));
    console.log('FR:', JSON.stringify(bastonType.title?.fr));
    console.log('PT:', JSON.stringify(bastonType.title?.pt));
} else {
    console.log('No se encontró el tipo 113');
}

// Mostrar algunos ejemplos más
console.log('\n=== Otros ejemplos ===');
equipmentTypes.slice(0, 5).forEach((entry, index) => {
    const id = entry.definition?.id;
    const title = entry.title?.es || entry.title?.en || '';
    console.log(`${index + 1}. ID: ${id} - "${title}"`);
});

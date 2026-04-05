const fs = require('fs');

console.log('=== Análisis de Equipment Types ===\n');

const equipmentTypes = JSON.parse(fs.readFileSync('./data/wakfu-gamedata/equipmentItemTypes.json', 'utf8'));

console.log(`Total equipment types: ${equipmentTypes.length}\n`);

// Analizar tipos con y sin títulos
const withTitles = equipmentTypes.filter(entry => entry.title && Object.keys(entry.title).length > 0);
const withoutTitles = equipmentTypes.filter(entry => !entry.title || Object.keys(entry.title).length === 0);
const withPositions = equipmentTypes.filter(entry => entry.definition?.equipmentPositions?.length > 0);
const withoutPositions = equipmentTypes.filter(entry => !entry.definition?.equipmentPositions || entry.definition.equipmentPositions.length === 0);

console.log(`Con títulos: ${withTitles.length}`);
console.log(`Sin títulos: ${withoutTitles.length}`);
console.log(`Con positions: ${withPositions.length}`);
console.log(`Sin positions: ${withoutPositions.length}\n`);

// Mostrar ejemplos de tipos sin títulos
if (withoutTitles.length > 0) {
    console.log('=== Ejemplos sin títulos ===');
    withoutTitles.slice(0, 5).forEach((entry, index) => {
        console.log(`${index + 1}. ID: ${entry.definition?.id}`);
        console.log(`   Positions: ${entry.definition?.equipmentPositions || []}`);
        console.log('');
    });
}

// Mostrar ejemplos de tipos sin positions
if (withoutPositions.length > 0) {
    console.log('=== Ejemplos sin positions ===');
    withoutPositions.slice(0, 5).forEach((entry, index) => {
        console.log(`${index + 1}. ID: ${entry.definition?.id}`);
        console.log(`   Título: ${JSON.stringify(entry.title)}`);
        console.log('');
    });
}

// Mostrar todos los tipos con sus IDs y títulos
console.log('=== Todos los Equipment Types ===');
equipmentTypes.forEach((entry, index) => {
    const id = entry.definition?.id;
    const title = entry.title?.es || entry.title?.en || entry.title?.fr || 'Sin título';
    const positions = entry.definition?.equipmentPositions || [];
    console.log(`${index + 1}. ID: ${id} - ${title} - Positions: [${positions.join(', ')}]`);
});

console.log('\n=== Resumen ===');
console.log(`✓ Total: ${equipmentTypes.length}`);
console.log(`✓ Con títulos válidos: ${withTitles.length}`);
console.log(`✓ Con positions: ${withPositions.length}`);
console.log(`✓ Sin títulos: ${withoutTitles.length}`);
console.log(`✓ Sin positions: ${withoutPositions.length}`);

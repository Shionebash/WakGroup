const http = require('http');

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/builder/metadata',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const metadata = JSON.parse(data);
            const equipmentTypes = metadata.equipmentTypes || [];
            
            console.log('=== Verificación de textos limpios ===\n');
            
            equipmentTypes.slice(0, 10).forEach((type, index) => {
                const title = type.label?.es || type.label?.en || 'Sin título';
                console.log(`${index + 1}. ID: ${type.id} - "${title}"`);
            });
            
            console.log('\n=== Buscando símbolos extraños ===');
            const strangeChars = /[{}[\]|~?]/;
            const withStrangeChars = equipmentTypes.filter(type => {
                const title = type.label?.es || type.label?.en || '';
                return strangeChars.test(title);
            });
            
            console.log(`Tipos con símbolos extraños: ${withStrangeChars.length}`);
            
            if (withStrangeChars.length > 0) {
                console.log('\nEjemplos con símbolos:');
                withStrangeChars.slice(0, 5).forEach((type, index) => {
                    const title = type.label?.es || type.label?.en || '';
                    console.log(`${index + 1}. "${title}"`);
                });
            }
            
            console.log('\n=== Verificación de items ===');
            console.log('Obteniendo algunos items...');
            
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }
    });
});

req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
});

req.end();

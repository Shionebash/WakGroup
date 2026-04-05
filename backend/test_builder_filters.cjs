const http = require('http');

console.log('=== Testing Builder Filters ===\n');

// Test 1: Sin filtro de nivel
console.log('1. Test sin filtro de nivel:');
makeRequest('/builder/items?limit=5', (data) => {
    console.log(`   Total items: ${data.total}`);
    console.log(`   Primer item nivel: ${data.items[0]?.level}`);
});

// Test 2: Con filtro de nivel 50
setTimeout(() => {
    console.log('\n2. Test con maxLevel=50:');
    makeRequest('/builder/items?maxLevel=50&limit=5', (data) => {
        console.log(`   Total items: ${data.total}`);
        console.log(`   Primer item nivel: ${data.items[0]?.level}`);
    });
}, 1000);

// Test 3: Con filtro de nivel 20
setTimeout(() => {
    console.log('\n3. Test con maxLevel=20:');
    makeRequest('/builder/items?maxLevel=20&limit=5', (data) => {
        console.log(`   Total items: ${data.total}`);
        console.log(`   Primer item nivel: ${data.items[0]?.level}`);
    });
}, 2000);

// Test 4: Con filtro de nivel 10
setTimeout(() => {
    console.log('\n4. Test con maxLevel=10:');
    makeRequest('/builder/items?maxLevel=10&limit=5', (data) => {
        console.log(`   Total items: ${data.total}`);
        console.log(`   Primer item nivel: ${data.items[0]?.level}`);
    });
}, 3000);

function makeRequest(path, callback) {
    const options = {
        hostname: 'localhost',
        port: 4000,
        path: path,
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                callback(parsed);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                console.log('Raw response:', data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Request error: ${e.message}`);
    });

    req.end();
}

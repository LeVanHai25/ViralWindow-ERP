/**
 * =====================================================
 * ACT STYLE V2 - INTEGRATION TEST
 * Test toàn bộ workflow của API v2
 * =====================================================
 */

const http = require('http');

const API_BASE = 'http://localhost:3001/api/v2';

function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Invalid JSON'));
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Starting ACT Style V2 Integration Tests...\n');

    let passCount = 0;
    let failCount = 0;

    // Test 1: GET /project-items
    try {
        const data = await httpRequest(`${API_BASE}/project-items?limit=5`);
        if (data.success && data.data && data.count > 0) {
            console.log('✅ Test 1: GET /project-items - PASS');
            console.log(`   Found ${data.count} items`);
            passCount++;
        } else {
            throw new Error('No data returned');
        }
    } catch (e) {
        console.log('❌ Test 1: GET /project-items - FAIL:', e.message);
        failCount++;
    }

    // Test 2: GET /project-items/:id
    try {
        const data = await httpRequest(`${API_BASE}/project-items/1`);
        if (data.success && data.data && data.data.item) {
            console.log('✅ Test 2: GET /project-items/1 - PASS');
            console.log(`   Item: ${data.data.item.item_code || data.data.item.id}`);
            passCount++;
        } else {
            throw new Error('No item data');
        }
    } catch (e) {
        console.log('❌ Test 2: GET /project-items/1 - FAIL:', e.message);
        failCount++;
    }

    // Test 3: GET /rules
    try {
        const data = await httpRequest(`${API_BASE}/rules?item_type=door&aluminum_system=XINGFA_55`);
        if (data.success && data.data) {
            const ruleCount = (data.data.structure?.length || 0) +
                (data.data.bom?.length || 0) +
                (data.data.pricing?.length || 0);
            console.log('✅ Test 3: GET /rules - PASS');
            console.log(`   Loaded ${ruleCount} rules for door+XINGFA_55`);
            passCount++;
        } else {
            throw new Error('No rules data');
        }
    } catch (e) {
        console.log('❌ Test 3: GET /rules - FAIL:', e.message);
        failCount++;
    }

    // Test 4: POST /project-items/:id/calculate-bom
    try {
        const data = await httpRequest(`${API_BASE}/project-items/13/calculate-bom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ save: false })
        });
        if (data.success && data.summary) {
            console.log('✅ Test 4: POST /calculate-bom - PASS');
            console.log(`   Total cost: ${data.summary.total_cost?.toLocaleString('vi-VN') || 0} ₫`);
            console.log(`   Aluminum: ${data.summary.aluminum_kg || 0} kg`);
            console.log(`   Glass: ${data.summary.glass_m2 || 0} m²`);
            console.log(`   Hardware: ${data.summary.hardware_count || 0} pcs`);
            passCount++;
        } else {
            throw new Error(data.error || 'No BOM data');
        }
    } catch (e) {
        console.log('❌ Test 4: POST /calculate-bom - FAIL:', e.message);
        failCount++;
    }

    // Test 5: GET /project-items/:id/bom (saved BOM)
    try {
        const data = await httpRequest(`${API_BASE}/project-items/13/bom`);
        if (data.success) {
            console.log('✅ Test 5: GET /bom - PASS');
            console.log(`   BOM versions: ${data.data?.length || 0}`);
            passCount++;
        } else {
            throw new Error('No BOM history');
        }
    } catch (e) {
        console.log('❌ Test 5: GET /bom - FAIL:', e.message);
        failCount++;
    }

    // Test 6: Item types distribution
    console.log('\n📊 Item Types Distribution:');
    const itemTypes = ['door', 'window', 'railing', 'glass_partition'];
    for (const type of itemTypes) {
        try {
            const data = await httpRequest(`${API_BASE}/project-items?item_type=${type}&limit=1`);
            console.log(`   ${type}: ${data.count || 0} items`);
        } catch (e) {
            console.log(`   ${type}: Error`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`📊 TEST SUMMARY: ${passCount} passed, ${failCount} failed`);
    console.log('='.repeat(50));

    if (failCount === 0) {
        console.log('🎉 All tests passed! ACT Style V2 is working correctly.\n');
    } else {
        console.log('⚠️ Some tests failed. Please check the errors above.\n');
    }

    process.exit(failCount > 0 ? 1 : 0);
}

runTests();

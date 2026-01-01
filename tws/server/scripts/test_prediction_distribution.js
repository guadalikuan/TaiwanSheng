
import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:3001/api/prediction';
const ADMIN_SECRET = 'tws-admin-secret-888';

const runTest = async () => {
    console.log('🧪 Starting Prediction Distribution Test...');

    // 1. Place a Bet
    const marketId = `test-market-${Date.now()}`;
    const wallet = `TestWallet${Date.now()}`;
    
    console.log(`\n1. Placing bet for Market: ${marketId}, Wallet: ${wallet}`);
    
    try {
        const betRes = await axios.post(`${BASE_URL}/bet`, {
            walletAddress: wallet,
            marketId: marketId,
            direction: 'YES',
            amount: 100,
            signature: 'mock-sig'
        });
        console.log('   Bet Result:', betRes.data);
    } catch (e) {
        console.error('❌ Bet placement error:', e.response ? e.response.data : e.message);
        return;
    }

    // 2. Attempt Distribution WITHOUT Secret
    console.log('\n2. Attempting Distribution WITHOUT Admin Secret...');
    try {
        await axios.post(`${BASE_URL}/distribute`, {
            marketId: marketId,
            winningOutcome: 'YES'
        });
        console.error('❌ Security check FAILED! (Should have returned 403)');
    } catch (e) {
        if (e.response && e.response.status === 403) {
            console.log('   ✅ Security check passed (Received 403 Forbidden)');
        } else {
            console.error('❌ Security check error (Unexpected):', e.message);
        }
    }

    // 3. Attempt Distribution WITH Secret
    console.log('\n3. Attempting Distribution WITH Admin Secret...');
    try {
        const distRes = await axios.post(`${BASE_URL}/distribute`, {
            marketId: marketId,
            winningOutcome: 'YES'
        }, {
            headers: { 
                'x-admin-secret': ADMIN_SECRET
            }
        });
        
        const distData = distRes.data;
        console.log('   Distribution Result:', JSON.stringify(distData, null, 2));
        
        if (!distData.success) throw new Error('Distribution failed');
        
        // Check for Fee
        const feeDist = distData.distributions.find(d => d.betId === 'platform-fee');
        if (feeDist) {
            console.log(`   ✅ Fee Transfer Found: ${feeDist.amount} to ${feeDist.wallet}`);
        } else {
            console.warn('   ⚠️ No Fee Transfer found!');
        }
        
    } catch (e) {
        console.error('❌ Distribution error:', e.response ? e.response.data : e.message);
        return;
    }

    // 4. Verify Replay Protection (Run again)
    console.log('\n4. Testing Anti-Replay (Running Distribution Again)...');
    try {
        const distRes = await axios.post(`${BASE_URL}/distribute`, {
            marketId: marketId,
            winningOutcome: 'YES'
        }, {
            headers: { 
                'x-admin-secret': ADMIN_SECRET
            }
        });
        
        const distData = distRes.data;
        console.log('   Second Run Result:', distData.message);
        if (distData.distributions && distData.distributions.length > 0) {
            console.error('❌ Anti-replay failed! It distributed again.');
        } else {
            console.log('   ✅ Anti-replay verified (No new distributions)');
        }
    } catch (e) {
        console.error('❌ Anti-replay test error:', e.response ? e.response.data : e.message);
    }
    
    console.log('\n✅ Test Suite Completed Successfully');
};

runTest();

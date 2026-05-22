/**
 * NutriChain AI - Automated Full Pipeline E2E Verification Script
 * This script runs against the live local Node server to test the absolute integrity of:
 * 1. Batch Parent-Child minting.
 * 2. Default Inactive flags.
 * 3. Just-In-Time Carton Activations.
 * 4. AI Impossible Travel Threat Isolation.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let generatedChildId = '';
let generatedSubBatchId = '';

async function runVerification() {
  console.log('⚡ Starting NutriChain AI E2E Security verification...');

  try {
    // 1. Authenticate Manufacturer Emma
    console.log('\n👤 Step 1: Logging in Manufacturer Emma...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'manufacturer@nutrichain.ai',
      password: 'manu123'
    });
    token = loginRes.data.token;
    console.log('✅ Emma authorized. JWT obtained.');

    // 2. Mint batch
    const batchId = `BATCH-${Date.now()}`;
    console.log(`\n📦 Step 2: Minting new Hierarchical Parent-Child Lot: ${batchId}...`);
    const mintRes = await axios.post(`${BASE_URL}/batches`, {
      batchId,
      productVariant: 'Premium ISO-Whey Double Chocolate (5 lbs)',
      totalUnits: 15,
      assignedDistributorId: 'DIST-GLOBAL-SUPPLY'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    generatedChildId = mintRes.data.childQRs[0];
    generatedSubBatchId = mintRes.data.subBatches[0].subBatchId;
    console.log('✅ Batch minted successfully on simulated ledger.');
    console.log(`- Sub-Batch carton: ${generatedSubBatchId}`);
    console.log(`- Child QR Unit ID: ${generatedChildId}`);

    // 3. Attempt verification of an INACTIVE container
    console.log(`\n🔍 Step 3: Consumer Frank scans INACTIVE child code ${generatedChildId}...`);
    const verifyRes1 = await axios.post(`${BASE_URL}/verify/${generatedChildId}`, {
      lat: 40.7128,
      lng: -74.0060,
      locationName: 'NYC Retail Outlet'
    });
    console.log(`- Response State: ${verifyRes1.data.status}`);
    console.log(`- Ripple Decision: ${verifyRes1.data.ripplePulse.toUpperCase()} GLOW`);
    console.log(`- Verdict: ${verifyRes1.data.message}`);
    
    if (verifyRes1.data.status === 'INACTIVE_STOLEN') {
      console.log('✅ Security Check Passed: Inactive code blocked and flagged as stolen pre-distribution inventory.');
    } else {
      throw new Error('Security Fail: Inactive code was not blocked.');
    }

    // 4. JIT Activate carton dispatch
    console.log(`\n⚡ Step 4: Dispatch warehouse activates sub-batch carton ${generatedSubBatchId}...`);
    const actRes = await axios.post(`${BASE_URL}/subbatches/activate`, {
      subBatchId: generatedSubBatchId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Carton activated. ${actRes.data.activatedUnits} children codes set to active.`);

    // 5. Verify the activated genuine container
    console.log(`\n🔍 Step 5: Frank scans unit again at NYC Outlet...`);
    const verifyRes2 = await axios.post(`${BASE_URL}/verify/${generatedChildId}`, {
      lat: 40.7128,
      lng: -74.0060,
      locationName: 'NYC Retail Outlet'
    });
    console.log(`- Response State: ${verifyRes2.data.status}`);
    console.log(`- Ripple Decision: ${verifyRes2.data.ripplePulse.toUpperCase()} RIPPLE`);
    console.log(`- Verdict: ${verifyRes2.data.message}`);
    
    if (verifyRes2.data.genuine) {
      console.log('✅ Verification Check Passed: Item successfully confirmed as 100% Genuine Certified!');
    } else {
      throw new Error('Verification Fail: Genuine activated item was blocked.');
    }

    // 6. Test impossible velocity spatial-temporal travel checks
    console.log(`\n🚨 Step 6: Triggering Impossible Travel Check (Scanning in London, UK 2 seconds later)...`);
    const verifyRes3 = await axios.post(`${BASE_URL}/verify/${generatedChildId}`, {
      lat: 51.5074,
      lng: -0.1278,
      locationName: 'London Dock Terminal'
    });
    console.log(`- Response State: ${verifyRes3.data.status}`);
    console.log(`- Ripple Decision: ${verifyRes3.data.ripplePulse.toUpperCase()} GLOW`);
    console.log(`- Verdict: ${verifyRes3.data.message}`);
    
    if (!verifyRes3.data.genuine && verifyRes3.data.status === 'FRAUD_THREAT') {
      console.log('✅ AI Security Check Passed: Cloned identifier successfully isolated and flagged as a High Counterfeit Threat!');
    } else {
      throw new Error('Security Fail: Impossible travel velocity was not intercepted.');
    }

    console.log('\n🏆 ALL PIPELINE VERIFICATIONS COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('\n❌ Verification sequence failed:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    }
  }
}

runVerification();

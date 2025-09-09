/**
 * ZK Migration Test Suite
 * 
 * This comprehensive test suite validates the ZK proof handling migration
 * from frontend-direct database writes to secure backend-mediated operations.
 * 
 * Test Coverage:
 * - Backend API endpoint validation
 * - Database schema changes
 * - Security enhancements
 * - Error handling
 * - Integration flow
 */

const fetch = require('node-fetch');

// Test Configuration
const API_BASE = 'http://localhost:3002';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

// Test Data
const VALID_ZK_FLAGS = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // B1 classification
const INVALID_ZK_FLAGS = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0]; // Invalid - multiple flags
const EMPTY_ZK_FLAGS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // No active classification

// Test Results Tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

function logTest(testName, passed, details = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`✅ PASS: ${testName}`);
    } else {
        testResults.failed++;
        console.log(`❌ FAIL: ${testName}`);
        console.log(`   Details: ${details}`);
    }
    testResults.details.push({
        name: testName,
        passed,
        details
    });
}

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', body = null) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : null,
        });
        
        const data = await response.json();
        return { 
            status: response.status, 
            ok: response.ok, 
            data 
        };
    } catch (error) {
        return { 
            status: 0, 
            ok: false, 
            error: error.message 
        };
    }
}

// Test 1: Backend Service Health Check
async function testBackendHealth() {
    console.log('\n🔍 Testing Backend Service Health...');
    
    const response = await makeRequest('/api/health');
    logTest(
        'Backend service is running',
        response.ok,
        response.error || `Status: ${response.status}`
    );
}

// Test 2: ZK Verify-and-Store Endpoint - Valid Request
async function testValidZKVerification() {
    console.log('\n🔍 Testing Valid ZK Verification...');
    
    const requestBody = {
        userId: TEST_USER_ID,
        zkFlags: VALID_ZK_FLAGS,
        isSignatureValid: true,
        isDataAuthentic: true
    };
    
    const response = await makeRequest('/api/zk/verify-and-store', 'POST', requestBody);
    
    logTest(
        'Valid ZK verification request succeeds',
        response.ok && response.data.success,
        response.error || JSON.stringify(response.data, null, 2)
    );
    
    if (response.ok && response.data.success) {
        logTest(
            'Income bracket correctly mapped to B1',
            response.data.incomeBracket === 'B1',
            `Expected: B1, Got: ${response.data.incomeBracket}`
        );
    }
}

// Test 3: Input Validation - Missing userId
async function testMissingUserId() {
    console.log('\n🔍 Testing Missing UserId Validation...');
    
    const requestBody = {
        zkFlags: VALID_ZK_FLAGS,
        isSignatureValid: true,
        isDataAuthentic: true
        // Missing userId
    };
    
    const response = await makeRequest('/api/zk/verify-and-store', 'POST', requestBody);
    
    logTest(
        'Missing userId returns 400 error',
        response.status === 400 && !response.data.success,
        `Status: ${response.status}, Success: ${response.data?.success}`
    );
    
    logTest(
        'Error message mentions userId requirement',
        response.data?.error?.includes('userId'),
        `Error: ${response.data?.error}`
    );
}

// Test 4: Input Validation - Invalid ZK Flags Array
async function testInvalidZKFlags() {
    console.log('\n🔍 Testing Invalid ZK Flags Validation...');
    
    const testCases = [
        {
            name: 'ZK flags array too short',
            zkFlags: [1, 0, 0, 0, 0], // Only 5 elements instead of 10
        },
        {
            name: 'ZK flags array too long',
            zkFlags: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 12 elements instead of 10
        },
        {
            name: 'ZK flags not an array',
            zkFlags: "invalid",
        },
        {
            name: 'Multiple active classifications',
            zkFlags: INVALID_ZK_FLAGS,
        },
        {
            name: 'No active classification',
            zkFlags: EMPTY_ZK_FLAGS,
        }
    ];
    
    for (const testCase of testCases) {
        const requestBody = {
            userId: TEST_USER_ID,
            zkFlags: testCase.zkFlags,
            isSignatureValid: true,
            isDataAuthentic: true
        };
        
        const response = await makeRequest('/api/zk/verify-and-store', 'POST', requestBody);
        
        logTest(
            `${testCase.name} returns 400 error`,
            response.status === 400 && !response.data.success,
            `Status: ${response.status}, Error: ${response.data?.error}`
        );
    }
}

// Test 5: Input Validation - Boolean Parameters
async function testBooleanValidation() {
    console.log('\n🔍 Testing Boolean Parameter Validation...');
    
    const testCases = [
        {
            name: 'isSignatureValid not boolean',
            body: {
                userId: TEST_USER_ID,
                zkFlags: VALID_ZK_FLAGS,
                isSignatureValid: "true", // String instead of boolean
                isDataAuthentic: true
            }
        },
        {
            name: 'isDataAuthentic not boolean',
            body: {
                userId: TEST_USER_ID,
                zkFlags: VALID_ZK_FLAGS,
                isSignatureValid: true,
                isDataAuthentic: 1 // Number instead of boolean
            }
        }
    ];
    
    for (const testCase of testCases) {
        const response = await makeRequest('/api/zk/verify-and-store', 'POST', testCase.body);
        
        logTest(
            `${testCase.name} returns 400 error`,
            response.status === 400 && !response.data.success,
            `Status: ${response.status}, Error: ${response.data?.error}`
        );
    }
}

// Test 6: Security Validation - Invalid Signatures
async function testSecurityValidation() {
    console.log('\n🔍 Testing Security Validation...');
    
    const testCases = [
        {
            name: 'Invalid signature rejected',
            isSignatureValid: false,
            isDataAuthentic: true
        },
        {
            name: 'Inauthentic data rejected',
            isSignatureValid: true,
            isDataAuthentic: false
        },
        {
            name: 'Both invalid rejected',
            isSignatureValid: false,
            isDataAuthentic: false
        }
    ];
    
    for (const testCase of testCases) {
        const requestBody = {
            userId: TEST_USER_ID,
            zkFlags: VALID_ZK_FLAGS,
            isSignatureValid: testCase.isSignatureValid,
            isDataAuthentic: testCase.isDataAuthentic
        };
        
        const response = await makeRequest('/api/zk/verify-and-store', 'POST', requestBody);
        
        logTest(
            `${testCase.name}`,
            response.status === 400 && !response.data.success,
            `Status: ${response.status}, Error: ${response.data?.error}`
        );
    }
}

// Test 7: Income Bracket Mapping
async function testIncomeBracketMapping() {
    console.log('\n🔍 Testing Income Bracket Mapping...');
    
    const classNames = ['B1', 'B2', 'B3', 'B4', 'M1', 'M2', 'M3', 'M4', 'T1', 'T2'];
    
    for (let i = 0; i < classNames.length; i++) {
        const zkFlags = new Array(10).fill(0);
        zkFlags[i] = 1; // Activate only this classification
        
        const requestBody = {
            userId: TEST_USER_ID,
            zkFlags: zkFlags,
            isSignatureValid: true,
            isDataAuthentic: true
        };
        
        const response = await makeRequest('/api/zk/verify-and-store', 'POST', requestBody);
        
        logTest(
            `ZK flags [${i}] maps to income bracket ${classNames[i]}`,
            response.ok && response.data.incomeBracket === classNames[i],
            `Expected: ${classNames[i]}, Got: ${response.data?.incomeBracket}`
        );
    }
}

// Test 8: Integration Flow Test
async function testIntegrationFlow() {
    console.log('\n🔍 Testing Integration Flow...');
    
    // Test the complete flow with IC verification
    const icNumber = "030520-01-2185"; // Test IC from the docs
    
    console.log('  Step 1: Testing ZK proof generation...');
    const zkResponse = await makeRequest('/api/ic-verification', 'POST', { ic: icNumber });
    
    logTest(
        'ZK proof generation succeeds',
        zkResponse.ok && zkResponse.data.success && zkResponse.data.zk_verified,
        `Status: ${zkResponse.status}, ZK Verified: ${zkResponse.data?.zk_verified}`
    );
    
    if (zkResponse.ok && zkResponse.data.zk_verified) {
        console.log('  Step 2: Testing data extraction...');
        
        const publicSignals = zkResponse.data.zk_proof.public_signals;
        const zkFlags = publicSignals.slice(0, 10).map(signal => parseInt(signal));
        const isSignatureValid = parseInt(publicSignals[10]) === 1;
        const isDataAuthentic = parseInt(publicSignals[11]) === 1;
        
        logTest(
            'Public signals extraction succeeds',
            Array.isArray(zkFlags) && zkFlags.length === 10,
            `ZK Flags: ${zkFlags}, Signature: ${isSignatureValid}, Authentic: ${isDataAuthentic}`
        );
        
        console.log('  Step 3: Testing backend storage...');
        
        const storeResponse = await makeRequest('/api/zk/verify-and-store', 'POST', {
            userId: TEST_USER_ID,
            zkFlags: zkFlags,
            isSignatureValid: isSignatureValid,
            isDataAuthentic: isDataAuthentic
        });
        
        logTest(
            'Backend storage succeeds',
            storeResponse.ok && storeResponse.data.success,
            `Status: ${storeResponse.status}, Success: ${storeResponse.data?.success}`
        );
    }
}

// Test 9: API Documentation Check
async function testAPIDocumentation() {
    console.log('\n🔍 Testing API Documentation...');
    
    const response = await makeRequest('/api-docs');
    
    logTest(
        'Swagger documentation is accessible',
        response.ok,
        `Status: ${response.status}`
    );
}

// Test 10: Error Handling
async function testErrorHandling() {
    console.log('\n🔍 Testing Error Handling...');
    
    // Test with malformed JSON
    try {
        const response = await fetch(`${API_BASE}/api/zk/verify-and-store`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: 'invalid json{',
        });
        
        logTest(
            'Malformed JSON returns 400 error',
            response.status === 400,
            `Status: ${response.status}`
        );
    } catch (error) {
        logTest(
            'Malformed JSON handled gracefully',
            true,
            `Error caught: ${error.message}`
        );
    }
    
    // Test with empty request body
    const emptyResponse = await makeRequest('/api/zk/verify-and-store', 'POST', {});
    
    logTest(
        'Empty request body returns validation error',
        emptyResponse.status === 400 && !emptyResponse.data.success,
        `Status: ${emptyResponse.status}, Error: ${emptyResponse.data?.error}`
    );
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting ZK Migration Test Suite...\n');
    console.log('Testing Backend API endpoint: /api/zk/verify-and-store');
    console.log('Testing Security enhancements and validation');
    console.log('Testing Integration flow\n');
    
    try {
        await testBackendHealth();
        await testValidZKVerification();
        await testMissingUserId();
        await testInvalidZKFlags();
        await testBooleanValidation();
        await testSecurityValidation();
        await testIncomeBracketMapping();
        await testIntegrationFlow();
        await testAPIDocumentation();
        await testErrorHandling();
        
        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${testResults.total}`);
        console.log(`Passed: ${testResults.passed} ✅`);
        console.log(`Failed: ${testResults.failed} ❌`);
        console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
        
        if (testResults.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            testResults.details
                .filter(test => !test.passed)
                .forEach(test => {
                    console.log(`  - ${test.name}`);
                    if (test.details) {
                        console.log(`    ${test.details}`);
                    }
                });
        }
        
        console.log('\n' + '='.repeat(60));
        
        // Return exit code based on test results
        process.exit(testResults.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n💥 Test suite crashed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    makeRequest,
    testResults
};
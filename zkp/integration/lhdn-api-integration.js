/**
 * LHDN API Integration Layer
 * 
 * This module provides utilities to convert Mock LHDN API responses
 * into the format required by the MalaysianIncomeClassifier ZK circuit.
 * 
 * Key Functions:
 * 1. Fetch income data from Mock LHDN API
 * 2. Convert API response to circuit-compatible inputs
 * 3. Handle signature extraction and validation
 * 4. Provide test utilities for development
 */

import crypto from 'crypto';

// Mock LHDN API configuration
const LHDN_API_BASE_URL = 'http://localhost:3001';

/**
 * Fetch citizen income data from Mock LHDN API
 * @param {string} ic - Malaysian IC number (e.g., "030520-01-2185")
 * @returns {Promise<Object>} API response with signature
 */
export async function fetchIncomeData(ic) {
    try {
        const response = await fetch(`${LHDN_API_BASE_URL}/api/verify-income`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ic })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`LHDN API Error: ${errorData.error} (${errorData.code})`);
        }

        const data = await response.json();
        console.log(`LHDN API Response for IC ${ic}:`, {
            citizen_name: data.citizen_name,
            monthly_income: data.monthly_income,
            signature_length: data.signature?.length || 0,
            public_key_length: data.public_key?.length || 0
        });

        return data;
    } catch (error) {
        console.error('Error fetching income data:', error.message);
        throw error;
    }
}

/**
 * Convert LHDN API response to ZK circuit inputs
 * @param {Object} lhdnResponse - Response from Mock LHDN API
 * @param {number} timestampRange - Maximum allowed timestamp age (optional)
 * @returns {Object} Circuit-compatible inputs
 */
export function convertToCircuitInputs(lhdnResponse, timestampRange = 86400000) {
    const {
        ic,
        monthly_income,
        citizen_name,
        verification_timestamp,
        signature,
        public_key
    } = lhdnResponse;

    // Convert hex signature to BigInt (circuit field element)
    const signatureBigInt = BigInt('0x' + signature);
    
    // Convert public key to BigInt
    const publicKeyBigInt = BigInt('0x' + public_key.slice(0, 32)); // Use first 32 chars
    
    // Create hash of IC number for privacy
    const icHash = crypto.createHash('sha256').update(ic).digest('hex');
    const icHashBigInt = BigInt('0x' + icHash.slice(0, 16)); // Use first 16 chars to fit field
    
    // Convert timestamp to seconds since epoch
    const timestampSeconds = Math.floor(new Date(verification_timestamp).getTime() / 1000);
    
    const circuitInputs = {
        // Private inputs (hidden from verifiers)
        monthly_income: monthly_income.toString(),
        signature: signatureBigInt.toString(),
        verification_timestamp: timestampSeconds.toString(),
        
        // Public inputs (visible to verifiers)
        public_key: publicKeyBigInt.toString(),
        ic_hash: icHashBigInt.toString(),
        timestamp_range: timestampRange.toString()
    };

    console.log('Converted to circuit inputs:', {
        monthly_income: monthly_income,
        signature_preview: signature.slice(0, 16) + '...',
        public_key_preview: public_key.slice(0, 16) + '...',
        ic_hash_preview: icHash.slice(0, 16) + '...',
        timestamp: new Date(verification_timestamp).toISOString()
    });

    return circuitInputs;
}

/**
 * Generate witness data for ZK circuit testing
 * @param {string} ic - IC number to test with
 * @param {number} timestampRange - Timestamp range for validation
 * @returns {Promise<Object>} Complete witness data for circuit
 */
export async function generateWitness(ic, timestampRange = 86400000) {
    console.log(`Generating witness for IC: ${ic}`);
    
    // Fetch data from Mock LHDN API
    const lhdnResponse = await fetchIncomeData(ic);
    
    // Convert to circuit inputs
    const circuitInputs = convertToCircuitInputs(lhdnResponse, timestampRange);
    
    // Add metadata for testing
    const witness = {
        ...circuitInputs,
        metadata: {
            citizen_name: lhdnResponse.citizen_name,
            original_ic: ic,
            api_response_time: new Date().toISOString(),
            expected_income_class: classifyIncome(lhdnResponse.monthly_income)
        }
    };

    return witness;
}

/**
 * Classify income according to Malaysian brackets (for testing)
 * @param {number} income - Monthly income in RM
 * @returns {string} Income classification
 */
function classifyIncome(income) {
    if (income <= 2560) return 'B1';
    if (income <= 3439) return 'B2';
    if (income <= 4309) return 'B3';
    if (income <= 5249) return 'B4';
    if (income <= 6339) return 'M1';
    if (income <= 7689) return 'M2';
    if (income <= 9449) return 'M3';
    if (income <= 11819) return 'M4';
    if (income <= 15869) return 'T1';
    return 'T2';
}

/**
 * Verify signature using Mock LHDN API
 * @param {Object} data - Original data that was signed
 * @param {string} signature - Signature to verify
 * @returns {Promise<boolean>} Whether signature is valid
 */
export async function verifySignature(data, signature) {
    try {
        const response = await fetch(`${LHDN_API_BASE_URL}/api/verify-signature`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data, signature })
        });

        const result = await response.json();
        return result.is_valid;
    } catch (error) {
        console.error('Error verifying signature:', error.message);
        return false;
    }
}

/**
 * Get test IC numbers from Mock LHDN API
 * @returns {Promise<Array>} List of available test ICs
 */
export async function getTestICs() {
    try {
        const response = await fetch(`${LHDN_API_BASE_URL}/api/test-ics`);
        const data = await response.json();
        return data.test_citizens;
    } catch (error) {
        console.error('Error fetching test ICs:', error.message);
        return [];
    }
}

/**
 * Test the complete integration flow
 * @param {string} ic - IC number to test (optional)
 */
export async function testIntegrationFlow(ic = null) {
    console.log('Testing LHDN API integration flow...\n');
    
    try {
        // Get test ICs if none provided
        if (!ic) {
            const testICs = await getTestICs();
            if (testICs.length === 0) {
                throw new Error('No test ICs available');
            }
            ic = testICs[0].formatted_ic;
            console.log(`Using test IC: ${ic}\n`);
        }

        // Generate witness
        const witness = await generateWitness(ic);
        
        console.log('Integration test results:');
        console.log('  API fetch successful');
        console.log('  Data conversion successful');
        console.log('  Expected income class:', witness.metadata.expected_income_class);
        console.log('  Signature length:', witness.signature.length, 'characters');
        console.log('  Citizen:', witness.metadata.citizen_name);
        
        return witness;
        
    } catch (error) {
        console.error('Integration test failed:', error.message);
        throw error;
    }
}

// Export utility functions for external use
export {
    classifyIncome,
    LHDN_API_BASE_URL
};
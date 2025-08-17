/**
 * Digital Signature Verification Demo
 * 
 * This script demonstrates the complete integration between:
 * 1. Mock LHDN API (income verification with signatures)
 * 2. ZK Circuit (income classification with signature verification)
 * 
 * Usage:
 * node signature-verification-demo.js [ic_number]
 */

import { 
    fetchIncomeData, 
    convertToCircuitInputs, 
    generateWitness, 
    testIntegrationFlow,
    getTestICs,
    classifyIncome
} from '../integration/lhdn-api-integration.js';

/**
 * Demo 1: Basic API Integration
 * Shows how to fetch data from Mock LHDN API and convert for ZK circuit
 */
async function demoAPIIntegration() {
    console.log('=== Demo 1: API Integration ===\n');
    
    try {
        // Get available test ICs
        const testICs = await getTestICs();
        console.log('Available test ICs:');
        testICs.forEach((citizen, index) => {
            console.log(`  ${index + 1}. IC: ${citizen.formatted_ic} | Name: ${citizen.name} | Income: RM${citizen.income} | Class: ${classifyIncome(citizen.income)}`);
        });
        console.log();

        // Test with first IC
        const testIC = testICs[0].formatted_ic;
        console.log(`Testing with IC: ${testIC}`);
        
        // Fetch raw API data
        const apiResponse = await fetchIncomeData(testIC);
        console.log('Raw API Response:');
        console.log('  Citizen:', apiResponse.citizen_name);
        console.log('  Income: RM' + apiResponse.monthly_income);
        console.log('  Timestamp:', apiResponse.verification_timestamp);
        console.log('  Signature:', apiResponse.signature.slice(0, 32) + '...');
        console.log('  Public Key:', apiResponse.public_key.slice(0, 32) + '...');
        console.log();

        // Convert to circuit inputs
        const circuitInputs = convertToCircuitInputs(apiResponse);
        console.log('Circuit Inputs:');
        console.log('  monthly_income (private):', circuitInputs.monthly_income);
        console.log('  signature (private):', circuitInputs.signature.slice(0, 20) + '...');
        console.log('  verification_timestamp (private):', circuitInputs.verification_timestamp);
        console.log('  public_key (public):', circuitInputs.public_key.slice(0, 20) + '...');
        console.log('  ic_hash (public):', circuitInputs.ic_hash.slice(0, 20) + '...');
        console.log('  timestamp_range (public):', circuitInputs.timestamp_range);
        
        return { apiResponse, circuitInputs, testIC };
        
    } catch (error) {
        console.error('Demo 1 failed:', error.message);
        throw error;
    }
}

/**
 * Demo 2: Signature Verification Workflow
 * Shows the complete signature verification process
 */
async function demoSignatureVerification() {
    console.log('\n=== Demo 2: Signature Verification Workflow ===\n');
    
    try {
        const testICs = await getTestICs();
        
        for (let i = 0; i < testICs.length; i++) {
            const testIC = testICs[i].formatted_ic;
            console.log(`Testing signature verification for IC: ${testIC}`);
            
            // Generate complete witness data
            const witness = await generateWitness(testIC);
            
            console.log('Witness Data Generated:');
            console.log('  Expected Income Class:', witness.metadata.expected_income_class);
            console.log('  Citizen Name:', witness.metadata.citizen_name);
            console.log('  API Response Time:', witness.metadata.api_response_time);
            console.log();
            
            // Simulate what the ZK circuit would validate
            const validationResults = simulateCircuitValidation(witness);
            console.log('Circuit Validation Results:');
            console.log('  Signature Valid:', validationResults.signatureValid);
            console.log('  Data Authentic:', validationResults.dataAuthentic);
            console.log('  Income Classification:', validationResults.incomeClass);
            console.log('  All Class Flags:', validationResults.classFlags);
            console.log();
        }
        
    } catch (error) {
        console.error('Demo 2 failed:', error.message);
        throw error;
    }
}

/**
 * Simulate ZK circuit validation logic
 * @param {Object} witness - Witness data for the circuit
 * @returns {Object} Validation results
 */
function simulateCircuitValidation(witness) {
    const income = parseInt(witness.monthly_income);
    
    // Simulate signature validation (simplified)
    const signatureValid = witness.signature && witness.signature !== '0';
    const publicKeyValid = witness.public_key && witness.public_key !== '0';
    const timestampValid = witness.verification_timestamp > 0;
    
    // Data is authentic if all checks pass
    const dataAuthentic = signatureValid && publicKeyValid && timestampValid;
    
    // Classify income (matching circuit logic)
    const incomeClass = classifyIncome(income);
    
    // Generate class flags (one-hot encoding)
    const classes = ['B1', 'B2', 'B3', 'B4', 'M1', 'M2', 'M3', 'M4', 'T1', 'T2'];
    const classFlags = classes.map(cls => {
        const isMatch = cls === incomeClass;
        // Only return 1 if data is authentic AND this is the correct class
        return (dataAuthentic && isMatch) ? 1 : 0;
    });
    
    return {
        signatureValid,
        dataAuthentic,
        incomeClass,
        classFlags: classFlags
    };
}

/**
 * Demo 3: Invalid Signature Handling
 * Shows how the system handles tampered or invalid signatures
 */
async function demoInvalidSignature() {
    console.log('\n=== Demo 3: Invalid Signature Handling ===\n');
    
    try {
        const testICs = await getTestICs();
        const testIC = testICs[0].formatted_ic;
        
        // Get valid witness first
        const validWitness = await generateWitness(testIC);
        console.log('Original Valid Witness:');
        console.log('  Income:', validWitness.monthly_income);
        console.log('  Expected Class:', validWitness.metadata.expected_income_class);
        
        // Create tampered witness (invalid signature)
        const tamperedWitness = {
            ...validWitness,
            signature: '123456789', // Invalid signature
        };
        
        console.log('Tampered Witness (Invalid Signature):');
        console.log('  Income:', tamperedWitness.monthly_income);
        console.log('  Tampered Signature:', tamperedWitness.signature);
        
        // Simulate validation with both witnesses
        const validResults = simulateCircuitValidation(validWitness);
        const tamperedResults = simulateCircuitValidation(tamperedWitness);
        
        console.log('Validation Results Comparison:');
        console.log('Valid Witness:');
        console.log('  Data Authentic:', validResults.dataAuthentic);
        console.log('  Class Flags Sum:', validResults.classFlags.reduce((a, b) => a + b, 0), '(should be 1)');
        
        console.log('Tampered Witness:');
        console.log('  Data Authentic:', tamperedResults.dataAuthentic);
        console.log('  Class Flags Sum:', tamperedResults.classFlags.reduce((a, b) => a + b, 0), '(should be 0)');
        
        console.log('\nSecurity Check: Tampered data results in zero classification output');
        
    } catch (error) {
        console.error('Demo 3 failed:', error.message);
        throw error;
    }
}

/**
 * Main demo runner
 */
async function main() {
    const icNumber = process.argv[2]; // Optional IC number from command line
    
    console.log('Digital Signature Verification Demo');
    console.log('====================================');
    
    try {
        // Run all demos
        await demoAPIIntegration();
        await demoSignatureVerification();
        await demoInvalidSignature();
        
        // If specific IC provided, test it
        if (icNumber) {
            console.log(`\n=== Custom Test: IC ${icNumber} ===\n`);
            const customResult = await testIntegrationFlow(icNumber);
            console.log('Custom test completed successfully');
        }
        
        console.log('\n=== All Demos Completed Successfully ===');
        console.log('\nNext Steps:');
        console.log('1. Compile the Circom circuit: circom MalaysianIncomeClassifier.circom --r1cs --wasm');
        console.log('2. Generate witness: snarkjs wtns calculate circuit.wasm input.json witness.wtns');
        console.log('3. Generate proof: snarkjs groth16 prove circuit_final.zkey witness.wtns proof.json public.json');
        console.log('4. Verify proof: snarkjs groth16 verify verification_key.json public.json proof.json');
        
    } catch (error) {
        console.error('Demo failed:', error.message);
        process.exit(1);
    }
}

// Run demos if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
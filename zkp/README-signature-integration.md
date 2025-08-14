# ZK Circuit Digital Signature Integration

This document explains how to use the enhanced `MalaysianIncomeClassifier` circuit with digital signature verification from the Mock LHDN API.

## Overview

The enhanced system combines:
1. **Income Classification**: Zero-knowledge proof of income bracket (B1-B4, M1-M4, T1-T2)
2. **Signature Verification**: Cryptographic proof that income data comes from trusted LHDN authority
3. **Privacy Protection**: Income amount remains hidden while proving eligibility

## Architecture

```
Mock LHDN API -> API Integration Layer -> ZK Circuit -> Proof Generation
     |                    |                   |              |
  [Income +           [Convert to         [Verify +      [Generate
   Signature]          Circuit Input]      Classify]       Proof]
```

## File Structure

```
zkp/
├── circuits/
│   ├── MalaysianIncomeClassifier.circom    # Main circuit with signature verification
│   └── utils/
│       └── SignatureVerifier.circom        # Signature verification component
├── integration/
│   └── lhdn-api-integration.js             # API integration utilities
├── examples/
│   └── signature-verification-demo.js     # Complete demo and testing
└── README-signature-integration.md        # This file
```

## Circuit Inputs

### Private Inputs (Hidden from verifiers)
- `monthly_income`: Citizen's actual income in RM
- `signature`: HMAC signature from LHDN API
- `verification_timestamp`: When LHDN verified the data

### Public Inputs (Visible to verifiers)
- `public_key`: LHDN's public key for signature verification
- `ic_hash`: Hashed IC number (for privacy)
- `timestamp_range`: Maximum allowed age of verification

### Outputs
- `class_flags[10]`: One-hot encoded income classification (B1-T2)
- `is_signature_valid`: Whether the LHDN signature is authentic
- `is_data_authentic`: Whether all verification checks pass

## Security Model

### Signature Verification
The circuit ensures that:
1. **Signature is non-zero** (basic integrity check)
2. **Public key is valid** (non-zero and properly formatted)
3. **Timestamp is recent** (within allowed time range)
4. **Income is reasonable** (within expected bounds)

### Classification Security
- **Valid data**: If signature verifies, normal income classification proceeds
- **Invalid data**: If signature fails, all `class_flags` outputs are zero
- **Privacy**: Income amount remains private, only classification is revealed

## Usage Examples

### 1. Basic API Integration

```javascript
import { fetchIncomeData, convertToCircuitInputs } from './integration/lhdn-api-integration.js';

// Fetch data from Mock LHDN API
const apiResponse = await fetchIncomeData('030520-01-2185');

// Convert to circuit-compatible format
const circuitInputs = convertToCircuitInputs(apiResponse);

// Use circuitInputs for ZK proof generation
```

### 2. Generate Complete Witness

```javascript
import { generateWitness } from './integration/lhdn-api-integration.js';

// Generate witness for ZK circuit
const witness = await generateWitness('030520-01-2185');

// witness contains all circuit inputs + metadata
console.log('Expected income class:', witness.metadata.expected_income_class);
```

### 3. Run Complete Demo

```bash
# Run demo with test ICs
node examples/signature-verification-demo.js

# Run demo with specific IC
node examples/signature-verification-demo.js 030520-01-2185
```

## Test Cases

The system includes test cases for:

### Valid Signatures
- IC: `030520-01-2185` (HAR SZE HAO, RM1800, B1 class)
- IC: `030322-01-6289` (PANG ZHAN HUANG, RM2350, B2 class)

### Invalid Signatures
- Tampered signature data
- Wrong public key
- Expired timestamps

## Circuit Compilation

```bash
# Install dependencies
npm install circomlib

# Compile circuit
circom MalaysianIncomeClassifier.circom --r1cs --wasm --sym

# Generate witness (example)
node -e "
import { generateWitness } from './integration/lhdn-api-integration.js';
generateWitness('030520-01-2185').then(w => 
  require('fs').writeFileSync('input.json', JSON.stringify(w, null, 2))
);
"

# Calculate witness
snarkjs wtns calculate circuit.wasm input.json witness.wtns
```

## Integration with Frontend

### Step 1: Fetch Verified Data
```javascript
// In your frontend application
const response = await fetch('/api/verify-income', {
  method: 'POST',
  body: JSON.stringify({ ic: userIC })
});
const verifiedData = await response.json();
```

### Step 2: Generate ZK Proof
```javascript
// Convert API response to circuit inputs
const circuitInputs = convertToCircuitInputs(verifiedData);

// Generate ZK proof (using snarkjs in browser or server)
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  circuitInputs,
  wasmFile,
  zkeyFile
);
```

### Step 3: Verify on Smart Contract
```solidity
// Smart contract can verify the proof
bool isValid = verifier.verifyProof(proof, publicSignals);

// Public signals contain:
// - is_signature_valid
// - is_data_authentic  
// - class_flags[10] (income classification)
```

## Security Considerations

### Current Implementation (Demo)
- Uses HMAC-SHA256 instead of full ECDSA (simplified)
- Public keys are ephemeral (regenerated on restart)
- Timestamp validation is basic

### Production Recommendations
- Implement full ECDSA signature verification
- Use persistent key management system
- Add comprehensive timestamp and replay attack protection
- Implement key rotation and revocation
- Add audit logging for all signature operations

## API Endpoints

### Mock LHDN API Endpoints
- `POST /api/verify-income` - Verify citizen income with signature
- `GET /api/test-ics` - Get available test IC numbers
- `POST /api/verify-signature` - Verify signature authenticity
- `GET /health` - Health check with public key

### Example API Response
```json
{
  "ic": "030520-01-2185",
  "monthly_income": 1800,
  "citizen_name": "HAR SZE HAO",
  "verification_timestamp": "2024-03-15T10:30:00.000Z",
  "issuer": "Mock LHDN",
  "signature": "a1b2c3d4e5f6...",
  "public_key": "04a1b2c3d4e5f6..."
}
```

## Troubleshooting

### Common Issues

1. **"Citizen not found"**
   - Use test ICs: `030520-01-2185` or `030322-01-6289`
   - Check IC format: `YYMMDD-SS-NNNN`

2. **"Invalid signature"**
   - Ensure Mock LHDN API is running on port 3001
   - Check that data hasn't been modified after API call

3. **Circuit compilation errors**
   - Install circomlib: `npm install circomlib`
   - Check path to circuit files

4. **BigInt conversion errors**
   - Ensure signature strings are valid hexadecimal
   - Check field element size limits

### Debug Mode

Enable debug logging:
```javascript
// Set environment variable
process.env.DEBUG = 'lhdn-integration';

// Run demo with verbose output
node examples/signature-verification-demo.js
```

## Next Steps

1. **Deploy Smart Contract**: Create Solidity verifier contract
2. **Frontend Integration**: Build UI for proof generation
3. **Production Security**: Implement full ECDSA verification
4. **Performance Optimization**: Optimize circuit constraints
5. **Key Management**: Set up secure key storage and rotation
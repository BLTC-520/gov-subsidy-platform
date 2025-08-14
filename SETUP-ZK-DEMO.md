# ZK Circuit Demo Setup Guide

This guide explains how to set up and run the complete ZK signature verification demo with actual circuit execution.

## Quick Start

### 1. Install ZK Tools

```bash
# Install circom (circuit compiler)
curl -L https://github.com/iden3/circom/releases/latest/download/circom-linux-amd64 -o circom
chmod +x circom
sudo mv circom /usr/local/bin/

# Install snarkjs (ZK toolkit)
npm install -g snarkjs

# Setup ZK project dependencies
cd zkp
npm install
./setup.sh
```

### 2. Start Backend Services

**Terminal 1 - Mock LHDN API:**
```bash
cd backend/mock-lhdn-api
npm install  # if first time
npm start    # Runs on port 3001
```

**Terminal 2 - ZK Circuit Service:**
```bash
cd backend
npm install  # if first time
npm start    # Runs on port 3002
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev  # Runs on port 5173
```

### 3. Access Demo

1. Navigate to `http://localhost:5173`
2. Login as a citizen
3. Go to **ZK Demo** from the dropdown menu
4. Click **Start Demo** to execute actual ZK circuit

## How It Works

### Architecture Flow

```
Frontend (React) → ZK Service (Node.js) → Circom Circuit → Witness → Results
     ↓                    ↓                     ↓            ↓         ↓
[User clicks]      [Compile circuit]    [Execute logic]  [Extract]  [Display]
[Start Demo]       [Calculate witness]  [Verify signature] [outputs] [to user]
```

### Actual Circuit Execution

When you click **Start Demo**, the system:

1. **Fetches real data** from Mock LHDN API (port 3001)
2. **Converts to circuit format** (field elements, hashes)
3. **Compiles Circom circuit** (`MalaysianIncomeClassifier.circom`)
4. **Calculates witness** using snarkjs
5. **Extracts outputs** from witness file
6. **Displays real results** from circuit execution

### Circuit Outputs

The circuit returns:
- `class_flags[10]`: One-hot income classification (B1-B4, M1-M4, T1-T2)
- `is_signature_valid`: Whether LHDN signature is authentic (1/0)
- `is_data_authentic`: Whether all verification checks pass (1/0)

### Test Data

Available test citizens:
- **030520-01-2185** (HAR SZE HAO, RM1800, B1 bracket)
- **030322-01-6289** (PANG ZHAN HUANG, RM2350, B2 bracket)

## Service Endpoints

### Mock LHDN API (Port 3001)
- `POST /api/verify-income` - Get signed income data
- `GET /api/test-ics` - List available test ICs
- `GET /health` - Service health check

### ZK Circuit Service (Port 3002)
- `POST /api/execute-circuit` - Execute ZK circuit with inputs
- `GET /api/check-tools` - Verify circom/snarkjs availability
- `GET /health` - Service health check

### Frontend (Port 5173)
- `/citizen/zk-demo` - Interactive ZK demonstration page

## Troubleshooting

### Common Issues

**"circom not found"**
```bash
# Install circom binary
curl -L https://github.com/iden3/circom/releases/latest/download/circom-linux-amd64 -o circom
chmod +x circom
sudo mv circom /usr/local/bin/
```

**"snarkjs not found"**
```bash
npm install -g snarkjs
```

**"Circuit compilation failed"**
```bash
# Check circomlib is installed
cd zkp && npm install circomlib
```

**"LHDN API connection failed"**
```bash
# Ensure Mock LHDN API is running
cd backend/mock-lhdn-api && npm start
```

**"ZK Service connection failed"**
```bash
# Ensure ZK Circuit Service is running
cd backend && npm start
```

### Debug Mode

Enable verbose logging:
```bash
# ZK Service with debug
DEBUG=* npm start

# Check tool availability
curl http://localhost:3002/api/check-tools
```

## Development

### Manual Circuit Testing

```bash
cd zkp

# Compile circuit manually
circom circuits/MalaysianIncomeClassifier.circom --r1cs --wasm --sym -o outputs/

# Create test input
echo '{
  "monthly_income": "1800",
  "signature": "12345678901234567890",
  "verification_timestamp": "1640995200",
  "public_key": "98765432109876543210",
  "ic_hash": "1122334455",
  "timestamp_range": "86400000"
}' > outputs/input.json

# Calculate witness
snarkjs wtns calculate outputs/MalaysianIncomeClassifier.wasm outputs/input.json outputs/witness.wtns

# Export witness to JSON
snarkjs wtns export json outputs/witness.wtns outputs/witness.json

# View results
cat outputs/witness.json
```

### Circuit Modification

1. Edit `zkp/circuits/MalaysianIncomeClassifier.circom`
2. Restart ZK Circuit Service to recompile
3. Test changes via frontend demo

## Security Considerations

### Current Implementation
- **Demo purposes**: Uses simplified HMAC verification
- **Local execution**: All computation happens locally
- **No proof generation**: Focuses on witness calculation
- **Development keys**: Ephemeral key generation

### Production Recommendations
- Implement full ECDSA signature verification
- Add trusted setup for proof generation
- Use persistent key management
- Deploy to secure infrastructure
- Add comprehensive audit logging

## Next Steps

1. **Full Proof Generation**: Add Groth16 setup and proof creation
2. **Smart Contract Integration**: Deploy verifier contract
3. **Production Security**: Implement proper cryptographic primitives
4. **Performance Optimization**: Circuit constraint optimization
5. **Key Management**: Secure key storage and rotation
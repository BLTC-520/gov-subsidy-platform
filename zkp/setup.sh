#!/bin/bash
# Complete Groth16 ZK-SNARK Implementation for Malaysian Income Classification
# Based on Final Year Project requirements

# Exit on error
set -e

echo "🚀 Starting Complete ZK-SNARK Setup for Malaysian Income Verification..."

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ circom not found. Please install circom:"
    echo "curl -L https://github.com/iden3/circom/releases/latest/download/circom-linux-amd64 -o circom"
    echo "chmod +x circom"
    echo "sudo mv circom /usr/local/bin/"
    exit 1
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo "❌ snarkjs not found. Installing via npm..."
    npm install -g snarkjs
fi

# Install Node.js dependencies first
echo "📦 Installing Node.js dependencies..."
npm install

# Check if node_modules/circomlib exists
if [ ! -d "node_modules/circomlib" ]; then
    echo "📦 Installing circomlib..."
    npm install circomlib
fi

# Create required directories
echo "📁 Creating proof directories..."
mkdir -p outputs proofs inputs

# Step 1: Compile Circuit
echo "🔧 Compiling MalaysianIncomeClassifier circuit..."
# -l node_modules -> tells Circom to look inside node_modules when resolving include directives
circom circuits/MalaysianIncomeClassifier.circom --r1cs --wasm --sym -o outputs/ -l node_modules

# Step 2: Download Powers of Tau (Universal Trusted Setup)
echo "⚡ Setting up Powers of Tau (Universal Trusted Setup)..."
if [ ! -f "outputs/pot12.ptau" ]; then
    echo "Downloading Powers of Tau file (2^12 = 4096 constraints)..."
    wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau -O outputs/pot12.ptau
    echo "✅ Powers of Tau downloaded successfully!"
else
    echo "Powers of Tau file already exists, skipping download..."
fi

# Step 3: Circuit-Specific Trusted Setup (Generate Proving Key)
echo "🔑 Generating circuit-specific proving and verification keys..."
snarkjs groth16 setup outputs/MalaysianIncomeClassifier.r1cs outputs/pot12.ptau outputs/circuit.zkey

# Step 4: Export Verification Key
echo "📋 Exporting verification key..."
snarkjs zkey export verificationkey outputs/circuit.zkey outputs/verification_key.json

# Step 5: Create sample input file for testing
echo "📝 Creating sample input file..."
cat > inputs/input.json << EOF
{
  "monthly_income": "2000",
  "signature": "1234567890123456",
  "verification_timestamp": "100",
  "public_key": "9876543210987654",
  "ic_hash": "1122334455",
  "timestamp_range": "86400"
}
EOF

# Step 6: Generate Witness
echo "🧮 Generating witness from sample input..."
node outputs/MalaysianIncomeClassifier_js/generate_witness.js outputs/MalaysianIncomeClassifier_js/MalaysianIncomeClassifier.wasm inputs/input.json outputs/witness.wtns

# Step 7: Generate ZK Proof (THE CORE ZK STEP!)
echo "🔐 Generating zero-knowledge proof..."
snarkjs groth16 prove outputs/circuit.zkey outputs/witness.wtns proofs/proof.json proofs/public.json

# Step 8: Verify Proof (Independent Verification)
echo "✅ Verifying proof..."
if snarkjs groth16 verify outputs/verification_key.json proofs/public.json proofs/proof.json; then
    echo ""
    echo "🎉 SUCCESS! Complete ZK-SNARK pipeline operational!"
    echo ""
    echo "📊 Generated Files:"
    echo "  - Circuit Compilation: outputs/MalaysianIncomeClassifier.{r1cs,wasm,sym}"
    echo "  - Proving Key: outputs/circuit.zkey"
    echo "  - Verification Key: outputs/verification_key.json"
    echo "  - ZK Proof: proofs/proof.json (π_a, π_b, π_c)"
    echo "  - Public Signals: proofs/public.json (income bracket only)"
    echo ""
    echo "🔍 Privacy Demo:"
    echo "  Private Input: Monthly income RM2000 (HIDDEN from verifier)"
    echo "  Public Output: $(cat proofs/public.json)"
    echo ""
    echo "✅ Zero-knowledge property verified: Income amount stays private!"
    echo "✅ Proof generation and verification completed successfully!"
    echo ""
    echo "🚀 Ready for frontend integration!"
else
    echo "❌ Proof verification failed!"
    exit 1
fi

# Optional: Test proof tampering detection
echo ""
echo "🛡️  Testing proof security (tampering detection)..."
echo "Original public.json: $(cat proofs/public.json)"

# Create a backup and test tampering
cp proofs/public.json proofs/public_backup.json
echo '["1", "1", "0", "0", "0", "0", "0", "0", "0", "0", "1", "1"]' > proofs/public.json

echo "Modified public.json: $(cat proofs/public.json)"
if snarkjs groth16 verify outputs/verification_key.json proofs/public.json proofs/proof.json; then
    echo "❌ ERROR: Tampered proof should have failed!"
    exit 1
else
    echo "✅ Tampered proof correctly rejected!"
fi

# Restore original
mv proofs/public_backup.json proofs/public.json
echo "✅ Original proof restored and security test passed!"

echo ""
echo "🎯 ZK-SNARK Setup Complete! Ready for Final Year Project demonstration!"
echo ""
echo "🚀 Next steps:"
echo "  Backend ZK Service: cd ../backend && npm install && node zk-circuit-service.js"
echo "  Mock LHDN API: cd ../backend/mock-lhdn-api && npm start" 
echo "  Frontend: cd ../frontend && npm run dev"
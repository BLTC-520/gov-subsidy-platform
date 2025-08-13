#!/bin/bash

# exit on error
set -e

echo "🇲🇾 Compiling Malaysian B40/M40/T20 Income Classification ZKP Circuit..."

# Create output directories if missing
mkdir -p outputs proofs inputs

# Compile Malaysian circuit
echo "📦 Compiling MalaysianIncomeClassification.circom..."
circom circuits/MalaysianIncomeClassification.circom --r1cs --wasm --sym -o outputs/ -l node_modules

# Download Powers of Tau files if missing
if [ ! -f "outputs/pot10.ptau" ]; then
    echo "⬇️ Downloading Powers of Tau file..."
    wget -nc https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_10.ptau -O outputs/pot10.ptau
fi

# Generate keys
echo "🔑 Generating proving and verification keys..."
snarkjs groth16 setup outputs/MalaysianIncomeClassification.r1cs outputs/pot10.ptau outputs/MalaysianIncomeClassification.zkey

# Export verification key
echo "🔐 Exporting verification key..."
snarkjs zkey export verificationkey outputs/MalaysianIncomeClassification.zkey outputs/malaysian_verification_key.json

# Test all three income brackets
echo ""
echo "🧪 Testing B40 case (RM 3,500 - Full Subsidy Eligible)..."
node outputs/MalaysianIncomeClassification_js/generate_witness.js outputs/MalaysianIncomeClassification_js/MalaysianIncomeClassification.wasm inputs/b40_case.json outputs/b40_witness.wtns
snarkjs groth16 prove outputs/MalaysianIncomeClassification.zkey outputs/b40_witness.wtns proofs/b40_proof.json proofs/b40_public.json
echo "✅ B40 Proof generated: $(cat proofs/b40_public.json)"

echo ""
echo "🧪 Testing M40 case (RM 7,500 - Partial Subsidy Eligible)..."
node outputs/MalaysianIncomeClassification_js/generate_witness.js outputs/MalaysianIncomeClassification_js/MalaysianIncomeClassification.wasm inputs/m40_case.json outputs/m40_witness.wtns
snarkjs groth16 prove outputs/MalaysianIncomeClassification.zkey outputs/m40_witness.wtns proofs/m40_proof.json proofs/m40_public.json
echo "✅ M40 Proof generated: $(cat proofs/m40_public.json)"

echo ""
echo "🧪 Testing T20 case (RM 15,000 - No Subsidy)..."
node outputs/MalaysianIncomeClassification_js/generate_witness.js outputs/MalaysianIncomeClassification_js/MalaysianIncomeClassification.wasm inputs/t20_case.json outputs/t20_witness.wtns
snarkjs groth16 prove outputs/MalaysianIncomeClassification.zkey outputs/t20_witness.wtns proofs/t20_proof.json proofs/t20_public.json
echo "✅ T20 Proof generated: $(cat proofs/t20_public.json)"

echo ""
echo "🔍 Verifying all proofs..."
snarkjs groth16 verify outputs/malaysian_verification_key.json proofs/b40_public.json proofs/b40_proof.json
echo "✅ B40 proof verified successfully"

snarkjs groth16 verify outputs/malaysian_verification_key.json proofs/m40_public.json proofs/m40_proof.json
echo "✅ M40 proof verified successfully"

snarkjs groth16 verify outputs/malaysian_verification_key.json proofs/t20_public.json proofs/t20_proof.json
echo "✅ T20 proof verified successfully"

echo ""
echo "🎉 All Malaysian income classification proofs generated and verified!"
echo "📊 Results:"
echo "   B40 (≤RM4,850): $(cat proofs/b40_public.json) - Full Subsidy"
echo "   M40 (RM4,851-10,970): $(cat proofs/m40_public.json) - Partial Subsidy"
echo "   T20 (>RM10,970): $(cat proofs/t20_public.json) - No Subsidy"
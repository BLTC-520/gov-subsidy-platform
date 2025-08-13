#!/bin/bash

# exit on error
set -e

# Create output directories if missing
mkdir -p outputs proofs inputs

# Compile circuit
# -l node_modules -> tells Circom to look inside node_modules when resolving include directives.
circom circuits/salaryClassifier.circom --r1cs --wasm --sym -o outputs/ -l node_modules

# Download Powers of Tau files
if [ ! -f "outputs/pot10.ptau" ]; then
    echo "Downloading Powers of Tau file."
    wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_10.ptau -O outputs/pot10.ptau
else
    echo "Powers of Tau file already exists, skipping download..."
fi

# force download, will replace the existing Powers of Tau files
# wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_10.ptau -O outputs/pot10.ptau

# Generate keys
snarkjs groth16 setup outputs/salaryClassifier.r1cs outputs/pot10.ptau outputs/salaryClassifier.zkey

# Export verification key
snarkjs zkey export verificationkey outputs/salaryClassifier.zkey outputs/verification_key.json

# Generate witness
node outputs/salaryClassifier_js/generate_witness.js outputs/salaryClassifier_js/salaryClassifier.wasm inputs/input.json outputs/witness.wtns

# Generate proof
snarkjs groth16 prove outputs/salaryClassifier.zkey outputs/witness.wtns proofs/proof.json proofs/public.json

# verify the proof
# To test that the output is derived from the proof, change the value in public.json and see what will happen? 
# [ERROR] snarkJS: Invalid proof
snarkjs groth16 verify outputs/verification_key.json proofs/public.json proofs/proof.json

echo "✅ Proof generation and verification completed successfully! -> Look at proofs/public.json for verfication!" 
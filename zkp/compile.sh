#!/bin/bash

# exit on error
set -e

# Create output directories if missing
mkdir -p outputs proofs inputs

# install circomlib

# Compile circuit
# -l ../node_modules -> tells Circom to look inside ../node_modules when resolving include directives.
circom circuits/SalaryCheck.circom --r1cs --wasm --sym -o outputs/ -l node_modules

# Download Powers of Tau files
wget -nc https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_10.ptau -O outputs/pot10.ptau

# Generate keys
snarkjs groth16 setup outputs/SalaryCheck.r1cs outputs/pot10.ptau outputs/SalaryCheck.zkey

# Export verification key
snarkjs zkey export verificationkey outputs/SalaryCheck.zkey outputs/verification_key.json

# Generate witness
node outputs/SalaryCheck_js/generate_witness.js outputs/SalaryCheck_js/SalaryCheck.wasm inputs/input.json outputs/witness.wtns

# Generate proof
snarkjs groth16 prove outputs/SalaryCheck.zkey outputs/witness.wtns proofs/proof.json proofs/public.json

# verify the proof 
snarkjs groth16 verify outputs/verification_key.json proofs/public.json proofs/proof.json



#!/bin/bash
set -e

echo "Cleaning up generated ZKP build files..."

# Remove compiled outputs
rm -rf outputs/*

# Remove proofs
rm -rf proofs/*

# Remove witness files if any outside outputs/
rm -f outputs/witness.wtns

echo "Cleanup complete."

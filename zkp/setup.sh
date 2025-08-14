#!/bin/bash

echo "Setting up ZK Circuit Environment..."

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

# Check if node_modules/circomlib exists
if [ ! -d "node_modules/circomlib" ]; then
    echo "📦 Installing circomlib..."
    npm install circomlib
fi

# Create outputs directory
mkdir -p outputs

echo "✅ ZK environment setup complete!"
echo "📋 Available commands:"
echo "  circom --version: $(circom --version 2>/dev/null || echo 'Not available')"
echo "  snarkjs --version: $(snarkjs --version 2>/dev/null || echo 'Not available')"
echo ""
echo "🚀 You can now start the backend services:"
echo "  Backend ZK Service: cd ../backend && npm install && npm start"
echo "  Mock LHDN API: cd ../backend/mock-lhdn-api && npm start" 
echo "  Frontend: cd ../frontend && npm run dev"
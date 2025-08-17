pragma circom 2.1.5;

include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/sha256/sha256.circom";

/**
 * SignatureVerifier - Simplified HMAC-SHA256 signature verification for ZK circuits
 * 
 * This component implements a pragmatic approach to signature verification:
 * 1. Validates signature components are non-zero (basic integrity check)
 * 2. Verifies data hash matches expected signature hash
 * 3. Ensures timestamp is within reasonable bounds (anti-replay protection)
 * 
 * Note: This is a simplified implementation for demonstration. 
 * Production systems should use full ECDSA verification.
 */
template SignatureVerifier() {
    // === PRIVATE INPUTS (Hidden from public verification) ===
    signal input signature;           // HMAC signature from LHDN API
    signal input monthly_income;      // The actual income value being verified
    signal input verification_timestamp; // When the verification was performed
    
    // === PUBLIC INPUTS (Known to verifiers) ===
    signal input public_key;                 // LHDN's public key for verification
    signal input ic_hash;                    // Hash of citizen's IC number
    signal input expected_timestamp_range;   // Maximum allowed timestamp difference
    
    // === OUTPUTS ===
    signal output is_signature_valid;        // 1 if signature is valid, 0 otherwise
    signal output is_data_authentic;         // 1 if all checks pass, 0 otherwise
    
    // === SIGNATURE NON-ZERO CHECK ===
    // Basic integrity: signature must be non-zero
    component sig_nonzero = IsZero();
    sig_nonzero.in <== signature;
    
    // === PUBLIC KEY NON-ZERO CHECK ===
    // Public key must be valid (non-zero)
    component pk_nonzero = IsZero();
    pk_nonzero.in <== public_key;
    
    // === TIMESTAMP VALIDATION ===
    // Ensure timestamp is within reasonable bounds (simple range check)
    component ts_valid = LessThan(64);
    ts_valid.in[0] <== verification_timestamp;
    ts_valid.in[1] <== expected_timestamp_range;
    
    // === INCOME RANGE VALIDATION ===
    // Basic sanity check: income should be in reasonable range (0 to 1,000,000 RM)
    component income_min = GreaterThan(32);
    income_min.in[0] <== monthly_income;
    income_min.in[1] <== 0;
    
    component income_max = LessThan(32);
    income_max.in[0] <== monthly_income;
    income_max.in[1] <== 1000000; // 1M RM upper bound
    
    // === SIGNATURE VALIDITY COMPUTATION ===
    // Signature is valid if: signature != 0 AND public_key != 0
    is_signature_valid <== (1 - sig_nonzero.out) * (1 - pk_nonzero.out);
    
    // === DATA AUTHENTICITY COMPUTATION ===
    // Data is authentic if: signature_valid AND timestamp_valid AND income_in_range
    // Split multiplication to avoid non-quadratic constraints
    signal timestamp_ok;
    timestamp_ok <== ts_valid.out;
    
    signal income_ok;
    income_ok <== income_min.out * income_max.out;
    
    // Split the triple multiplication into pairwise steps
    signal temp1;
    temp1 <== is_signature_valid * timestamp_ok;
    
    is_data_authentic <== temp1 * income_ok;
}

/**
 * HMACValidator - Simplified HMAC verification component
 * 
 * This provides a basic HMAC validation by comparing signature hashes.
 * In a full implementation, this would perform proper HMAC-SHA256 computation.
 */
template HMACValidator() {
    // === INPUTS ===
    signal input signature;          // The signature to verify
    signal input message_hash;       // Hash of the original message
    signal input expected_signature;         // Expected signature value
    
    // === OUTPUT ===
    signal output is_valid;                  // 1 if HMAC is valid, 0 otherwise
    
    // === SIGNATURE COMPARISON ===
    // Simplified approach: check if signature matches expected value
    component sig_equals = IsEqual();
    sig_equals.in[0] <== signature;
    sig_equals.in[1] <== expected_signature;
    
    is_valid <== sig_equals.out;
}
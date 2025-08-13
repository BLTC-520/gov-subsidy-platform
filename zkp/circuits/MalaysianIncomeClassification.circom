pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/comparators.circom";

template MalaysianIncomeClassification() {
    // Private input: exact monthly household income in RM
    signal input monthly_income;

    // Public constants: Malaysian income brackets (RM/month)
    // B40: <= 4850, M40: 4851-10970, T20: > 10970
    signal input public_b40_threshold; // 4850
    signal input public_m40_threshold; // 10970

    // Outputs: exactly one will be 1, others will be 0
    signal output is_b40;  // 1 if income <= 4850 (eligible for full subsidy)
    signal output is_m40;  // 1 if 4851 <= income <= 10970 (partial subsidy)
    signal output is_t20;  // 1 if income > 10970 (no subsidy)

    // Comparators for classification
    component cmp_b40 = LessEqThan(64);      // income <= 4850
    component cmp_m40_upper = LessEqThan(64); // income <= 10970
    component cmp_m40_lower = GreaterThan(64); // income > 4850

    // B40 check: income <= b40_threshold
    cmp_b40.in[0] <== monthly_income;
    cmp_b40.in[1] <== public_b40_threshold;
    is_b40 <== cmp_b40.out;

    // M40 check: income > b40_threshold AND income <= m40_threshold
    cmp_m40_lower.in[0] <== monthly_income;
    cmp_m40_lower.in[1] <== public_b40_threshold;
    
    cmp_m40_upper.in[0] <== monthly_income;
    cmp_m40_upper.in[1] <== public_m40_threshold;
    
    // M40 = (income > b40_threshold) AND (income <= m40_threshold)
    is_m40 <== cmp_m40_lower.out * cmp_m40_upper.out;

    // T20 check: income > m40_threshold
    component cmp_t20 = GreaterThan(64);
    cmp_t20.in[0] <== monthly_income;
    cmp_t20.in[1] <== public_m40_threshold;
    is_t20 <== cmp_t20.out;

    // Constraint: exactly one category must be true
    // is_b40 + is_m40 + is_t20 === 1
    component sum_check = IsEqual();
    sum_check.in[0] <== is_b40 + is_m40 + is_t20;
    sum_check.in[1] <== 1;
    sum_check.out === 1;
}

component main = MalaysianIncomeClassification();
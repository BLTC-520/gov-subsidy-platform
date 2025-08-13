pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/comparators.circom";

template SalaryCheck() {
    // Private input: exact salary
    signal input monthly_income;

    // Public input: chosen threshold (e.g., 4000)
    signal input public_threshold;

    // Output: 1 if monthly_income < public_threshold, else 0
    signal output isBelow;

    // Comparator
    component cmp = LessThan(64);
    cmp.in[0] <== monthly_income;
    cmp.in[1] <== public_threshold;

    // Output directly from comparator
    isBelow <== cmp.out;
}

component main = SalaryCheck();

pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/comparators.circom";

template MalaysianIncomeClassifier() {
    // PRIVATE INPUT
    signal input monthly_income;

    // OUTPUT
    signal output class_flags[10]; 
    // Order: B1, B2, B3, B4, M1, M2, M3, M4, T1, T2

    // === HARD-CODED THRESHOLDS for National Level in Ringgit Malaysia (RM) ===
    // Source: https://www.stashaway.my/r/b40-m40-t20-t15-malaysia
    var TH_B1 = 2560;   // upper bound for B1
    var TH_B2 = 3439;   // upper bound for B2
    var TH_B3 = 4309;   // upper bound for B3
    var TH_B4 = 5249;   // upper bound for B4
    var TH_M1 = 6339;   // upper bound for M1
    var TH_M2 = 7689;   // upper bound for M2
    var TH_M3 = 9449;   // upper bound for M3
    var TH_M4 = 11819;  // upper bound for M4
    var TH_T1 = 15869;  // upper bound for T1
    // Above T1 => T2

    // === COMPARATORS ===
    component lt_B1 = LessThan(32);
    lt_B1.in[0] <== monthly_income;
    lt_B1.in[1] <== TH_B1 + 1;

    component lt_B2 = LessThan(32);
    lt_B2.in[0] <== monthly_income;
    lt_B2.in[1] <== TH_B2 + 1;

    component lt_B3 = LessThan(32);
    lt_B3.in[0] <== monthly_income;
    lt_B3.in[1] <== TH_B3 + 1;

    component lt_B4 = LessThan(32);
    lt_B4.in[0] <== monthly_income;
    lt_B4.in[1] <== TH_B4 + 1;

    component lt_M1 = LessThan(32);
    lt_M1.in[0] <== monthly_income;
    lt_M1.in[1] <== TH_M1 + 1;

    component lt_M2 = LessThan(32);
    lt_M2.in[0] <== monthly_income;
    lt_M2.in[1] <== TH_M2 + 1;

    component lt_M3 = LessThan(32);
    lt_M3.in[0] <== monthly_income;
    lt_M3.in[1] <== TH_M3 + 1;

    component lt_M4 = LessThan(32);
    lt_M4.in[0] <== monthly_income;
    lt_M4.in[1] <== TH_M4 + 1;

    component lt_T1 = LessThan(32);
    lt_T1.in[0] <== monthly_income;
    lt_T1.in[1] <== TH_T1 + 1;

    // === ONE-HOT LOGIC ===
    class_flags[0] <== lt_B1.out;                                   // B1
    class_flags[1] <== (1 - lt_B1.out) * lt_B2.out;                 // B2
    class_flags[2] <== (1 - lt_B2.out) * lt_B3.out;                 // B3
    class_flags[3] <== (1 - lt_B3.out) * lt_B4.out;                 // B4
    class_flags[4] <== (1 - lt_B4.out) * lt_M1.out;                 // M1
    class_flags[5] <== (1 - lt_M1.out) * lt_M2.out;                 // M2
    class_flags[6] <== (1 - lt_M2.out) * lt_M3.out;                 // M3
    class_flags[7] <== (1 - lt_M3.out) * lt_M4.out;                 // M4
    class_flags[8] <== (1 - lt_M4.out) * lt_T1.out;                 // T1
    class_flags[9] <== 1 - lt_T1.out;                               // T2
}

component main = MalaysianIncomeClassifier();

// Real formula calculations based on backend EligibilityScoreTool logic
// This implements the same mathematical formulas used in the backend service

interface CitizenData {
  id: string;
  full_name: string | null;
  nric: string | null;
  state: string | null;
  income_bracket: string | null;
  household_size: number;
  number_of_children: number;
  disability_status: boolean;
  is_signature_valid: boolean;
  is_data_authentic: boolean;
  monthly_income: number | null;
}

interface FormulaResult {
  final_score: number;
  base_score: number;
  equivalent_income: number;
  adult_equivalent: number;
  applicant_burden: number;
  burden_ratio: number;
  state_median_burden: number;
  raw_burden_score: number;
  documentation_score: number;
  disability_score: number;
  weighted_burden_75pct: number;
  weighted_documentation_25pct: number;
  component_total: number;
  explanation: string;
  calculation_steps: string[];
}

// State income data (sample from CSV - in real app this would be loaded from backend)
const STATE_INCOME_DATA: Record<string, Record<string, number>> = {
  'Johor': {
    'B1': 2740.0, 'B2': 3803.0, 'B3': 4734.0, 'B4': 5689.0,
    'M1': 6825.0, 'M2': 8168.0, 'M3': 9645.0, 'M4': 11785.0,
    'T1': 15139.0, 'T2': 50049.0
  },
  'Selangor': {
    'B1': 3518.0, 'B2': 4833.0, 'B3': 6048.0, 'B4': 7413.0,
    'M1': 8888.0, 'M2': 10736.0, 'M3': 13019.0, 'M4': 16251.0,
    'T1': 21268.0, 'T2': 69973.0
  },
  'Kuala Lumpur': {
    'B1': 3627.0, 'B2': 4999.0, 'B3': 6272.0, 'B4': 7703.0,
    'M1': 9253.0, 'M2': 11207.0, 'M3': 13613.0, 'M4': 17013.0,
    'T1': 22268.0, 'T2': 73242.0
  },
  'Kedah': {
    'B1': 2035.0, 'B2': 2633.0, 'B3': 3135.0, 'B4': 3723.0,
    'M1': 4366.0, 'M2': 5108.0, 'M3': 6006.0, 'M4': 7338.0,
    'T1': 9859.0, 'T2': 32391.0
  }
};

// National fallback thresholds
const NATIONAL_THRESHOLDS: Record<string, number> = {
  'B1': 2560, 'B2': 3439, 'B3': 4309, 'B4': 5249,
  'M1': 6339, 'M2': 7689, 'M3': 9449, 'M4': 11819,
  'T1': 15869, 'T2': 20000
};

// State median burden values (pre-calculated from HIES data)
const STATE_MEDIAN_BURDENS: Record<string, number> = {
  'Johor': 0.000403,
  'Kedah': 0.000637,
  'Kelantan': 0.000772,
  'Melaka': 0.000448,
  'Negeri Sembilan': 0.000530,
  'Pahang': 0.000593,
  'Perak': 0.000620,
  'Perlis': 0.000600,
  'Pulau Pinang': 0.000430,
  'Sabah': 0.000605,
  'Sarawak': 0.000556,
  'Selangor': 0.000284,
  'Terengganu': 0.000483,
  'Kuala Lumpur': 0.000275,
  'Labuan': 0.000410,
  'Putrajaya': 0.000284,
};

const NATIONAL_MEDIAN_BURDEN = 0.000507;

// Policy-based base scores by income tier
const BASE_SCORES: Record<string, number> = {
  'B1': 70, 'B2': 65, 'B3': 60, 'B4': 55,
  'M1': 45, 'M2': 40, 'M3': 30, 'M4': 20,
  'T1': 10, 'T2': 0
};

// Adult Equivalent weights
const OTHER_ADULT_WEIGHT = 0.5;
const CHILD_WEIGHT = 0.3;

export function calculateFormulaAnalysis(citizenData: CitizenData): FormulaResult {
  const steps: string[] = [];

  // Step 1: Get equivalent income from CSV or fallback
  const state = citizenData.state || 'Unknown';
  const incomeBracket = citizenData.income_bracket || 'B1';

  let equivalentIncome: number;
  if (STATE_INCOME_DATA[state] && STATE_INCOME_DATA[state][incomeBracket]) {
    equivalentIncome = STATE_INCOME_DATA[state][incomeBracket];
    steps.push(`Equivalent income: RM ${equivalentIncome.toLocaleString()} (CSV lookup: ${state} ${incomeBracket})`);
  } else if (NATIONAL_THRESHOLDS[incomeBracket]) {
    equivalentIncome = NATIONAL_THRESHOLDS[incomeBracket];
    steps.push(`Equivalent income: RM ${equivalentIncome.toLocaleString()} (National fallback for ${incomeBracket})`);
  } else {
    equivalentIncome = 5000;
    steps.push(`Equivalent income: RM ${equivalentIncome.toLocaleString()} (Default fallback)`);
  }

  // Step 2: Calculate Adult Equivalent (AE) for household composition
  const householdSize = citizenData.household_size || 1;
  const numberOfChildren = citizenData.number_of_children || 0;
  const adults = Math.max(1, householdSize - numberOfChildren);
  const adultEquivalent = 1 + OTHER_ADULT_WEIGHT * (adults - 1) + CHILD_WEIGHT * numberOfChildren;

  steps.push(`Adult Equivalent = 1 + ${OTHER_ADULT_WEIGHT} × (${adults} - 1) + ${CHILD_WEIGHT} × ${numberOfChildren} = ${adultEquivalent.toFixed(1)}`);

  // Step 3: Calculate applicant burden
  const applicantBurden = equivalentIncome > 0 ? adultEquivalent / equivalentIncome : 0;
  steps.push(`Applicant burden = ${adultEquivalent.toFixed(1)} ÷ ${equivalentIncome} = ${applicantBurden.toFixed(6)}`);

  // Step 4: Get state median burden
  const stateMedianBurden = STATE_MEDIAN_BURDENS[state] || NATIONAL_MEDIAN_BURDEN;
  steps.push(`State median burden (${state}): ${stateMedianBurden.toFixed(6)}`);

  // Step 5: Calculate burden ratio
  const burdenRatio = stateMedianBurden > 0 ? applicantBurden / stateMedianBurden : 1.0;
  steps.push(`Burden ratio = ${applicantBurden.toFixed(6)} ÷ ${stateMedianBurden.toFixed(6)} = ${burdenRatio.toFixed(3)}`);

  // Step 6: Check for disability auto-qualification
  if (citizenData.disability_status) {
    return {
      final_score: 100,
      base_score: 0,
      equivalent_income: equivalentIncome,
      adult_equivalent: adultEquivalent,
      applicant_burden: applicantBurden,
      burden_ratio: burdenRatio,
      state_median_burden: stateMedianBurden,
      raw_burden_score: 0,
      documentation_score: 0,
      disability_score: 100,
      weighted_burden_75pct: 0,
      weighted_documentation_25pct: 0,
      component_total: 0,
      explanation: "Automatic 100% qualification due to disability status",
      calculation_steps: [...steps, "Disability auto-qualification: 100 points (bypasses all calculations)"]
    };
  }

  // Step 7: Apply piecewise burden scoring
  let rawBurdenScore: number;
  if (burdenRatio <= 1.0) {
    rawBurdenScore = 50;
    steps.push(`Burden score: ${burdenRatio.toFixed(3)} ≤ 1.0 → 50 points`);
  } else if (burdenRatio <= 1.2) {
    rawBurdenScore = 70;
    steps.push(`Burden score: 1.0 < ${burdenRatio.toFixed(3)} ≤ 1.2 → 70 points`);
  } else if (burdenRatio <= 1.5) {
    rawBurdenScore = 90;
    steps.push(`Burden score: 1.2 < ${burdenRatio.toFixed(3)} ≤ 1.5 → 90 points`);
  } else {
    rawBurdenScore = 100;
    steps.push(`Burden score: ${burdenRatio.toFixed(3)} > 1.5 → 100 points`);
  }

  // Step 8: Get base score
  const baseScore = BASE_SCORES[incomeBracket] || 0;
  steps.push(`Base score (${incomeBracket}): ${baseScore} points`);

  // Step 9: Calculate documentation score
  const isSignatureValid = citizenData.is_signature_valid;
  const isDataAuthentic = citizenData.is_data_authentic;
  const documentationScore = (isSignatureValid && isDataAuthentic) ? 100 : 0;
  steps.push(`Documentation score: ${isSignatureValid && isDataAuthentic ? 'Both valid' : 'Missing/invalid'} → ${documentationScore} points`);

  // Step 10: Calculate weighted components
  const weightedBurden = rawBurdenScore * 0.75;
  const weightedDocumentation = documentationScore * 0.25;
  const componentTotal = weightedBurden + weightedDocumentation;

  steps.push(`Weighted burden (75%): ${rawBurdenScore} × 0.75 = ${weightedBurden.toFixed(1)}`);
  steps.push(`Weighted documentation (25%): ${documentationScore} × 0.25 = ${weightedDocumentation.toFixed(1)}`);
  steps.push(`Component total: ${weightedBurden.toFixed(1)} + ${weightedDocumentation.toFixed(1)} = ${componentTotal.toFixed(1)}`);

  // Step 11: Calculate final score
  const finalScore = Math.min(100, baseScore + componentTotal);
  steps.push(`Final score = min(100, ${baseScore} + ${componentTotal.toFixed(1)}) = ${finalScore.toFixed(1)}`);

  const explanation = `Final score ${finalScore.toFixed(1)} calculated using state-specific burden analysis. ` +
    `Equivalent income RM ${equivalentIncome.toLocaleString()} from ${state} ${incomeBracket}. ` +
    `Adult equivalent ${adultEquivalent.toFixed(1)} for ${householdSize}-person household. ` +
    `Burden ratio ${burdenRatio.toFixed(3)} vs state median ${stateMedianBurden.toFixed(6)}.`;

  return {
    final_score: Math.round(finalScore * 10) / 10,
    base_score: baseScore,
    equivalent_income: equivalentIncome,
    adult_equivalent: Math.round(adultEquivalent * 10) / 10,
    applicant_burden: applicantBurden,
    burden_ratio: Math.round(burdenRatio * 1000) / 1000,
    state_median_burden: stateMedianBurden,
    raw_burden_score: rawBurdenScore,
    documentation_score: documentationScore,
    disability_score: citizenData.disability_status ? 100 : 0,
    weighted_burden_75pct: Math.round(weightedBurden * 10) / 10,
    weighted_documentation_25pct: Math.round(weightedDocumentation * 10) / 10,
    component_total: Math.round(componentTotal * 10) / 10,
    explanation,
    calculation_steps: steps
  };
}

export function getEligibilityClass(incomeBracket: string): string {
  const bracketMapping: Record<string, string> = {
    'B1': 'B40', 'B2': 'B40', 'B3': 'B40', 'B4': 'B40',
    'M1': 'M40-M1', 'M2': 'M40-M1',
    'M3': 'M40-M2', 'M4': 'M40-M2',
    'T1': 'T20', 'T2': 'T20'
  };

  return bracketMapping[incomeBracket] || 'Unknown';
}
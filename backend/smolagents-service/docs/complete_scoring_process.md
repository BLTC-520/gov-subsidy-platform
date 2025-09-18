# Complete Citizen Eligibility Scoring Process

## Overview
This document describes the end-to-end process for calculating a citizen's eligibility score using the FYP approach with state median burden methodology.

## Input Data Required

```json
{
    "citizen_id": "123456789",
    "state": "Selangor",
    "income_bracket": "B3",
    "household_size": 4,
    "number_of_children": 2,
    "is_signature_valid": true,
    "is_data_authentic": true,
    "disability_status": false
}
```

## Step-by-Step Calculation Process

### Step 1: Calculate Adult Equivalent (AE)

**Formula:**
```
AE = 1 + 0.5 × (Adults - 1) + 0.3 × Children
```

**Calculation:**
```python
# Extract household composition
household_size = 4
number_of_children = 2
adults = household_size - number_of_children  # = 2

# Apply AE formula
AE = 1 + 0.5 * (adults - 1) + 0.3 * number_of_children
AE = 1 + 0.5 * (2 - 1) + 0.3 * 2
AE = 1 + 0.5 + 0.6
AE = 2.1
```

**Result:** Adult Equivalent = 2.1

### Step 2: Get Equivalent Income from CSV Data

**Process:**
1. Look up state + income bracket in HIES CSV data
2. Apply state name mapping if needed
3. Fallback to national thresholds if CSV lookup fails

**Calculation:**
```python
# CSV lookup
state = "Selangor"
income_bracket = "B3"
equivalent_income = csv_lookup(state, income_bracket)  # Returns RM6,998

# State mapping (if needed)
mapped_state = state_name_mapping.get("Kuala Lumpur", "W.P. Kuala Lumpur")

# Fallback (if CSV fails)
if not found:
    equivalent_income = national_thresholds["B3"]  # RM4,309
```

**Result:** Equivalent Income = RM6,998 (Selangor B3 from CSV)

### Step 3: Calculate Applicant Burden

**Formula:**
```
Applicant Burden = AE / Equivalent Income
```

**Calculation:**
```python
applicant_burden = AE / equivalent_income
applicant_burden = 2.1 / 6998
applicant_burden = 0.000300
```

**Result:** Applicant Burden = 0.000300

### Step 4: Get State Median Burden (Reference)

**Pre-calculated State Medians (AE = 3.0):**

| State                | Median Burden | Economic Context        |
|----------------------|---------------|-------------------------|
| W.P. Putrajaya       |    0.000216   | Richest (admin capital) |
| W.P. Kuala Lumpur    |    0.000263   | Very wealthy (capital)  |
| Selangor             |    0.000284   | Wealthy (industrial)    |
| Pulau Pinang         |    0.000329   | Tourism, urban          |
| Terengganu           |    0.000334   | Oil-rich state          |
| W.P. Labuan          |    0.000359   | Federal territory       |
| Melaka               |    0.000362   | Small, mixed economy    |
| Negeri Sembilan      |    0.000389   | Mixed urban-rural       |
| Johor                |    0.000403   | Industrial state        |
| Sarawak              |    0.000442   | East Malaysia, mixed    |
| Perak                |    0.000456   | Mining, agriculture     |
| Kedah                |    0.000458   | Agricultural state      |
| Pahang               |    0.000467   | Large rural state       |
| Perlis               |    0.000476   | Smallest state          |
| Sabah                |    0.000528   | East Malaysia, rural    |
| Kelantan             |    0.000558   | Poorest state           |

**Lookup:**
```python
state_median_burden = state_median_burdens["Selangor"]  # 0.000284
```

**Result:** State Median Burden = 0.000284

### Step 5: Calculate Burden Ratio

**Formula:**
```
Burden Ratio (BR) = Applicant Burden / State Median Burden
```

**Calculation:**
```python
burden_ratio = applicant_burden / state_median_burden
burden_ratio = 0.000300 / 0.000284
burden_ratio = 1.056
```

**Interpretation:**
- BR > 1.0: Household is more burdened than state median
- BR < 1.0: Household is less burdened than state median
- BR = 1.0: Household burden equals state median

**Result:** Burden Ratio = 1.056 (above state median)

### Step 6: Apply Piecewise Raw Burden Scoring

**FYP Thresholds:**
```python
def calculate_raw_burden_score(burden_ratio):
    if burden_ratio <= 1.0:
        return 50      # Below or equal to median
    elif burden_ratio <= 1.2:
        return 70      # Moderately above median
    elif burden_ratio <= 1.5:
        return 90      # Significantly above median
    else:
        return 100     # Much higher than median
```

**Calculation:**
```python
# BR = 1.056 falls in range: 1.0 < BR <= 1.2
raw_burden_score = 70
```

**Result:** Raw Burden Score = 70

### Step 7: Normalize Burden Score (0-100 Range)

**Formula:**
```
Normalized Burden Score = (Raw Score - 50) / 50 × 100
```

**Calculation:**
```python
normalized_burden_score = (raw_burden_score - 50) / 50 * 100
normalized_burden_score = (70 - 50) / 50 * 100
normalized_burden_score = 20 / 50 * 100
normalized_burden_score = 40
```

**Result:** Normalized Burden Score = 40

### Step 8: Calculate Base Score by Income Tier

**Policy-Based Base Scores:**
```python
base_scores = {
    'B40': 60,      # B1, B2, B3, B4 (bottom 40%)
    'M40-M1': 40,   # M1, M2 (middle 40% lower)
    'M40-M2': 20,   # M3, M4 (middle 40% upper)
    'T20': 0        # T1, T2 (top 20%)
}
```

**Calculation:**
```python
income_bracket = "B3"
eligibility_class = get_eligibility_class(income_bracket)  # "B40"
base_score = base_scores[eligibility_class]  # 60
```

**Result:** Base Score = 60

### Step 9: Calculate Documentation Score

**Documentation Check (All-or-Nothing):**
```python
is_signature_valid = true
is_data_authentic = true

# All-or-nothing logic: both must be true for full points
if is_signature_valid and is_data_authentic:
    documentation_score = 25    # Full 25% weight
else:
    documentation_score = 0     # No points if either invalid
```

**Calculation:**
```python
# Both signature and data are valid
documentation_score = 25
```

**Result:** Documentation Score = 25

### Step 10: Calculate Final Score (New Weighted Formula)

**Updated Formula:**
```
Final Score = min(100, (0.75 × Burden Score + 0.25 × Documentation Score) + Base Score)
```

**Note:** 
- **Disability Status**: All citizens with disability automatically qualify for subsidies (handled at policy level)
- **Stability Bonus**: Removed - base score provides sufficient policy floor
- **Documentation**: Now weighted as 25% of the burden component

**Calculation:**
```python
# Apply new weighted formula
weighted_component = (0.75 * normalized_burden_score) + (0.25 * documentation_score)
weighted_component = (0.75 * 40) + (0.25 * 25)
weighted_component = 30 + 6.25
weighted_component = 36.25

# Add base score and cap at 100
final_score = min(100, weighted_component + base_score)
final_score = min(100, 36.25 + 60)
final_score = min(100, 96.25)
final_score = 96.25
```

**Result:** Final Score = 96.25

## Complete Example Summary

| Step | Component | Value | Calculation |
|------|-----------|-------|-------------|
| 1 | Adult Equivalent (AE) | 2.1 | 1 + 0.5×(2-1) + 0.3×2 |
| 2 | Equivalent Income | RM6,998 | CSV lookup: Selangor B3 |
| 3 | Applicant Burden | 0.000300 | 2.1 / 6998 |
| 4 | State Median Burden | 0.000284 | Pre-calculated: Selangor |
| 5 | Burden Ratio | 1.056 | 0.000300 / 0.000284 |
| 6 | Raw Burden Score | 70 | 1.0 < 1.056 ≤ 1.2 → 70 |
| 7 | Normalized Burden | 40 | (70-50)/50×100 |
| 8 | Base Score | 60 | B3 → B40 → 60 points |
| 9 | Documentation Score | 25 | Valid docs → full 25 points |
| 10 | Weighted Component | 36.25 | 0.75×40 + 0.25×25 |
| **Final** | **Total Score** | **96.25** | **min(100, 36.25+60)** |

## Audit Trail Information

**For compliance and transparency, log:**
- Input data (citizen_id, state, bracket, household composition)
- AE calculation details
- CSV lookup results and fallbacks used
- State median burden reference value
- Burden ratio calculation
- All scoring thresholds applied
- Documentation validation results
- Weighted component calculation
- Final score calculation with capping

**Example Audit Log:**
```json
{
    "timestamp": "2024-01-15T10:30:00Z",
    "citizen_id": "123456789",
    "calculation_details": {
        "adult_equivalent": 2.1,
        "equivalent_income": 6998,
        "applicant_burden": 0.000300,
        "state_median_burden": 0.000284,
        "burden_ratio": 1.056,
        "raw_burden_score": 70,
        "normalized_burden_score": 40,
        "base_score": 60,
        "documentation_score": 25,
        "weighted_component": 36.25,
        "final_score": 96.25
    },
    "policy_notes": {
        "disability_auto_qualify": "Citizens with disability status automatically qualify for subsidies",
        "documentation_weight": "25% of burden component (0.25 × 25 = 6.25 points)",
        "burden_weight": "75% of burden component (0.75 × 40 = 30 points)"
    },
    "data_sources": {
        "csv_lookup": "Selangor B3 = RM6,998",
        "state_median": "Selangor = 0.000284",
        "methodology": "FYP_approach_v2.0_simplified"
    }
}
```

## Key Advantages of This Simplified Approach

1. **Statistically Valid**: Uses real HIES data and proper median calculations
2. **State-Aware**: Accounts for regional economic differences  
3. **Policy Compliant**: Base scores ensure B40 households get minimum support
4. **Simplified Weighting**: Clear 75% burden + 25% documentation formula
5. **Disability Inclusive**: Automatic qualification removes scoring complexity
6. **Transparent**: Every step is documented and auditable
7. **Consistent**: Same methodology produces same results
8. **Academically Defensible**: Based on established equivalence scale research

## Policy Changes Summary

### ✅ **Simplified (New Approach)**
- **Final Score**: `min(100, (0.75 × Burden + 0.25 × Documentation) + Base Score)`
- **Disability**: Automatic qualification (handled at policy level)
- **Documentation**: 25% weight in burden component (0 or 25 points)
- **No Stability Bonus**: Base score provides sufficient policy floor

### ❌ **Removed Complexity**
- ~~Separate disability scoring (20% weight)~~
- ~~Documentation penalty system~~
- ~~Stability bonus logic~~
- ~~Complex adjustment calculations~~

This creates a **cleaner, more understandable system** while maintaining academic rigor and policy compliance.
# Citizen Eligibility Score Calculation Examples

## Scenario A: Small Urban Family (Selangor)

### Input Data
- **Location**: Selangor
- **Composition**: 2 adults + 2 children (4 total members)
- **Monthly Income**: RM5,000
- **Income Bracket**: B3 (estimated)
- **Documentation**: Valid (signature + data authentic)
- **Disability**: None

### Step-by-Step Calculation

#### Step 1: Adult Equivalent (AE)
```
AE = 1 + 0.5 × (Adults - 1) + 0.3 × Children
AE = 1 + 0.5 × (2 - 1) + 0.3 × 2
AE = 1 + 0.5 + 0.6 = 2.1
```

#### Step 2: Equivalent Income (CSV Lookup)
```
State: Selangor, Bracket: B3
Equivalent Income = RM6,998 (from HIES data)
```

#### Step 3: Applicant Burden
```
Applicant Burden = AE ÷ Equivalent Income
Applicant Burden = 2.1 ÷ 6,998 = 0.000300
```

#### Step 4: State Median Burden
```
Selangor Median Burden = 0.000284 (pre-calculated)
```

#### Step 5: Burden Ratio
```
Burden Ratio = Applicant Burden ÷ State Median Burden
Burden Ratio = 0.000300 ÷ 0.000284 = 1.056
```

#### Step 6: Raw Burden Score (Piecewise)
```
Since 1.0 < 1.057 ≤ 1.2 → Raw Score = 70
```

#### Step 7: Raw Burden Score (No Normalization)
```
Raw Burden Score = 70 (used directly in final calculation)
```

#### Step 8: Base Score
```
Income Bracket B3 → Eligibility Class B40 → Base Score = 60
```

#### Step 9: Documentation Score
```
Valid signature + Valid data → Documentation Score = 25
```

#### Step 10: Final Score
```
Weighted Component = 0.75 × Burden + 0.25 × Documentation
Weighted Component = 0.75 × 70 + 0.25 × 25 = 52.5 + 6.25 = 58.75

Final Score = min(100, Weighted Component + Base Score)
Final Score = min(100, 58.75 + 60) = 100 (capped)
```

### **Result: 100 points**

---

## Scenario B: Large Extended Family (Selangor)

### Input Data
- **Location**: Selangor
- **Composition**: 2 adults + 5 children (7 total members)
- **Monthly Income**: RM6,000
- **Income Bracket**: B4 (estimated)
- **Documentation**: Valid (signature + data authentic)
- **Disability**: None

### Step-by-Step Calculation

#### Step 1: Adult Equivalent (AE)
```
AE = 1 + 0.5 × (Adults - 1) + 0.3 × Children
AE = 1 + 0.5 × (2 - 1) + 0.3 × 5
AE = 1 + 0.5 + 1.5 = 3.0
```

#### Step 2: Equivalent Income (CSV Lookup)
```
State: Selangor, Bracket: B4
Equivalent Income = RM8,312 (from HIES data)
```

#### Step 3: Applicant Burden
```
Applicant Burden = AE ÷ Equivalent Income
Applicant Burden = 3.0 ÷ 8,312 = 0.000361
```

#### Step 4: State Median Burden
```
Selangor Median Burden = 0.000284 (pre-calculated)
```

#### Step 5: Burden Ratio
```
Burden Ratio = Applicant Burden ÷ State Median Burden
Burden Ratio = 0.000361 ÷ 0.000284 = 1.271
```

#### Step 6: Raw Burden Score (Piecewise)
```
Since 1.2 < 1.271 ≤ 1.5 → Raw Score = 90
```

#### Step 7: Raw Burden Score (No Normalization)
```
Raw Burden Score = 90 (used directly in final calculation)
```

#### Step 8: Base Score
```
Income Bracket B4 → Eligibility Class B40 → Base Score = 60
```

#### Step 9: Documentation Score
```
Valid signature + Valid data → Documentation Score = 25
```

#### Step 10: Final Score
```
Weighted Component = 0.75 × Burden + 0.25 × Documentation
Weighted Component = 0.75 × 90 + 0.25 × 25 = 67.5 + 6.25 = 73.75

Final Score = min(100, Weighted Component + Base Score)
Final Score = min(100, 73.75 + 60) = 100 (capped)
```

### **Result: 100 points**

---

## Summary Comparison

| Component | Scenario A | Scenario B |
|-----------|------------|------------|
| **Adult Equivalent** | 2.1 | 3.0 |
| **Equivalent Income** | RM6,998 | RM8,312 |
| **Burden Ratio** | 1.056 | 1.271 |
| **Normalized Burden** | 40 | 80 |
| **Base Score** | 60 | 60 |
| **Documentation** | 25 | 25 |
| **Weighted Component** | 36.25 | 66.25 |
| **Final Score** | **96.25** | **100** |

---

## Scenario C: Large Wealthy Family (Kelantan)

### Input Data
- **Location**: Kelantan
- **Composition**: 2 adults + 6 children (8 total members)
- **Monthly Income**: High income (T2 bracket)
- **Income Bracket**: T2 (top 20%)
- **Documentation**: Valid (signature + data authentic)
- **Disability**: None

### Step-by-Step Calculation

#### Step 1: Adult Equivalent (AE)
```
AE = 1 + 0.5 × (Adults - 1) + 0.3 × Children
AE = 1 + 0.5 × (2 - 1) + 0.3 × 6
AE = 1 + 0.5 + 1.8 = 3.3
```

#### Step 2: Equivalent Income (CSV Lookup)
```
State: Kelantan, Bracket: T2
Equivalent Income = RM27,731 (from HIES data)
```

#### Step 3: Applicant Burden
```
Applicant Burden = AE ÷ Equivalent Income
Applicant Burden = 3.3 ÷ 27,731 = 0.000119
```

#### Step 4: State Median Burden
```
Kelantan Median Burden = 0.000558 (pre-calculated)
```

#### Step 5: Burden Ratio
```
Burden Ratio = Applicant Burden ÷ State Median Burden
Burden Ratio = 0.000119 ÷ 0.000558 = 0.213
```

#### Step 6: Raw Burden Score (Piecewise)
```
Since 0.154 ≤ 1.0 → Raw Score = 50
```

#### Step 7: Raw Burden Score (No Normalization)
```
Raw Burden Score = 50 (used directly in final calculation)
```

#### Step 8: Base Score
```
Income Bracket T2 → Eligibility Class T20 → Base Score = 0
```

#### Step 9: Documentation Score
```
Valid signature + Valid data → Documentation Score = 25
```

#### Step 10: Final Score
```
Weighted Component = 0.75 × Burden + 0.25 × Documentation
Weighted Component = 0.75 × 50 + 0.25 × 25 = 37.5 + 6.25 = 43.75

Final Score = min(100, Weighted Component + Base Score)
Final Score = min(100, 43.75 + 0) = 43.75
```

### **Result: 43.75 points**

---

## Scenario D: Single Person (Johor)

### Input Data
- **Location**: Johor
- **Composition**: 1 adult + 0 children (1 total member)
- **Monthly Income**: Low income (estimated B1 bracket)
- **Income Bracket**: B1 (bottom tier)
- **Documentation**: Valid (signature + data authentic)
- **Disability**: None

### Step-by-Step Calculation

#### Step 1: Adult Equivalent (AE)
```
AE = 1 + 0.5 × (Adults - 1) + 0.3 × Children
AE = 1 + 0.5 × (1 - 1) + 0.3 × 0
AE = 1 + 0 + 0 = 1.0
```

#### Step 2: Equivalent Income (CSV Lookup)
```
State: Johor, Bracket: B1
Equivalent Income = RM2,740 (from HIES data)
```

#### Step 3: Applicant Burden
```
Applicant Burden = AE ÷ Equivalent Income
Applicant Burden = 1.0 ÷ 2,740 = 0.000365
```

#### Step 4: State Median Burden
```
Johor Median Burden = 0.000403 (pre-calculated)
```

#### Step 5: Burden Ratio
```
Burden Ratio = Applicant Burden ÷ State Median Burden
Burden Ratio = 0.000365 ÷ 0.000403 = 0.906
```

#### Step 6: Raw Burden Score (Piecewise)
```
Since 0.906 ≤ 1.0 → Raw Score = 50
```

#### Step 7: Raw Burden Score (No Normalization)
```
Raw Burden Score = 50 (used directly in final calculation)
```

#### Step 8: Base Score
```
Income Bracket B1 → Eligibility Class B40 → Base Score = 60
```

#### Step 9: Documentation Score
```
Valid signature + Valid data → Documentation Score = 25
```

#### Step 10: Final Score
```
Weighted Component = 0.75 × Burden + 0.25 × Documentation
Weighted Component = 0.75 × 50 + 0.25 × 25 = 37.5 + 6.25 = 43.75

Final Score = min(100, Weighted Component + Base Score)
Final Score = min(100, 43.75 + 60) = 100 (capped)
```

### **Result: 100 points**

---

## Complete Summary Comparison

| Component | Scenario A<br/>Small Family | Scenario B<br/>Large Family | Scenario C<br/>Wealthy Large | Scenario D<br/>Single Poor |
|-----------|------------|------------|------------|------------|
| **Location** | Selangor | Selangor | Kelantan | Johor |
| **Household Size** | 4 | 7 | 8 | 1 |
| **Income Bracket** | B3 | B4 | T2 | B1 |
| **Adult Equivalent** | 2.1 | 3.0 | 3.3 | 1.0 |
| **Equivalent Income** | RM6,998 | RM8,312 | RM27,731 | RM2,740 |
| **State Median** | 0.000284 | 0.000284 | 0.000772 | 0.000403 |
| **Burden Ratio** | 1.057 | 1.271 | 0.154 | 0.906 |
| **Raw Burden Score** | 70 | 90 | 50 | 50 |
| **Base Score** | 60 | 60 | 0 | 60 |
| **Documentation** | 25 | 25 | 25 | 25 |
| **Weighted Component** | 58.75 | 73.75 | 43.75 | 43.75 |
| **Final Score** | **100** | **100** | **43.75** | **100** |

### Key Insights
- **Scenario A & B**: B40 families with maximum scores (100) - qualify for subsidies
- **Scenario C**: Wealthy large family (43.75) - moderate score despite large size due to high income
- **Scenario D**: Poor single person (100) - benefits from B40 base score, reaches maximum
- **State differences**: Kelantan (poorer state) has higher median burden threshold (0.000772 vs 0.000284)
- **Base score impact**: Critical for B40 households, ensures minimum support
- **FYP Formula**: Uses raw burden scores (50/70/90/100) directly, no normalization needed
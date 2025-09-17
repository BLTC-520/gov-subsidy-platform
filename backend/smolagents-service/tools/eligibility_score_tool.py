"""
EligibilityScoreTool - Burden-based eligibility scoring with CSV state income data.

This tool implements a sophisticated burden-based scoring approach:
- Privacy-preserving equivalent income lookup from CSV data
- Adult Equivalent (AE) calculation for household composition
- Burden ratio comparison within state-specific income tiers
- Final weighted scoring: Burden 55%, Documentation 25%, Disability 20%

Compatible with ZK-SNARK income verification (uses income brackets, not actual amounts).
"""

import os
import csv
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from dataclasses import dataclass

import pandas as pd
from smolagents import Tool


@dataclass
class BurdenCalculationResult:
    """Detailed burden calculation result for transparency"""
    equivalent_income: float
    adult_equivalent: float
    applicant_burden: float
    reference_burden: float
    burden_ratio: float
    tier_range: str
    score: float
    confidence: float


@dataclass
class ScoringBreakdown:
    """Complete scoring breakdown for audit trail"""
    burden_score: float
    documentation_score: float
    disability_score: float
    weighted_components: Dict[str, float]
    final_score: float
    missing_fields: List[str]
    equivalent_income: float
    adult_equivalent: float
    burden_ratio: float


class EligibilityScoreTool(Tool):
    """
    Burden-based eligibility scoring tool with state-aware income equivalents.
    
    Architecture Level: ☆☆☆ Simple Processor (Pure mathematical calculations, no LLM)
    
    Key Features:
    - Privacy-preserving: Works with ZK-SNARK income bracket classification
    - State-aware: Uses CSV state income distribution data
    - Household-sensitive: Adult Equivalent calculation for family composition
    - Policy-compliant: Based on official Malaysian HIES data
    - Audit-ready: Complete transparency and breakdown
    
    Requirements Addressed:
    - Requirement 1.4: Numerical score based on analysis results
    - Requirement 4.3: Scoring included in output
    """
    
    name = "eligibility_scorer"
    description = "Calculates weighted eligibility scores using burden-based approach with state income data"
    output_type = "object"
    
    inputs = {
        "applicant_data": {
            "type": "object",
            "description": "Citizen data including state, income_bracket, household_size, etc."
        },
        "scoring_config": {
            "type": "object", 
            "description": "Optional scoring configuration overrides",
            "nullable": True
        }
    }
    
    outputs = {
        "final_score": {"type": "number", "description": "Final weighted eligibility score (0-100)"},
        "breakdown": {"type": "object", "description": "Detailed component score breakdown"},
        "equivalent_income": {"type": "number", "description": "CSV lookup equivalent income"},
        "adult_equivalent": {"type": "number", "description": "Household composition adjustment factor"},
        "burden_ratio": {"type": "number", "description": "Burden comparison ratio"},
        "missing_fields": {"type": "array", "description": "List of missing required fields"},
        "audit_trail": {"type": "object", "description": "Complete audit information"}
    }
    
    def __init__(self, csv_file_path: Optional[str] = None):
        """Initialize scoring tool with FYP state median burden approach"""
        super().__init__()
        self.logger = logging.getLogger(__name__)
        
        # Load CSV state income data
        self.csv_file_path = csv_file_path or os.path.join(
            os.path.dirname(__file__), "..", "docs", "data_cleaning", "hies_cleaned_state_percentile.csv"
        )
        self.state_income_data = self._load_csv_data()
        
        # National fallback thresholds from MalaysianIncomeClassifier.circom
        self.national_thresholds = {
            'B1': 2560, 'B2': 3439, 'B3': 4309, 'B4': 5249,
            'M1': 6339, 'M2': 7689, 'M3': 9449, 'M4': 11819,
            'T1': 15869, 'T2': 20000
        }
        
        # FYP: State median burden values (calculated from HIES data, AE=3.0)
        self.state_median_burdens = {
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
            'W.P. Kuala Lumpur': 0.000275,
            'W.P. Labuan': 0.000410,
            'W.P. Putrajaya': 0.000284,
        }
        
        # National fallback median
        self.national_median_burden = 0.000507
        
        # Fixed Adult Equivalent weights
        self.OTHER_ADULT_WEIGHT = 0.5
        self.CHILD_WEIGHT = 0.3
        
        # FYP: Policy-based base scores by income tier
        self.base_scores = {
            'B40': 60,      # B1, B2, B3, B4
            'M40-M1': 40,   # M1, M2  
            'M40-M2': 20,   # M3, M4
            'T20': 0        # T1, T2
        }
        
        # Income bracket to eligibility class mapping
        self.bracket_to_class = {
            'B1': 'B40', 'B2': 'B40', 'B3': 'B40', 'B4': 'B40',
            'M1': 'M40-M1', 'M2': 'M40-M1',
            'M3': 'M40-M2', 'M4': 'M40-M2',
            'T1': 'T20', 'T2': 'T20'
        }
        
        # Required fields for scoring
        self.required_fields = [
            'state', 'income_bracket', 'household_size', 'number_of_children'
        ]
        
        # State name mapping - Frontend to CSV format
        self.state_name_mapping = {
            'Kuala Lumpur': 'W.P. Kuala Lumpur',
            'Labuan': 'W.P. Labuan', 
            'Putrajaya': 'W.P. Putrajaya'
        }
        
        # Scoring statistics for monitoring
        self.scoring_stats = {
            'total_scores_calculated': 0,
            'csv_lookups_successful': 0,
            'national_fallback_used': 0,
            'missing_data_cases': 0
        }
    
    def _load_csv_data(self) -> Dict[str, Dict[str, float]]:
        """Load and index CSV state income data for fast lookup"""
        try:
            data = {}
            with open(self.csv_file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    state = row['state']
                    income_group = row['income_group']
                    income = float(row['income']) if row['income'] else None
                    
                    if state not in data:
                        data[state] = {}
                    
                    if income is not None:  # Skip rows with empty income
                        data[state][income_group] = income
            
            self.logger.info(f"Loaded CSV data for {len(data)} states")
            return data
            
        except FileNotFoundError:
            self.logger.error(f"CSV file not found: {self.csv_file_path}")
            return {}
        except Exception as e:
            self.logger.error(f"Error loading CSV data: {e}")
            return {}
    
    def forward(
        self,
        applicant_data: Dict[str, Any],
        scoring_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main scoring method implementing burden-based approach.
        
        Args:
            applicant_data: Dictionary containing citizen information
            scoring_config: Optional configuration overrides
            
        Returns:
            Complete scoring result with breakdown and audit trail
        """
        scoring_start_time = datetime.now()
        self.scoring_stats['total_scores_calculated'] += 1
        
        try:
            # Validate and extract required fields
            missing_fields = self._check_missing_fields(applicant_data)
            
            # FYP: Calculate final score using corrected formula
            burden_result = self._calculate_burden_score(applicant_data)
            
            # Final score is already calculated in burden_result.score
            final_score = burden_result.score
            
            # Get component scores for breakdown
            documentation_score = self._calculate_documentation_score(applicant_data)
            disability_score = self._calculate_disability_score(applicant_data)
            
            # Create FYP breakdown with correct formula components
            base_score = self._get_base_score(applicant_data.get('income_bracket', ''))
            
            # Check if this was a disability auto-qualification
            if burden_result.tier_range == "Disability Auto-Qualification":
                breakdown = ScoringBreakdown(
                    burden_score=0,
                    documentation_score=0,
                    disability_score=100,
                    weighted_components={
                        'disability_auto_qualify': True,
                        'base_score': base_score,
                        'final_score': 100
                    },
                    final_score=100,
                    missing_fields=missing_fields,
                    equivalent_income=burden_result.equivalent_income,
                    adult_equivalent=burden_result.adult_equivalent,
                    burden_ratio=burden_result.burden_ratio
                )
            else:
                raw_burden_score = self._calculate_raw_burden_score(burden_result.burden_ratio)
                
                # Calculate weighted components (no disability bonus)
                weighted_burden = raw_burden_score * 0.75
                weighted_documentation = documentation_score * 0.25
                component_total = weighted_burden + weighted_documentation
            
                breakdown = ScoringBreakdown(
                    burden_score=raw_burden_score,
                    documentation_score=documentation_score,
                    disability_score=disability_score,
                    weighted_components={
                        'disability_auto_qualify': False,
                        'base_score': base_score,
                        'raw_burden_score': raw_burden_score,
                        'weighted_burden_75pct': weighted_burden,
                        'weighted_documentation_25pct': weighted_documentation,
                        'component_total': component_total,
                        'final_score_capped': final_score
                    },
                    final_score=round(final_score, 2),
                    missing_fields=missing_fields,
                    equivalent_income=burden_result.equivalent_income,
                    adult_equivalent=burden_result.adult_equivalent,
                    burden_ratio=burden_result.burden_ratio
                )
            
            # Create audit trail
            audit_trail = self._create_audit_trail(
                applicant_data, burden_result, breakdown, scoring_start_time
            )
            
            # Handle disability auto-qualification vs normal calculation
            if breakdown.weighted_components.get('disability_auto_qualify'):
                return {
                    'final_score': 100,
                    'breakdown': {
                        'disability_auto_qualify': True,
                        'base_score': breakdown.weighted_components['base_score'],
                        'explanation': 'Automatic 100% qualification due to disability status'
                    },
                    'fyp_formula': 'Disability Auto-Qualification: 100 points',
                    'equivalent_income': breakdown.equivalent_income,
                    'adult_equivalent': breakdown.adult_equivalent,
                    'burden_ratio': breakdown.burden_ratio,
                    'state_median_burden': burden_result.reference_burden,
                    'missing_fields': breakdown.missing_fields,
                    'audit_trail': audit_trail
                }
            else:
                return {
                    'final_score': breakdown.final_score,
                    'breakdown': {
                        'base_score': breakdown.weighted_components['base_score'],
                        'raw_burden_score': breakdown.burden_score,
                        'documentation_score': breakdown.documentation_score,
                        'disability_score': breakdown.disability_score,
                        'weighted_burden_75pct': breakdown.weighted_components['weighted_burden_75pct'],
                        'weighted_documentation_25pct': breakdown.weighted_components['weighted_documentation_25pct'],
                        'component_total': breakdown.weighted_components['component_total']
                    },
                    'fyp_formula': f"Final = min(100, {breakdown.weighted_components['base_score']} + {breakdown.weighted_components['component_total']:.1f}) = {breakdown.final_score}",
                    'equivalent_income': breakdown.equivalent_income,
                    'adult_equivalent': breakdown.adult_equivalent,
                    'burden_ratio': breakdown.burden_ratio,
                    'state_median_burden': burden_result.reference_burden,
                    'missing_fields': breakdown.missing_fields,
                    'audit_trail': audit_trail
                }
            
        except Exception as e:
            self.logger.error(f"Scoring error: {str(e)}")
            return self._create_error_response(str(e), scoring_start_time)
    
    def _calculate_burden_score(self, applicant_data: Dict[str, Any]) -> BurdenCalculationResult:
        """
        FYP: Calculate burden score using state median burden approach.
        
        Replaces broken burden_ratio = 1.0 logic with academically sound methodology:
        1. Calculate applicant burden = AE / equivalent_income
        2. Get state median burden from lookup table
        3. Calculate burden ratio = applicant_burden / state_median_burden
        4. Apply FYP piecewise scoring thresholds
        """
        state = applicant_data.get('state', '')
        income_bracket = applicant_data.get('income_bracket', '')
        household_size = applicant_data.get('household_size', 1)
        number_of_children = applicant_data.get('number_of_children', 0)
        
        # Step 1: Get equivalent income from CSV or national fallback
        equivalent_income = self._get_equivalent_income(state, income_bracket)
        
        # Step 2: Calculate Adult Equivalent (AE) for household composition
        adults = max(1, household_size - number_of_children)
        adult_equivalent = 1 + self.OTHER_ADULT_WEIGHT * (adults - 1) + self.CHILD_WEIGHT * number_of_children
        
        # Step 3: Calculate applicant burden
        applicant_burden = adult_equivalent / equivalent_income if equivalent_income > 0 else 0
        
        # Step 4: Get state median burden (FYP approach)
        state_median_burden = self._get_state_median_burden(state)
        
        # Step 5: Calculate burden ratio vs state median (FYP approach)
        burden_ratio = applicant_burden / state_median_burden if state_median_burden > 0 else 1.0
        
        # Step 6: Check for disability auto-qualification
        disability_status = applicant_data.get('disability_status', False)
        if disability_status:
            # Auto-qualify with 100 points, skip all calculations
            return BurdenCalculationResult(
                equivalent_income=equivalent_income,
                adult_equivalent=adult_equivalent,
                applicant_burden=applicant_burden,
                reference_burden=state_median_burden,
                burden_ratio=burden_ratio,
                tier_range="Disability Auto-Qualification",
                score=100,
                confidence=1.0
            )
        
        # Step 7: Apply FYP piecewise scoring
        raw_burden_score = self._calculate_raw_burden_score(burden_ratio)
        
        # Step 8: Get base score
        base_score = self._get_base_score(income_bracket)
        
        # Step 9: Calculate documentation score
        doc_score = self._calculate_documentation_score(applicant_data)
        disability_score = self._calculate_disability_score(applicant_data)
        
        # Step 10: Calculate final score using FYP formula
        final_score = self._calculate_final_score(base_score, raw_burden_score, doc_score, disability_score)
        
        return BurdenCalculationResult(
            equivalent_income=equivalent_income,
            adult_equivalent=adult_equivalent,
            applicant_burden=applicant_burden,
            reference_burden=state_median_burden,  # Now using state median as reference
            burden_ratio=burden_ratio,
            tier_range=f"Base: {base_score}, Raw burden: {raw_burden_score}",
            score=final_score,
            confidence=1.0
        )
    
    def _get_equivalent_income(self, state: str, income_bracket: str) -> float:
        """
        Get equivalent income from CSV data with national fallback.
        
        Returns state-specific mean income for the income bracket,
        or national threshold if state/bracket not found in CSV.
        """
        # Map frontend state names to CSV format
        csv_state = self.state_name_mapping.get(state, state)
        
        # Try CSV lookup first
        if csv_state in self.state_income_data and income_bracket in self.state_income_data[csv_state]:
            self.scoring_stats['csv_lookups_successful'] += 1
            return self.state_income_data[csv_state][income_bracket]
        
        # Fallback to national thresholds
        if income_bracket in self.national_thresholds:
            self.scoring_stats['national_fallback_used'] += 1
            self.logger.warning(f"Using national fallback for {state} (mapped to {csv_state}), {income_bracket}")
            return self.national_thresholds[income_bracket]
        
        # Last resort: use median national value
        self.logger.error(f"Unknown income bracket: {income_bracket}, using fallback")
        return 5000.0  # Approximate median Malaysian household income
    
    def _get_tier_info(self, income_bracket: str) -> Dict[str, Any]:
        """Get tier information for income bracket"""
        for tier_name, tier_data in self.tier_ranges.items():
            if income_bracket in tier_data['groups']:
                return {
                    'tier': tier_name,
                    'min': tier_data['min'],
                    'max': tier_data['max']
                }
        
        # Default to lowest tier if unknown
        return {'tier': 'T20', 'min': 0, 'max': 15}
    
    def _get_state_median_burden(self, state: str) -> float:
        """Get median burden for state with fallback to national average"""
        # Map frontend state names to our keys
        mapped_state = self.state_name_mapping.get(state, state)
        
        # Return state median or national fallback
        return self.state_median_burdens.get(mapped_state, self.national_median_burden)
    
    def _calculate_raw_burden_score(self, burden_ratio: float) -> float:
        """FYP piecewise scoring based on burden ratio (from FYP formula)"""
        if burden_ratio <= 1.0:
            return 50   # Below or equal to median
        elif burden_ratio <= 1.2:
            return 70   # Moderately above median
        elif burden_ratio <= 1.5:
            return 90   # Significantly above median
        else:
            return 100  # Much higher than median
    
    def _get_base_score(self, income_bracket: str) -> float:
        """Policy-based base score by income tier"""
        eligibility_class = self.bracket_to_class.get(income_bracket, 'T20')
        return self.base_scores.get(eligibility_class, 0)
    
    def _calculate_final_score(self, base_score: float, burden_score: float, doc_score: float, disability_score: float) -> float:
        """
        FYP Final Score Calculation:
        Final Score = min(100, Base Score + (Burden Score × 75% + Documentation × 25%))
        
        Note: Disability auto-qualification handled separately
        """
        
        # Calculate weighted component score
        # doc_score is 100 or 0, weighted by 25%
        weighted_burden = burden_score * 0.75           # 75% weight
        weighted_documentation = doc_score * 0.25       # 25% weight (100 * 0.25 = 25 max)
        
        component_total = weighted_burden + weighted_documentation
        
        # Final score = base + components (capped at 100)
        final_score = min(100, base_score + component_total)
        
        return final_score
    
    def _calculate_documentation_score(self, applicant_data: Dict[str, Any]) -> float:
        """
        Calculate documentation score with ALL-OR-NOTHING logic.
        
        Both is_signature_valid AND is_data_authentic must be true for 100 points.
        This will be weighted by 25% in final calculation.
        """
        is_signature_valid = applicant_data.get('is_signature_valid')
        is_data_authentic = applicant_data.get('is_data_authentic')
        
        # ALL-OR-NOTHING: Both must be explicitly true
        if is_signature_valid is True and is_data_authentic is True:
            return 100.0  # 100 points, will be weighted by 25%
        else:
            return 0.0
    
    def _calculate_disability_score(self, applicant_data: Dict[str, Any]) -> float:
        """
        Calculate disability score.
        
        Simple binary scoring: 100 points if disability_status is True, 0 otherwise.
        """
        disability_status = applicant_data.get('disability_status', False)
        
        # Simple binary disability scoring
        if disability_status is True:
            return 100.0
        else:
            return 0.0
    
    def _check_missing_fields(self, applicant_data: Dict[str, Any]) -> List[str]:
        """Check for missing required fields"""
        missing = []
        for field in self.required_fields:
            if field not in applicant_data or applicant_data[field] is None:
                missing.append(field)
        
        if missing:
            self.scoring_stats['missing_data_cases'] += 1
        
        return missing
    
    def _create_audit_trail(
        self,
        applicant_data: Dict[str, Any],
        burden_result: BurdenCalculationResult,
        breakdown: ScoringBreakdown,
        start_time: datetime
    ) -> Dict[str, Any]:
        """Create comprehensive audit trail for compliance and debugging"""
        execution_time = (datetime.now() - start_time).total_seconds()
        
        return {
            'timestamp': datetime.now().isoformat(),
            'execution_time_seconds': execution_time,
            'tool_version': '1.0.0',
            'scoring_method': 'burden_based_equivalent_income',
            'data_characteristics': {
                'state': applicant_data.get('state', 'unknown'),
                'income_bracket': applicant_data.get('income_bracket', 'unknown'),
                'household_size': applicant_data.get('household_size', 0),
                'has_disability': applicant_data.get('disability_status', False),
                'documentation_complete': (
                    applicant_data.get('is_signature_valid') is True and
                    applicant_data.get('is_data_authentic') is True
                )
            },
            'calculation_details': {
                'equivalent_income': burden_result.equivalent_income,
                'adult_equivalent': burden_result.adult_equivalent,
                'burden_ratio': burden_result.burden_ratio,
                'tier_range': burden_result.tier_range,
                'fyp_approach': {
                    'base_score_by_tier': True,
                    'burden_adjustment': True,
                    'state_median_comparison': True
                }
            },
            'scoring_stats': self.scoring_stats.copy(),
            'missing_fields': breakdown.missing_fields
        }
    
    def _create_error_response(self, error_message: str, start_time: datetime) -> Dict[str, Any]:
        """Create standardized error response"""
        execution_time = (datetime.now() - start_time).total_seconds()
        
        return {
            'final_score': 0.0,
            'breakdown': {
                'base_score': 0.0,
                'raw_burden_score': 0.0,
                'documentation_score': 0.0,
                'disability_score': 0.0,
                'weighted_burden_75pct': 0.0,
                'weighted_documentation_25pct': 0.0,
                'component_total': 0.0
            },
            'fyp_formula': 'Error occurred',
            'equivalent_income': 0.0,
            'adult_equivalent': 1.0,
            'burden_ratio': 0.0,
            'state_median_burden': 0.0,
            'missing_fields': ['error_occurred'],
            'audit_trail': {
                'timestamp': datetime.now().isoformat(),
                'execution_time_seconds': execution_time,
                'error': error_message,
                'tool_version': '1.0.0'
            },
            'error': error_message
        }
    
    def get_scoring_statistics(self) -> Dict[str, Any]:
        """Get scoring statistics for monitoring and optimization"""
        return {
            'scoring_stats': self.scoring_stats.copy(),
            'csv_success_rate': (
                self.scoring_stats['csv_lookups_successful'] / 
                max(1, self.scoring_stats['total_scores_calculated'])
            ),
            'fallback_usage_rate': (
                self.scoring_stats['national_fallback_used'] / 
                max(1, self.scoring_stats['total_scores_calculated'])
            ),
            'missing_data_rate': (
                self.scoring_stats['missing_data_cases'] / 
                max(1, self.scoring_stats['total_scores_calculated'])
            )
        }
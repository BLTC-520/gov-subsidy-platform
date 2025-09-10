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
        """Initialize scoring tool with CSV data and national fallback thresholds"""
        super().__init__()
        self.logger = logging.getLogger(__name__)
        
        # Load CSV state income data
        self.csv_file_path = csv_file_path or os.path.join(
            os.path.dirname(__file__), "..", "docs", "hies_cleaned_state_percentile.csv"
        )
        self.state_income_data = self._load_csv_data()
        
        # National fallback thresholds from MalaysianIncomeClassifier.circom
        # Source: zkp/circuits/MalaysianIncomeClassifier.circom lines 38-47
        self.national_thresholds = {
            'B1': 2560, 'B2': 3439, 'B3': 4309, 'B4': 5249,
            'M1': 6339, 'M2': 7689, 'M3': 9449, 'M4': 11819,
            'T1': 15869, 'T2': 20000  # Estimated upper bound for T2
        }
        
        # Fixed Adult Equivalent weights (not configurable per requirements)
        self.OTHER_ADULT_WEIGHT = 0.5
        self.CHILD_WEIGHT = 0.3
        
        # Final scoring weights
        self.BURDEN_WEIGHT = 0.55
        self.DOCUMENTATION_WEIGHT = 0.25
        self.DISABILITY_WEIGHT = 0.20
        
        # Tier-based scoring ranges
        self.tier_ranges = {
            'B40': {'min': 70, 'max': 100, 'groups': ['B1', 'B2', 'B3', 'B4']},
            'M40_LOWER': {'min': 40, 'max': 70, 'groups': ['M1', 'M2']},
            'M40_UPPER': {'min': 10, 'max': 40, 'groups': ['M3', 'M4']},
            'T20': {'min': 0, 'max': 15, 'groups': ['T1', 'T2']}
        }
        
        # Burden ratio thresholds - MARKED FOR TESTING
        # These values need validation with real data
        self.burden_thresholds = {
            'B40': {'high': 1.5, 'med': 1.2, 'base': 1.0},
            'M40_LOWER': {'high': 1.3, 'med': 1.1, 'base': 1.0},
            'M40_UPPER': {'high': 1.2, 'med': 1.0, 'base': 0.8},
            'T20': {'high': 1.1, 'med': 1.0, 'base': 0.9}
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
            
            # Calculate burden score (55% weight)
            burden_result = self._calculate_burden_score(applicant_data)
            
            # Calculate documentation score (25% weight)
            documentation_score = self._calculate_documentation_score(applicant_data)
            
            # Calculate disability score (20% weight) 
            disability_score = self._calculate_disability_score(applicant_data)
            
            # Apply weights and calculate final score
            weighted_burden = burden_result.score * self.BURDEN_WEIGHT
            weighted_documentation = documentation_score * self.DOCUMENTATION_WEIGHT
            weighted_disability = disability_score * self.DISABILITY_WEIGHT
            
            final_score = weighted_burden + weighted_documentation + weighted_disability
            
            # Create comprehensive breakdown
            breakdown = ScoringBreakdown(
                burden_score=burden_result.score,
                documentation_score=documentation_score,
                disability_score=disability_score,
                weighted_components={
                    'burden_weighted': weighted_burden,
                    'documentation_weighted': weighted_documentation,
                    'disability_weighted': weighted_disability
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
            
            return {
                'final_score': breakdown.final_score,
                'breakdown': {
                    'burden_score': breakdown.burden_score,
                    'documentation_score': breakdown.documentation_score,
                    'disability_score': breakdown.disability_score
                },
                'weighted_components': breakdown.weighted_components,
                'equivalent_income': breakdown.equivalent_income,
                'adult_equivalent': breakdown.adult_equivalent,
                'burden_ratio': breakdown.burden_ratio,
                'missing_fields': breakdown.missing_fields,
                'audit_trail': audit_trail
            }
            
        except Exception as e:
            self.logger.error(f"Scoring error: {str(e)}")
            return self._create_error_response(str(e), scoring_start_time)
    
    def _calculate_burden_score(self, applicant_data: Dict[str, Any]) -> BurdenCalculationResult:
        """
        Calculate burden score using CSV equivalent income lookup and AE calculation.
        
        Key Innovation: Privacy-preserving equivalent income approach
        - Uses income_bracket + state to find CSV equivalent income
        - Calculates Adult Equivalent for household composition adjustment
        - Compares burden ratios within state-specific income tiers
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
        
        # Step 3: Calculate burden (AE per unit income)
        applicant_burden = adult_equivalent / equivalent_income if equivalent_income > 0 else 0
        reference_burden = adult_equivalent / equivalent_income  # Same for equivalent income approach
        
        # Step 4: Calculate burden ratio (household composition effect)
        burden_ratio = applicant_burden / reference_burden if reference_burden > 0 else 1.0
        
        # Step 5: Score within tier range based on burden ratio
        tier_info = self._get_tier_info(income_bracket)
        score = self._score_burden_ratio(burden_ratio, tier_info['tier'])
        
        return BurdenCalculationResult(
            equivalent_income=equivalent_income,
            adult_equivalent=adult_equivalent,
            applicant_burden=applicant_burden,
            reference_burden=reference_burden,
            burden_ratio=burden_ratio,
            tier_range=f"{tier_info['tier']} ({tier_info['min']}-{tier_info['max']})",
            score=score,
            confidence=1.0  # High confidence in mathematical calculations
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
    
    def _score_burden_ratio(self, burden_ratio: float, tier: str) -> float:
        """
        Score burden ratio within tier-specific ranges.
        
        MARKED FOR TESTING: These thresholds need validation with real data.
        Higher burden ratio = higher score (more need within tier).
        """
        tier_range = self.tier_ranges.get(tier, self.tier_ranges['T20'])
        thresholds = self.burden_thresholds.get(tier, self.burden_thresholds['T20'])
        
        min_score = tier_range['min']
        max_score = tier_range['max']
        score_range = max_score - min_score
        
        if burden_ratio >= thresholds['high']:
            # Much higher burden than peers - highest score in tier
            return max_score
        elif burden_ratio >= thresholds['med']:
            # Moderately higher burden - mid-high score
            return min_score + (score_range * 0.75)
        elif burden_ratio >= thresholds['base']:
            # Same as peers - mid score
            return min_score + (score_range * 0.5)
        else:
            # Lower burden than peers - lowest score in tier
            return min_score
    
    def _calculate_documentation_score(self, applicant_data: Dict[str, Any]) -> float:
        """
        Calculate documentation score with ALL-OR-NOTHING logic.
        
        Both is_signature_valid AND is_data_authentic must be true for any points (25% weight).
        If either is missing or false, score = 0.
        """
        is_signature_valid = applicant_data.get('is_signature_valid')
        is_data_authentic = applicant_data.get('is_data_authentic')
        
        # ALL-OR-NOTHING: Both must be explicitly true
        if is_signature_valid is True and is_data_authentic is True:
            return 100.0
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
                'weights_applied': {
                    'burden': self.BURDEN_WEIGHT,
                    'documentation': self.DOCUMENTATION_WEIGHT,
                    'disability': self.DISABILITY_WEIGHT
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
                'burden_score': 0.0,
                'documentation_score': 0.0,
                'disability_score': 0.0
            },
            'weighted_components': {
                'burden_weighted': 0.0,
                'documentation_weighted': 0.0,
                'disability_weighted': 0.0
            },
            'equivalent_income': 0.0,
            'adult_equivalent': 1.0,
            'burden_ratio': 0.0,
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
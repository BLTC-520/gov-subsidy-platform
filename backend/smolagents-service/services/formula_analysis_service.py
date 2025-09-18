"""
FormulaAnalysisService - Wrapper service for transparent formula-based analysis.

This service wraps the existing EligibilityScoreTool to provide a structured output
format that matches the dual-analysis response schema. It focuses on mathematical
transparency and auditability for the formula analysis path.

Research Value: Provides the transparent, deterministic analysis path in the
interpretability vs flexibility trade-off demonstration.
"""

import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass

from tools.eligibility_score_tool import EligibilityScoreTool


@dataclass
class FormulaAnalysisResult:
    """Structured result for FYP formula-based analysis"""
    score: float
    base_score: float           # New: policy base score
    burden_adjustment: float    # New: burden component adjustment
    burden_ratio: float         # BR vs state median
    state_median_burden: float  # Reference value used
    eligibility_class: str
    explanation: str
    equivalent_income: float
    adult_equivalent: float
    component_adjustments: Dict[str, float]  # Doc penalty, disability bonus
    confidence: float = 1.0


class FormulaAnalysisService:
    """
    Service wrapper for formula-based eligibility analysis.
    
    Provides structured output compatible with dual-analysis architecture
    while maintaining full transparency of mathematical calculations.
    
    Key Features:
    - Wraps existing EligibilityScoreTool (Task 2.3)
    - Generates human-readable explanations
    - Formats output for dual-analysis comparison
    - Maintains audit trail for compliance
    """
    
    def __init__(self, csv_file_path: Optional[str] = None):
        """Initialize service with eligibility scoring tool"""
        self.logger = logging.getLogger(__name__)
        self.eligibility_tool = EligibilityScoreTool(csv_file_path)
    
    def analyze(self, citizen_data: Dict[str, Any]) -> FormulaAnalysisResult:
        """
        Perform formula-based analysis using EligibilityScoreTool.
        
        Args:
            citizen_data: Citizen information dictionary
            
        Returns:
            FormulaAnalysisResult with structured output
            
        Raises:
            Exception: If scoring fails or data is invalid
        """
        try:
            self.logger.info("Starting formula-based analysis")
            
            # Use existing EligibilityScoreTool for scoring
            scoring_result = self.eligibility_tool.forward(citizen_data)
            
            if 'error' in scoring_result:
                raise Exception(f"Scoring failed: {scoring_result['error']}")
            
            # Extract FYP values
            final_score = scoring_result['final_score']
            breakdown = scoring_result['breakdown']
            equivalent_income = scoring_result['equivalent_income']
            adult_equivalent = scoring_result['adult_equivalent']
            burden_ratio = scoring_result['burden_ratio']
            state_median_burden = scoring_result['state_median_burden']
            
            # Determine eligibility class from income bracket
            eligibility_class = self._get_eligibility_class_from_bracket(citizen_data.get('income_bracket', 'Unknown'))
            
            # Generate FYP explanation
            explanation = self._generate_fyp_explanation(scoring_result, citizen_data)
            
            # Format component adjustments
            component_adjustments = {
                'documentation_penalty': self._has_doc_penalty(citizen_data),
                'disability_bonus': citizen_data.get('disability_status', False),
                'weighted_burden_75pct': breakdown['weighted_burden_75pct'],
                'weighted_documentation_25pct': breakdown['weighted_documentation_25pct']
            }
            
            result = FormulaAnalysisResult(
                score=final_score,
                base_score=breakdown['base_score'],
                burden_adjustment=breakdown['component_total'],  # Total component adjustment
                burden_ratio=burden_ratio,
                state_median_burden=state_median_burden,
                eligibility_class=eligibility_class,
                explanation=explanation,
                equivalent_income=equivalent_income,
                adult_equivalent=adult_equivalent,
                component_adjustments=component_adjustments
            )
            
            self.logger.info(f"Formula analysis completed: {eligibility_class} ({final_score:.1f})")
            return result
            
        except Exception as e:
            self.logger.error(f"Formula analysis failed: {str(e)}")
            raise
    
    def _get_eligibility_class_from_bracket(self, income_bracket: str) -> str:
        """
        Determine eligibility classification from income bracket.
        
        Uses the same tier mapping as EligibilityScoreTool:
        - B40: B1, B2, B3, B4 (highest need)
        - M40-M1: M1, M2 (moderate-high need) 
        - M40-M2: M3, M4 (moderate need)
        - T20: T1, T2 (lowest need)
        """
        # Map income brackets to eligibility classes
        bracket_mapping = {
            'B1': 'B40', 'B2': 'B40', 'B3': 'B40', 'B4': 'B40',
            'M1': 'M40-M1', 'M2': 'M40-M1',
            'M3': 'M40-M2', 'M4': 'M40-M2',
            'T1': 'T20', 'T2': 'T20'
        }
        
        return bracket_mapping.get(income_bracket, 'Unknown')
    
    def _generate_fyp_explanation(self, scoring_result: Dict[str, Any], citizen_data: Dict[str, Any]) -> str:
        """Generate FYP-style explanation with correct formula"""
        
        final_score = scoring_result['final_score']
        breakdown = scoring_result['breakdown']
        burden_ratio = scoring_result['burden_ratio']
        state_median_burden = scoring_result['state_median_burden']
        equivalent_income = scoring_result['equivalent_income']
        adult_equivalent = scoring_result['adult_equivalent']
        
        household_size = citizen_data.get('household_size', 1)
        state = citizen_data.get('state', 'Unknown')
        income_bracket = citizen_data.get('income_bracket', 'Unknown')
        
        # Show the correct formula
        base_score = breakdown['base_score']
        burden_75 = breakdown['weighted_burden_75pct']
        doc_25 = breakdown['weighted_documentation_25pct']
        component_total = breakdown['component_total']
        
        explanation_parts = [
            f"Final score {final_score} = min(100, Base {base_score} + (Burden×75% {burden_75:.1f} + Doc×25% {doc_25:.1f}))",
            f"Burden ratio {burden_ratio:.3f} vs state median {state_median_burden:.6f}",
            f"Adult Equivalent {adult_equivalent:.1f} for {household_size}-person household",
            f"State: {state}, Income bracket: {income_bracket}"
        ]
        
        # Add adjustments
        if self._has_doc_penalty(citizen_data):
            explanation_parts.append("Documentation penalty applied")
        if citizen_data.get('disability_status', False):
            explanation_parts.append("Disability bonus applied (+10 points)")
        
        return ". ".join(explanation_parts) + "."
    
    def _has_doc_penalty(self, citizen_data: Dict[str, Any]) -> bool:
        """Check if documentation penalty was applied"""
        is_signature_valid = citizen_data.get('is_signature_valid')
        is_data_authentic = citizen_data.get('is_data_authentic')
        return not (is_signature_valid is True and is_data_authentic is True)
    
    def get_analysis_info(self) -> Dict[str, Any]:
        """
        Get information about the FYP formula analysis method.
        
        Returns metadata about the FYP approach for comparison purposes.
        """
        return {
            'method': 'fyp_formula_based',
            'approach': 'state_median_burden_comparison',
            'transparency': 'full_mathematical_auditability',
            'components': {
                'base_score_by_tier': True,
                'burden_adjustment': True,
                'state_median_comparison': True,
                'piecewise_thresholds': [1.0, 1.2, 1.5]
            },
            'data_sources': [
                'hies_cleaned_state_percentile.csv',
                'calculated_state_median_burdens',
                'adult_equivalent_methodology'
            ],
            'strengths': [
                'Academically defensible methodology',
                'State-specific burden comparison',
                'Policy-compliant base scores',
                'Mathematically sound (no burden_ratio=1.0)',
                'Audit-ready with real HIES data'
            ],
            'improvements_over_old': [
                'Fixed broken burden ratio calculation',
                'Uses real state median values',
                'Eliminates always-1.0 burden ratio bug',
                'Implements piecewise scoring thresholds'
            ]
        }
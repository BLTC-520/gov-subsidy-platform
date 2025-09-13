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
    """Structured result for formula-based analysis"""
    score: float
    burden_score: float
    eligibility_class: str
    explanation: str
    equivalent_income: float
    adult_equivalent: float
    component_scores: Dict[str, float]
    confidence: float = 1.0  # Formula calculations are deterministic


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
            
            # Extract key values
            final_score = scoring_result['final_score']
            breakdown = scoring_result['breakdown']
            equivalent_income = scoring_result['equivalent_income']
            adult_equivalent = scoring_result['adult_equivalent']
            
            # Determine eligibility class from income bracket using tool's tier mapping
            eligibility_class = self._get_eligibility_class_from_bracket(citizen_data.get('income_bracket', 'Unknown'))
            
            # Generate human-readable explanation
            explanation = self._generate_explanation(
                final_score, breakdown, equivalent_income, adult_equivalent, citizen_data
            )
            
            # Format component scores
            component_scores = {
                'burden': round(breakdown['burden_score'], 1),
                'documentation': round(breakdown['documentation_score'], 1),
                'disability': round(breakdown['disability_score'], 1)
            }
            
            result = FormulaAnalysisResult(
                score=final_score,
                burden_score=scoring_result.get('burden_ratio', final_score),
                eligibility_class=eligibility_class,
                explanation=explanation,
                equivalent_income=equivalent_income,
                adult_equivalent=adult_equivalent,
                component_scores=component_scores
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
    
    def _generate_explanation(
        self,
        final_score: float,
        breakdown: Dict[str, float],
        equivalent_income: float,
        adult_equivalent: float,
        citizen_data: Dict[str, Any]
    ) -> str:
        """
        Generate human-readable explanation of formula calculations.
        
        Emphasizes transparency and auditability of the mathematical approach.
        """
        household_size = citizen_data.get('household_size', 1)
        state = citizen_data.get('state', 'Unknown')
        income_bracket = citizen_data.get('income_bracket', 'Unknown')
        
        # Component explanations
        burden_pts = round(breakdown['burden_score'], 1)
        doc_pts = round(breakdown['documentation_score'], 1)
        disability_pts = round(breakdown['disability_score'], 1)
        
        explanation_parts = [
            f"Burden score {final_score:.1f} calculated using equivalised income (RM{equivalent_income:.0f})",
            f"with adult equivalent scale ({adult_equivalent:.1f} for {household_size}-person household)."
        ]
        
        # Add component breakdown
        explanation_parts.append(
            f"Components: Burden {burden_pts}pts (55%), "
            f"Documentation {doc_pts}pts (25%), "
            f"Disability {disability_pts}pts (20%)."
        )
        
        # Add state/bracket context for transparency
        if state != 'Unknown' and income_bracket != 'Unknown':
            explanation_parts.append(
                f"State-specific calculation for {state}, income bracket {income_bracket}."
            )
        
        return " ".join(explanation_parts)
    
    def get_analysis_info(self) -> Dict[str, Any]:
        """
        Get information about the formula analysis method.
        
        Returns metadata about the analysis approach for comparison purposes.
        """
        return {
            'method': 'formula_based',
            'approach': 'burden_score_calculation',
            'transparency': 'full_mathematical_auditability',
            'components': {
                'burden_weight': 0.55,
                'documentation_weight': 0.25,
                'disability_weight': 0.20
            },
            'data_sources': [
                'hies_cleaned_state_percentile.csv',
                'national_income_thresholds',
                'adult_equivalent_methodology'
            ],
            'strengths': [
                'Fully transparent calculations',
                'Mathematically consistent',
                'Audit-ready compliance',
                'Reproducible results'
            ],
            'limitations': [
                'Limited contextual flexibility',
                'Rule-based only',
                'Cannot handle edge cases beyond formula'
            ]
        }
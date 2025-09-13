"""
AnalysisComparator - Simple score-based comparison for dual-analysis results.

This class implements pure score-based comparison logic for RAG vs Formula analysis,
focusing on numerical agreement/disagreement without classification complexity.

Research Value: Quantifies when transparent formula-based and flexible RAG-based 
approaches produce similar or different numerical scores (0-100 scale).
"""

import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class ComparisonResult:
    """Structured comparison result"""
    agreement: bool
    score_difference: float
    rag_confidence: float
    recommendation: str
    comment: str


class AnalysisComparator:
    """
    Simple score-based comparator for RAG vs Formula analysis results.
    
    Compares numerical scores (0-100) with configurable agreement threshold.
    No classification logic - purely score difference based.
    
    Key Features:
    - Configurable agreement threshold (default: 5 points)  
    - Low confidence handling (favor formula when RAG uncertain)
    - Simple recommendations based on score agreement
    """
    
    def __init__(self, agreement_threshold: float = 5.0, low_confidence_threshold: float = 0.5):
        """
        Initialize comparator with configurable thresholds.
        
        Args:
            agreement_threshold: Score difference threshold for agreement (default: 5.0 points)
            low_confidence_threshold: RAG confidence below which to favor formula (default: 0.5)
        """
        self.logger = logging.getLogger(__name__)
        self.agreement_threshold = agreement_threshold
        self.low_confidence_threshold = low_confidence_threshold
    
    def compare(
        self,
        rag_result: Dict[str, Any],
        formula_result: Dict[str, Any],
        citizen_id: Optional[str] = None
    ) -> ComparisonResult:
        """
        Compare RAG and formula analysis results based on scores only.
        
        Args:
            rag_result: RAG analysis result with score and confidence
            formula_result: Formula analysis result with score
            citizen_id: Optional citizen identifier for logging
            
        Returns:
            ComparisonResult with score-based comparison
        """
        try:
            self.logger.info(f"Comparing analysis scores for citizen: {citizen_id}")
            
            # Extract scores
            rag_score = rag_result.get('score', 0.0)
            formula_score = formula_result.get('score', 0.0)
            rag_confidence = rag_result.get('confidence', 0.0)
            
            # Calculate score difference
            score_difference = abs(rag_score - formula_score)
            
            # Determine agreement based on threshold
            agreement = score_difference <= self.agreement_threshold
            
            # Generate recommendation and comment
            recommendation = self._generate_recommendation(rag_score, formula_score, rag_confidence, agreement)
            comment = self._generate_comment(score_difference, rag_confidence, agreement)
            
            result = ComparisonResult(
                agreement=agreement,
                score_difference=round(score_difference, 1),
                rag_confidence=rag_confidence,
                recommendation=recommendation,
                comment=comment
            )
            
            self.logger.info(f"Score comparison: RAG={rag_score}, Formula={formula_score}, Diff={score_difference:.1f}, Agreement={agreement}")
            return result
            
        except Exception as e:
            self.logger.error(f"Comparison failed: {str(e)}")
            return self._create_error_result(str(e))
    
    def _generate_recommendation(
        self, rag_score: float, formula_score: float, rag_confidence: float, agreement: bool
    ) -> str:
        """Generate simple recommendation based on scores and confidence"""
        
        # Handle low confidence - favor formula for transparency
        if rag_confidence < self.low_confidence_threshold:
            return f"⚠️ Formula Score: {formula_score:.1f} (Low RAG confidence {rag_confidence:.2f} → favor transparency)"
        
        # Handle agreement
        if agreement:
            avg_score = (rag_score + formula_score) / 2
            return f"✅ Consensus: {avg_score:.1f} (Both methods agree within {self.agreement_threshold} points)"
        
        # Handle disagreement
        return f"⚠️ Disagreement: RAG {rag_score:.1f} vs Formula {formula_score:.1f} (Δ{abs(rag_score - formula_score):.1f} points)"
    
    def _generate_comment(self, score_difference: float, rag_confidence: float, agreement: bool) -> str:
        """Generate explanatory comment about the comparison"""
        
        if rag_confidence < self.low_confidence_threshold:
            return f"Low RAG confidence ({rag_confidence:.2f}) suggests formula approach more reliable for this case."
        
        if agreement:
            return f"Both analysis methods agree within {self.agreement_threshold}-point threshold, providing robust score determination."
        
        if score_difference > 15.0:
            return f"Significant score disagreement (Δ{score_difference:.1f}) indicates case may require manual review."
        
        return f"Moderate score disagreement (Δ{score_difference:.1f}) - consider both perspectives in final decision."
    
    def _create_error_result(self, error_message: str) -> ComparisonResult:
        """Create error result for comparison failures"""
        return ComparisonResult(
            agreement=False,
            score_difference=0.0,
            rag_confidence=0.0,
            recommendation="❌ Comparison Error - Unable to determine agreement",
            comment=f"Comparison failed: {error_message}"
        )
    
    def get_comparison_config(self) -> Dict[str, Any]:
        """Get comparison configuration"""
        return {
            'agreement_threshold': self.agreement_threshold,
            'low_confidence_threshold': self.low_confidence_threshold,
            'comparison_method': 'pure_score_difference',
            'score_range': '0-100_points'
        }
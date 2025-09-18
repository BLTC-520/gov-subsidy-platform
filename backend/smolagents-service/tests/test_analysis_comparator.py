"""
Unit tests for simplified AnalysisComparator.

Tests pure score-based comparison logic, agreement/disagreement detection, and 
simple recommendations for the dual-analysis comparison system.
"""

import unittest
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.analysis_comparator import AnalysisComparator, ComparisonResult


class TestAnalysisComparator(unittest.TestCase):
    """Test cases for simplified AnalysisComparator"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.comparator = AnalysisComparator()
        
        # Base RAG result template
        self.base_rag_result = {
            'score': 75.0,
            'confidence': 0.85,
            'explanation': 'RAG analysis explanation'
        }
        
        # Base formula result template
        self.base_formula_result = {
            'score': 78.5,
            'explanation': 'Formula calculation explanation'
        }
    
    def test_agreement_within_threshold(self):
        """Test agreement detection when scores are within threshold"""
        rag_result = self.base_rag_result.copy()
        rag_result.update({'score': 75.0, 'confidence': 0.8})
        
        formula_result = self.base_formula_result.copy()
        formula_result['score'] = 78.0  # 3.0 difference (< 5 threshold)
        
        result = self.comparator.compare(rag_result, formula_result, 'test_citizen')
        
        self.assertTrue(result.agreement)
        self.assertEqual(result.score_difference, 3.0)
        self.assertIn('Consensus', result.recommendation)
        self.assertIn('76.5', result.recommendation)  # Average score
        self.assertIn('✅', result.recommendation)
        self.assertIn('agree within', result.comment)
    
    def test_disagreement_beyond_threshold(self):
        """Test disagreement detection when scores exceed threshold"""
        rag_result = self.base_rag_result.copy()
        rag_result.update({'score': 70.0, 'confidence': 0.8})
        
        formula_result = self.base_formula_result.copy()
        formula_result['score'] = 86.0  # 16.0 difference (> 15 threshold)
        
        result = self.comparator.compare(rag_result, formula_result, 'test_citizen')
        
        self.assertFalse(result.agreement)
        self.assertEqual(result.score_difference, 16.0)
        self.assertIn('Disagreement', result.recommendation)
        self.assertIn('RAG 70.0 vs Formula 86.0', result.recommendation)
        self.assertIn('⚠️', result.recommendation)
        self.assertIn('Significant score disagreement', result.comment)
    
    def test_low_confidence_favors_formula(self):
        """Test low RAG confidence favors formula approach"""
        rag_result = self.base_rag_result.copy()
        rag_result.update({'score': 90.0, 'confidence': 0.3})  # Low confidence
        
        formula_result = self.base_formula_result.copy()
        formula_result['score'] = 75.0
        
        result = self.comparator.compare(rag_result, formula_result, 'test_citizen')
        
        self.assertFalse(result.agreement)  # Due to low confidence handling
        self.assertIn('Formula Score: 75.0', result.recommendation)
        self.assertIn('Low RAG confidence 0.30', result.recommendation)
        self.assertIn('favor transparency', result.recommendation)
        self.assertIn('⚠️', result.recommendation)
        self.assertIn('Low RAG confidence', result.comment)
    
    def test_exact_threshold_boundary(self):
        """Test scores exactly at threshold boundary"""
        rag_result = self.base_rag_result.copy()
        rag_result.update({'score': 75.0, 'confidence': 0.7})
        
        formula_result = self.base_formula_result.copy()
        formula_result['score'] = 80.0  # Exactly 5.0 difference
        
        result = self.comparator.compare(rag_result, formula_result, 'test_citizen')
        
        # Should be agreement (<=  threshold)
        self.assertTrue(result.agreement)
        self.assertEqual(result.score_difference, 5.0)
        self.assertIn('Consensus', result.recommendation)
    
    def test_just_over_threshold(self):
        """Test scores just over threshold"""
        rag_result = self.base_rag_result.copy()
        rag_result.update({'score': 75.0, 'confidence': 0.7})
        
        formula_result = self.base_formula_result.copy()
        formula_result['score'] = 80.1  # 5.1 difference (> threshold)
        
        result = self.comparator.compare(rag_result, formula_result, 'test_citizen')
        
        # Should be disagreement (> threshold)
        self.assertFalse(result.agreement)
        self.assertEqual(result.score_difference, 5.1)
        self.assertIn('Disagreement', result.recommendation)
    
    def test_configurable_thresholds(self):
        """Test custom agreement and confidence thresholds"""
        # Custom thresholds
        custom_comparator = AnalysisComparator(
            agreement_threshold=10.0,
            low_confidence_threshold=0.6
        )
        
        rag_result = self.base_rag_result.copy()
        rag_result.update({'score': 75.0, 'confidence': 0.5})  # Below custom threshold
        
        formula_result = self.base_formula_result.copy()
        formula_result.update({'score': 83.0})  # 8 point difference, within custom threshold
        
        result = custom_comparator.compare(rag_result, formula_result, 'test_citizen')
        
        # Should be low confidence case (0.5 < 0.6)
        self.assertIn('Low RAG confidence', result.recommendation)
        
        # Test with higher confidence that meets threshold
        rag_result['confidence'] = 0.7
        result2 = custom_comparator.compare(rag_result, formula_result, 'test_citizen')
        
        # Should be agreement case (8 < 10 threshold)
        self.assertTrue(result2.agreement)
        self.assertIn('Consensus', result2.recommendation)
    
    def test_moderate_disagreement_comment(self):
        """Test moderate disagreement generates appropriate comment"""
        rag_result = self.base_rag_result.copy()
        rag_result.update({'score': 70.0, 'confidence': 0.8})
        
        formula_result = self.base_formula_result.copy()
        formula_result['score'] = 80.0  # 10.0 difference
        
        result = self.comparator.compare(rag_result, formula_result, 'test_citizen')
        
        self.assertFalse(result.agreement)
        self.assertEqual(result.score_difference, 10.0)
        self.assertIn('Moderate score disagreement', result.comment)
        self.assertIn('consider both perspectives', result.comment)
    
    def test_error_handling(self):
        """Test error handling for malformed inputs"""
        # Test that missing scores default to 0.0 and comparison still works
        invalid_rag = {'confidence': 0.8}  # Missing score
        invalid_formula = {}  # Missing score
        
        result = self.comparator.compare(invalid_rag, invalid_formula, 'test')
        
        # Missing scores default to 0.0, so difference is 0, which means agreement
        self.assertTrue(result.agreement)
        self.assertEqual(result.score_difference, 0.0)
        self.assertEqual(result.rag_confidence, 0.8)  # Confidence was provided
        self.assertIn('Consensus: 0.0', result.recommendation)
    
    def test_zero_scores(self):
        """Test handling of zero scores"""
        rag_result = {'score': 0.0, 'confidence': 0.8}
        formula_result = {'score': 0.0}
        
        result = self.comparator.compare(rag_result, formula_result, 'test')
        
        self.assertTrue(result.agreement)
        self.assertEqual(result.score_difference, 0.0)
        self.assertIn('Consensus: 0.0', result.recommendation)
    
    def test_missing_confidence_defaults(self):
        """Test missing confidence field defaults to 0.0"""
        rag_result = {'score': 75.0}  # Missing confidence
        formula_result = {'score': 78.0}
        
        result = self.comparator.compare(rag_result, formula_result, 'test')
        
        self.assertEqual(result.rag_confidence, 0.0)
        # Should favor formula due to zero confidence
        self.assertIn('Formula Score', result.recommendation)
    
    def test_get_comparison_config(self):
        """Test comparison configuration retrieval"""
        config = self.comparator.get_comparison_config()
        
        # Verify structure
        self.assertIn('agreement_threshold', config)
        self.assertIn('low_confidence_threshold', config)
        self.assertIn('comparison_method', config)
        self.assertIn('score_range', config)
        
        # Verify values
        self.assertEqual(config['agreement_threshold'], 5.0)
        self.assertEqual(config['low_confidence_threshold'], 0.5)
        self.assertEqual(config['comparison_method'], 'pure_score_difference')
        self.assertEqual(config['score_range'], '0-100_points')
    
    def test_custom_threshold_config(self):
        """Test custom threshold configuration"""
        custom_comparator = AnalysisComparator(agreement_threshold=3.0, low_confidence_threshold=0.7)
        config = custom_comparator.get_comparison_config()
        
        self.assertEqual(config['agreement_threshold'], 3.0)
        self.assertEqual(config['low_confidence_threshold'], 0.7)
    
    def test_recommendation_formatting(self):
        """Test recommendation message formatting"""
        # Test consensus formatting
        rag_result = {'score': 76.0, 'confidence': 0.8}
        formula_result = {'score': 74.0}
        result = self.comparator.compare(rag_result, formula_result)
        
        self.assertIn('75.0', result.recommendation)  # Average of 76 and 74
        self.assertIn('within 5.0 points', result.recommendation)
        
        # Test disagreement formatting  
        rag_result = {'score': 80.0, 'confidence': 0.8}
        formula_result = {'score': 65.0}
        result = self.comparator.compare(rag_result, formula_result)
        
        self.assertIn('RAG 80.0 vs Formula 65.0', result.recommendation)
        self.assertIn('Δ15.0 points', result.recommendation)


if __name__ == '__main__':
    unittest.main()
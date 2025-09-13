"""
Unit tests for FormulaAnalysisService.

Tests the wrapper service functionality, output formatting, and error handling
for the formula-based analysis path in the dual-analysis architecture.
"""

import unittest
from unittest.mock import Mock, patch
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.formula_analysis_service import FormulaAnalysisService, FormulaAnalysisResult


class TestFormulaAnalysisService(unittest.TestCase):
    """Test cases for FormulaAnalysisService"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.service = FormulaAnalysisService()
        
        # Sample citizen data for testing
        self.sample_citizen_data = {
            'state': 'Selangor',
            'income_bracket': 'B2',
            'household_size': 4,
            'number_of_children': 2,
            'is_signature_valid': True,
            'is_data_authentic': True,
            'disability_status': False
        }
        
        # Mock successful scoring result
        self.mock_scoring_result = {
            'final_score': 78.5,
            'breakdown': {
                'burden_score': 75.0,
                'documentation_score': 100.0,
                'disability_score': 0.0
            },
            'equivalent_income': 4734.0,
            'adult_equivalent': 2.1,
            'burden_ratio': 1.25,
            'missing_fields': [],
            'audit_trail': {'timestamp': '2024-01-01T12:00:00'}
        }
    
    @patch('services.formula_analysis_service.EligibilityScoreTool')
    def test_analyze_success(self, mock_tool_class):
        """Test successful analysis with proper output formatting"""
        # Setup mock
        mock_tool = Mock()
        mock_tool.forward.return_value = self.mock_scoring_result
        mock_tool_class.return_value = mock_tool
        
        # Create service and analyze
        service = FormulaAnalysisService()
        result = service.analyze(self.sample_citizen_data)
        
        # Verify result structure
        self.assertIsInstance(result, FormulaAnalysisResult)
        self.assertEqual(result.score, 78.5)
        self.assertEqual(result.eligibility_class, 'B40')
        self.assertEqual(result.equivalent_income, 4734.0)
        self.assertEqual(result.adult_equivalent, 2.1)
        self.assertEqual(result.confidence, 1.0)
        
        # Verify component scores formatting
        expected_components = {
            'burden': 75.0,
            'documentation': 100.0,
            'disability': 0.0
        }
        self.assertEqual(result.component_scores, expected_components)
        
        # Verify explanation content
        self.assertIn('78.5', result.explanation)
        self.assertIn('RM4734', result.explanation)
        self.assertIn('2.1', result.explanation)
        self.assertIn('4-person household', result.explanation)
        
        # Verify tool was called correctly
        mock_tool.forward.assert_called_once_with(self.sample_citizen_data)
    
    def test_eligibility_class_from_bracket(self):
        """Test eligibility class determination from income bracket"""
        test_cases = [
            ('B1', 'B40'), ('B2', 'B40'), ('B3', 'B40'), ('B4', 'B40'),
            ('M1', 'M40-M1'), ('M2', 'M40-M1'),
            ('M3', 'M40-M2'), ('M4', 'M40-M2'),
            ('T1', 'T20'), ('T2', 'T20'),
            ('Unknown', 'Unknown'), ('Invalid', 'Unknown')
        ]
        
        for bracket, expected_class in test_cases:
            with self.subTest(bracket=bracket):
                actual_class = self.service._get_eligibility_class_from_bracket(bracket)
                self.assertEqual(actual_class, expected_class)
    
    def test_explanation_generation(self):
        """Test explanation generation with different scenarios"""
        breakdown = {
            'burden_score': 75.5,
            'documentation_score': 100.0,
            'disability_score': 0.0
        }
        
        explanation = self.service._generate_explanation(
            final_score=78.5,
            breakdown=breakdown,
            equivalent_income=4734.0,
            adult_equivalent=2.1,
            citizen_data=self.sample_citizen_data
        )
        
        # Check key components are mentioned
        self.assertIn('78.5', explanation)
        self.assertIn('RM4734', explanation)
        self.assertIn('2.1', explanation)
        self.assertIn('4-person household', explanation)
        self.assertIn('75.5pts (55%)', explanation)
        self.assertIn('100.0pts (25%)', explanation)
        self.assertIn('0.0pts (20%)', explanation)
        self.assertIn('Selangor', explanation)
        self.assertIn('B2', explanation)
    
    def test_explanation_generation_with_disability(self):
        """Test explanation includes disability component when applicable"""
        breakdown = {
            'burden_score': 65.0,
            'documentation_score': 0.0,
            'disability_score': 100.0
        }
        
        citizen_data_with_disability = self.sample_citizen_data.copy()
        citizen_data_with_disability['disability_status'] = True
        citizen_data_with_disability['is_signature_valid'] = False
        
        explanation = self.service._generate_explanation(
            final_score=71.0,
            breakdown=breakdown,
            equivalent_income=4500.0,
            adult_equivalent=2.0,
            citizen_data=citizen_data_with_disability
        )
        
        self.assertIn('100.0pts (20%)', explanation)  # Disability component
        self.assertIn('0.0pts (25%)', explanation)    # Documentation component
    
    @patch('services.formula_analysis_service.EligibilityScoreTool')
    def test_analyze_with_scoring_error(self, mock_tool_class):
        """Test error handling when scoring tool returns error"""
        # Setup mock to return error
        mock_tool = Mock()
        mock_tool.forward.return_value = {
            'error': 'Missing required fields: income_bracket'
        }
        mock_tool_class.return_value = mock_tool
        
        service = FormulaAnalysisService()
        
        with self.assertRaises(Exception) as context:
            service.analyze(self.sample_citizen_data)
        
        self.assertIn('Scoring failed', str(context.exception))
        self.assertIn('Missing required fields', str(context.exception))
    
    @patch('services.formula_analysis_service.EligibilityScoreTool')
    def test_analyze_with_tool_exception(self, mock_tool_class):
        """Test error handling when scoring tool raises exception"""
        # Setup mock to raise exception
        mock_tool = Mock()
        mock_tool.forward.side_effect = ValueError("Invalid income bracket")
        mock_tool_class.return_value = mock_tool
        
        service = FormulaAnalysisService()
        
        with self.assertRaises(ValueError):
            service.analyze(self.sample_citizen_data)
    
    def test_get_analysis_info(self):
        """Test analysis method information"""
        info = self.service.get_analysis_info()
        
        # Verify structure
        self.assertIn('method', info)
        self.assertIn('approach', info)
        self.assertIn('transparency', info)
        self.assertIn('components', info)
        self.assertIn('data_sources', info)
        self.assertIn('strengths', info)
        self.assertIn('limitations', info)
        
        # Verify content
        self.assertEqual(info['method'], 'formula_based')
        self.assertEqual(info['transparency'], 'full_mathematical_auditability')
        
        # Verify weights
        components = info['components']
        self.assertEqual(components['burden_weight'], 0.55)
        self.assertEqual(components['documentation_weight'], 0.25)
        self.assertEqual(components['disability_weight'], 0.20)
        
        # Verify strengths and limitations are lists
        self.assertIsInstance(info['strengths'], list)
        self.assertIsInstance(info['limitations'], list)
        self.assertTrue(len(info['strengths']) > 0)
        self.assertTrue(len(info['limitations']) > 0)
    
    def test_component_scores_formatting(self):
        """Test component scores are properly rounded"""
        breakdown = {
            'burden_score': 75.555,
            'documentation_score': 100.0,
            'disability_score': 0.333
        }
        
        # Mock the eligibility tool
        with patch('services.formula_analysis_service.EligibilityScoreTool') as mock_tool_class:
            mock_tool = Mock()
            mock_result = self.mock_scoring_result.copy()
            mock_result['breakdown'] = breakdown
            mock_tool.forward.return_value = mock_result
            mock_tool_class.return_value = mock_tool
            
            service = FormulaAnalysisService()
            result = service.analyze(self.sample_citizen_data)
            
            # Verify rounding
            self.assertEqual(result.component_scores['burden'], 75.6)  # Rounded to 1 decimal
            self.assertEqual(result.component_scores['documentation'], 100.0)
            self.assertEqual(result.component_scores['disability'], 0.3)
    
    def test_formula_analysis_result_dataclass(self):
        """Test FormulaAnalysisResult dataclass functionality"""
        result = FormulaAnalysisResult(
            score=78.5,
            burden_score=78.5,
            eligibility_class='B40',
            explanation='Test explanation',
            equivalent_income=4734.0,
            adult_equivalent=2.1,
            component_scores={'burden': 75, 'documentation': 25, 'disability': 0}
        )
        
        # Verify default confidence
        self.assertEqual(result.confidence, 1.0)
        
        # Verify all fields are accessible
        self.assertEqual(result.score, 78.5)
        self.assertEqual(result.eligibility_class, 'B40')
        self.assertEqual(result.explanation, 'Test explanation')


if __name__ == '__main__':
    unittest.main()
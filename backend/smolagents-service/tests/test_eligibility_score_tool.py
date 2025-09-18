"""
Comprehensive test suite for EligibilityScoreTool.

Tests cover burden calculation, CSV lookup, documentation scoring, 
disability scoring, and all edge cases for the burden-based approach.
"""

import os
import sys
import unittest
import tempfile
from unittest.mock import patch, MagicMock
from datetime import datetime

# Add parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.eligibility_score_tool import EligibilityScoreTool, BurdenCalculationResult, ScoringBreakdown


class TestEligibilityScoreTool(unittest.TestCase):
    """Test cases for EligibilityScoreTool burden-based scoring functionality"""
    
    def setUp(self):
        """Set up test fixtures with mock CSV data"""
        # Create temporary CSV file with test data including W.P. states
        self.csv_content = """state,income_group,income
Johor,B1,2698.0
Johor,B2,3627.0
Johor,B3,4480.0
Johor,B4,5363.0
Johor,M1,6376.0
Johor,M2,7486.0
Selangor,B1,3422.0
Selangor,B2,4601.0
Selangor,B3,5780.0
Selangor,B4,6919.0
Kelantan,B1,1765.0
Kelantan,B2,2281.0
W.P. Kuala Lumpur,B1,5076.0
W.P. Kuala Lumpur,B2,6550.0
W.P. Labuan,B1,2991.0
W.P. Putrajaya,B1,4673.0"""
        
        self.temp_csv = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
        self.temp_csv.write(self.csv_content)
        self.temp_csv.close()
        
        # Initialize tool with mock CSV
        self.tool = EligibilityScoreTool(csv_file_path=self.temp_csv.name)
        
        # Test data sets for different scenarios
        self.valid_johor_b3_applicant = {
            'state': 'Johor',
            'income_bracket': 'B3',
            'household_size': 4,
            'number_of_children': 2,
            'is_signature_valid': True,
            'is_data_authentic': True,
            'disability_status': False
        }
        
        self.selangor_b1_large_family = {
            'state': 'Selangor',
            'income_bracket': 'B1',
            'household_size': 6,
            'number_of_children': 4,
            'is_signature_valid': True,
            'is_data_authentic': True,
            'disability_status': True
        }
        
        self.missing_state_applicant = {
            'state': 'Unknown_State',
            'income_bracket': 'M2',
            'household_size': 2,
            'number_of_children': 0,
            'is_signature_valid': True,
            'is_data_authentic': False,  # Documentation issue
            'disability_status': False
        }
        
        self.incomplete_documentation = {
            'state': 'Johor',
            'income_bracket': 'B4',
            'household_size': 3,
            'number_of_children': 1,
            'is_signature_valid': False,  # Documentation issue
            'is_data_authentic': True,
            'disability_status': False
        }
        
        self.missing_fields_applicant = {
            'state': 'Selangor',
            'income_bracket': 'M1',
            # Missing household_size and number_of_children
            'is_signature_valid': True,
            'is_data_authentic': True,
            'disability_status': False
        }
        
        self.kuala_lumpur_applicant = {
            'state': 'Kuala Lumpur',  # Frontend format - should map to W.P. Kuala Lumpur
            'income_bracket': 'B1',
            'household_size': 2,
            'number_of_children': 0,
            'is_signature_valid': True,
            'is_data_authentic': True,
            'disability_status': False
        }
    
    def tearDown(self):
        """Clean up temporary files"""
        if os.path.exists(self.temp_csv.name):
            os.unlink(self.temp_csv.name)
    
    def test_tool_initialization(self):
        """Test tool initialization and metadata"""
        self.assertEqual(self.tool.name, "eligibility_scorer")
        self.assertIn("applicant_data", self.tool.inputs)
        self.assertIn("final_score", self.tool.outputs)
        self.assertEqual(self.tool.BURDEN_WEIGHT, 0.55)
        self.assertEqual(self.tool.DOCUMENTATION_WEIGHT, 0.25)
        self.assertEqual(self.tool.DISABILITY_WEIGHT, 0.20)
    
    def test_csv_data_loading(self):
        """Test CSV data loading and indexing"""
        self.assertIn('Johor', self.tool.state_income_data)
        self.assertIn('Selangor', self.tool.state_income_data)
        self.assertEqual(self.tool.state_income_data['Johor']['B3'], 4480.0)
        self.assertEqual(self.tool.state_income_data['Selangor']['B1'], 3422.0)
        self.assertEqual(self.tool.state_income_data['Kelantan']['B2'], 2281.0)
    
    def test_equivalent_income_csv_lookup(self):
        """Test CSV equivalent income lookup"""
        # Test successful CSV lookup
        income = self.tool._get_equivalent_income('Johor', 'B3')
        self.assertEqual(income, 4480.0)
        
        income = self.tool._get_equivalent_income('Selangor', 'B1')
        self.assertEqual(income, 3422.0)
        
        # Test different state, same bracket
        johor_b1 = self.tool._get_equivalent_income('Johor', 'B1')
        selangor_b1 = self.tool._get_equivalent_income('Selangor', 'B1')
        self.assertNotEqual(johor_b1, selangor_b1)  # State-specific differences
    
    def test_state_name_mapping(self):
        """Test state name mapping from frontend format to CSV format"""
        # Test W.P. state mapping - Frontend uses 'Kuala Lumpur', CSV uses 'W.P. Kuala Lumpur'
        kl_income = self.tool._get_equivalent_income('Kuala Lumpur', 'B1')
        self.assertEqual(kl_income, 5076.0)  # Should find W.P. Kuala Lumpur in CSV
        
        labuan_income = self.tool._get_equivalent_income('Labuan', 'B1')  
        self.assertEqual(labuan_income, 2991.0)  # Should find W.P. Labuan in CSV
        
        putrajaya_income = self.tool._get_equivalent_income('Putrajaya', 'B1')
        self.assertEqual(putrajaya_income, 4673.0)  # Should find W.P. Putrajaya in CSV
        
        # Regular states should work without mapping
        johor_income = self.tool._get_equivalent_income('Johor', 'B1')
        self.assertEqual(johor_income, 2698.0)
    
    def test_national_fallback_for_missing_state(self):
        """Test national fallback when state not in CSV"""
        # Unknown state should fallback to national threshold
        income = self.tool._get_equivalent_income('Unknown_State', 'M2')
        self.assertEqual(income, self.tool.national_thresholds['M2'])  # 7689
        
        income = self.tool._get_equivalent_income('Missing_State', 'B4')
        self.assertEqual(income, self.tool.national_thresholds['B4'])  # 5249
    
    def test_adult_equivalent_calculation(self):
        """Test Adult Equivalent (AE) calculation"""
        result = self.tool._calculate_burden_score(self.valid_johor_b3_applicant)
        
        # Expected AE = 1 + 0.5*(2-1) + 0.3*2 = 1 + 0.5 + 0.6 = 2.1
        expected_ae = 1 + 0.5 * (4 - 2 - 1) + 0.3 * 2  # 4 total, 2 children, 1 primary adult
        expected_ae = 1 + 0.5 * 1 + 0.3 * 2  # = 1 + 0.5 + 0.6 = 2.1
        
        self.assertAlmostEqual(result.adult_equivalent, 2.1, places=1)
    
    def test_adult_equivalent_edge_cases(self):
        """Test AE calculation edge cases"""
        # Single person household
        single_person = {
            'state': 'Johor', 'income_bracket': 'B3',
            'household_size': 1, 'number_of_children': 0,
            'is_signature_valid': True, 'is_data_authentic': True, 'disability_status': False
        }
        result = self.tool._calculate_burden_score(single_person)
        self.assertEqual(result.adult_equivalent, 1.0)  # Base case
        
        # Large family
        large_family = {
            'state': 'Johor', 'income_bracket': 'B3',
            'household_size': 8, 'number_of_children': 5,
            'is_signature_valid': True, 'is_data_authentic': True, 'disability_status': False
        }
        result = self.tool._calculate_burden_score(large_family)
        # AE = 1 + 0.5*(3-1) + 0.3*5 = 1 + 1.0 + 1.5 = 3.5
        self.assertAlmostEqual(result.adult_equivalent, 3.5, places=1)
    
    def test_burden_ratio_calculation(self):
        """Test burden ratio calculation logic"""
        result = self.tool._calculate_burden_score(self.valid_johor_b3_applicant)
        
        # For equivalent income approach: burden_ratio should reflect household composition
        # Since applicant_income = reference_income, ratio depends on household size relative to base
        expected_equivalent_income = 4480.0
        expected_ae = 2.1
        expected_burden = expected_ae / expected_equivalent_income
        expected_ratio = expected_burden / expected_burden  # Should be 1.0 for same household
        
        self.assertAlmostEqual(result.burden_ratio, 1.0, places=2)
        self.assertEqual(result.equivalent_income, expected_equivalent_income)
    
    def test_tier_based_scoring_b40(self):
        """Test B40 tier scoring ranges"""
        # Test B3 scoring (should be in B40 tier: 70-100 range)
        result = self.tool._calculate_burden_score(self.valid_johor_b3_applicant)
        
        self.assertGreaterEqual(result.score, 70)
        self.assertLessEqual(result.score, 100)
        self.assertIn('B40', result.tier_range)
    
    def test_tier_based_scoring_different_brackets(self):
        """Test different income brackets map to correct tiers"""
        test_cases = [
            ('B1', 'B40'), ('B2', 'B40'), ('B3', 'B40'), ('B4', 'B40'),
            ('M1', 'M40_LOWER'), ('M2', 'M40_LOWER'),
            ('M3', 'M40_UPPER'), ('M4', 'M40_UPPER'),
            ('T1', 'T20'), ('T2', 'T20')
        ]
        
        for income_bracket, expected_tier in test_cases:
            tier_info = self.tool._get_tier_info(income_bracket)
            self.assertEqual(tier_info['tier'], expected_tier)
    
    def test_documentation_scoring_all_or_nothing(self):
        """Test ALL-OR-NOTHING documentation scoring logic"""
        # Both flags true - should get 100%
        both_true = {'is_signature_valid': True, 'is_data_authentic': True}
        score = self.tool._calculate_documentation_score(both_true)
        self.assertEqual(score, 100.0)
        
        # One false - should get 0%
        sig_false = {'is_signature_valid': False, 'is_data_authentic': True}
        score = self.tool._calculate_documentation_score(sig_false)
        self.assertEqual(score, 0.0)
        
        auth_false = {'is_signature_valid': True, 'is_data_authentic': False}
        score = self.tool._calculate_documentation_score(auth_false)
        self.assertEqual(score, 0.0)
        
        # Both false - should get 0%
        both_false = {'is_signature_valid': False, 'is_data_authentic': False}
        score = self.tool._calculate_documentation_score(both_false)
        self.assertEqual(score, 0.0)
        
        # Missing fields - should get 0%
        missing = {'is_signature_valid': None, 'is_data_authentic': True}
        score = self.tool._calculate_documentation_score(missing)
        self.assertEqual(score, 0.0)
    
    def test_disability_scoring_base_cases(self):
        """Test basic disability scoring"""
        # No disability
        no_disability = {'disability_status': False}
        score = self.tool._calculate_disability_score(no_disability)
        self.assertEqual(score, 0.0)
        
        # Has disability
        has_disability = {'disability_status': True}
        score = self.tool._calculate_disability_score(has_disability)
        self.assertEqual(score, 100.0)
        
        # Missing disability field
        missing_field = {}
        score = self.tool._calculate_disability_score(missing_field)
        self.assertEqual(score, 0.0)
    
    def test_disability_scoring_simple_binary(self):
        """Test simple binary disability scoring"""
        # No special circumstances - just basic disability flag
        disability_true = {'disability_status': True}
        score = self.tool._calculate_disability_score(disability_true)
        self.assertEqual(score, 100.0)
        
        disability_false = {'disability_status': False}
        score = self.tool._calculate_disability_score(disability_false)
        self.assertEqual(score, 0.0)
        
        # Missing field should default to False
        missing_disability = {}
        score = self.tool._calculate_disability_score(missing_disability)
        self.assertEqual(score, 0.0)
    
    def test_final_weighted_scoring(self):
        """Test complete weighted scoring calculation"""
        result = self.tool.forward(self.valid_johor_b3_applicant)
        
        # Verify all components are present
        self.assertIn('final_score', result)
        self.assertIn('breakdown', result)
        self.assertIn('weighted_components', result)
        
        # Verify weights sum correctly
        weighted = result['weighted_components']
        calculated_total = (
            weighted['burden_weighted'] + 
            weighted['documentation_weighted'] + 
            weighted['disability_weighted']
        )
        self.assertAlmostEqual(calculated_total, result['final_score'], places=1)
        
        # Verify weight ratios
        burden_weight_check = weighted['burden_weighted'] / result['breakdown']['burden_score']
        self.assertAlmostEqual(burden_weight_check, 0.55, places=2)
    
    def test_missing_fields_detection(self):
        """Test missing field detection and handling"""
        result = self.tool.forward(self.missing_fields_applicant)
        
        self.assertIn('household_size', result['missing_fields'])
        self.assertIn('number_of_children', result['missing_fields'])
        self.assertNotIn('state', result['missing_fields'])
    
    def test_complete_valid_case_johor_b3(self):
        """Test complete scoring for valid Johor B3 applicant"""
        result = self.tool.forward(self.valid_johor_b3_applicant)
        
        # Should have non-zero score
        self.assertGreater(result['final_score'], 0)
        
        # Should use CSV lookup
        self.assertEqual(result['equivalent_income'], 4480.0)
        
        # Should have valid adult equivalent
        self.assertAlmostEqual(result['adult_equivalent'], 2.1, places=1)
        
        # Documentation should be 100 (both flags true)
        self.assertEqual(result['breakdown']['documentation_score'], 100.0)
        
        # Disability should be 0 (no disability)
        self.assertEqual(result['breakdown']['disability_score'], 0.0)
        
        # Should have complete audit trail
        self.assertIn('audit_trail', result)
        self.assertEqual(result['audit_trail']['data_characteristics']['state'], 'Johor')
    
    def test_selangor_large_family_with_benefits(self):
        """Test Selangor B1 large family with disability and special circumstances"""
        result = self.tool.forward(self.selangor_b1_large_family)
        
        # Should use Selangor B1 equivalent income
        self.assertEqual(result['equivalent_income'], 3422.0)
        
        # Large family should have higher adult equivalent
        self.assertGreater(result['adult_equivalent'], 2.5)
        
        # Documentation should be 100
        self.assertEqual(result['breakdown']['documentation_score'], 100.0)
        
        # Disability should be 100 (has disability)
        self.assertEqual(result['breakdown']['disability_score'], 100.0)
        
        # Should have high final score due to large family + disability
        self.assertGreater(result['final_score'], 70)
    
    def test_fallback_with_documentation_issues(self):
        """Test national fallback with documentation problems"""
        result = self.tool.forward(self.missing_state_applicant)
        
        # Should use national fallback for unknown state
        expected_national = self.tool.national_thresholds['M2']  # 7689
        self.assertEqual(result['equivalent_income'], expected_national)
        
        # Documentation should be 0 (one flag false)
        self.assertEqual(result['breakdown']['documentation_score'], 0.0)
        
        # Should still calculate burden score
        self.assertGreater(result['breakdown']['burden_score'], 0)
        
        # Final score should be reduced due to documentation issues
        self.assertLess(result['final_score'], 50)  # Missing 25% from documentation
    
    def test_documentation_failure_impact(self):
        """Test impact of documentation failure on final score"""
        result = self.tool.forward(self.incomplete_documentation)
        
        # Documentation should be 0
        self.assertEqual(result['breakdown']['documentation_score'], 0.0)
        self.assertEqual(result['weighted_components']['documentation_weighted'], 0.0)
        
        # Should still have burden and disability scores
        self.assertGreaterEqual(result['breakdown']['burden_score'], 70)  # B40 range
        self.assertEqual(result['breakdown']['disability_score'], 0.0)
        
        # Final score should be only burden component
        expected_final = result['breakdown']['burden_score'] * 0.55
        self.assertAlmostEqual(result['final_score'], expected_final, places=1)
    
    def test_burden_ratio_thresholds_marking(self):
        """Test that burden ratio thresholds are clearly marked for testing"""
        # This test documents that thresholds need validation
        self.assertIn('high', self.tool.burden_thresholds['B40'])
        self.assertIn('med', self.tool.burden_thresholds['B40'])
        self.assertIn('base', self.tool.burden_thresholds['B40'])
        
        # Different tiers should have different thresholds
        b40_high = self.tool.burden_thresholds['B40']['high']
        t20_high = self.tool.burden_thresholds['T20']['high']
        self.assertNotEqual(b40_high, t20_high)
    
    def test_scoring_statistics_tracking(self):
        """Test scoring statistics collection for monitoring"""
        # Reset stats
        self.tool.scoring_stats = {
            'total_scores_calculated': 0,
            'csv_lookups_successful': 0,
            'national_fallback_used': 0,
            'missing_data_cases': 0
        }
        
        # Process some applications
        self.tool.forward(self.valid_johor_b3_applicant)  # CSV lookup
        self.tool.forward(self.missing_state_applicant)   # National fallback
        self.tool.forward(self.missing_fields_applicant)  # Missing data
        
        stats = self.tool.get_scoring_statistics()
        
        self.assertEqual(self.tool.scoring_stats['total_scores_calculated'], 3)
        self.assertGreaterEqual(self.tool.scoring_stats['csv_lookups_successful'], 1)
        self.assertGreaterEqual(self.tool.scoring_stats['national_fallback_used'], 1)  # May have multiple fallbacks
        self.assertEqual(self.tool.scoring_stats['missing_data_cases'], 1)
        
        # Check calculated rates are reasonable
        self.assertGreater(stats['csv_success_rate'], 0)
        self.assertLessEqual(stats['csv_success_rate'], 1.0)
        self.assertGreater(stats['fallback_usage_rate'], 0)
        self.assertLessEqual(stats['fallback_usage_rate'], 1.0)
    
    def test_error_handling_invalid_csv(self):
        """Test error handling with invalid CSV file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as bad_csv:
            bad_csv.write("invalid,csv,format\nno,proper,headers")
            bad_csv.close()
            
            # Should initialize without crashing, use fallbacks
            tool_with_bad_csv = EligibilityScoreTool(csv_file_path=bad_csv.name)
            result = tool_with_bad_csv.forward(self.valid_johor_b3_applicant)
            
            # Should still produce a score using national fallbacks
            self.assertIn('final_score', result)
            self.assertGreater(result['final_score'], 0)
            
            os.unlink(bad_csv.name)
    
    def test_error_handling_missing_csv(self):
        """Test error handling with missing CSV file"""
        tool_no_csv = EligibilityScoreTool(csv_file_path='/nonexistent/file.csv')
        result = tool_no_csv.forward(self.valid_johor_b3_applicant)
        
        # Should still produce a score using national fallbacks
        self.assertIn('final_score', result)
        self.assertGreater(result['final_score'], 0)
    
    def test_kuala_lumpur_state_mapping_full_flow(self):
        """Test complete scoring flow with Kuala Lumpur state mapping"""
        result = self.tool.forward(self.kuala_lumpur_applicant)
        
        # Should successfully use W.P. Kuala Lumpur CSV data
        self.assertEqual(result['equivalent_income'], 5076.0)
        
        # Should have valid scoring
        self.assertGreater(result['final_score'], 0)
        
        # Should have valid audit trail with mapped state
        chars = result['audit_trail']['data_characteristics']
        self.assertEqual(chars['state'], 'Kuala Lumpur')  # Original frontend name preserved in audit
    
    def test_audit_trail_completeness(self):
        """Test audit trail contains all required information"""
        result = self.tool.forward(self.valid_johor_b3_applicant)
        audit = result['audit_trail']
        
        # Should have timestamp and execution time
        self.assertIn('timestamp', audit)
        self.assertIn('execution_time_seconds', audit)
        
        # Should have data characteristics (without sensitive data)
        chars = audit['data_characteristics']
        self.assertEqual(chars['state'], 'Johor')
        self.assertEqual(chars['income_bracket'], 'B3')
        self.assertEqual(chars['household_size'], 4)
        
        # Should have calculation details
        calc = audit['calculation_details']
        self.assertIn('equivalent_income', calc)
        self.assertIn('adult_equivalent', calc)
        self.assertIn('burden_ratio', calc)
        self.assertIn('weights_applied', calc)


if __name__ == '__main__':
    unittest.main()
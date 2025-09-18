"""
Integration test for EligibilityScoreTool with actual CSV data.

Tests the tool with real CSV data to verify all state mappings and scoring work correctly.
"""

import os
import sys
import unittest

# Add parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.eligibility_score_tool import EligibilityScoreTool


class TestEligibilityScoreToolIntegration(unittest.TestCase):
    """Integration test cases using actual CSV data"""
    
    def setUp(self):
        """Set up test fixtures with real CSV file"""
        # Use the actual CSV file
        csv_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "docs", "hies_cleaned_state_percentile.csv"
        )
        self.tool = EligibilityScoreTool(csv_file_path=csv_path)
        
        # Test cases representing real-world scenarios
        self.test_cases = [
            # Regular state - Johor
            {
                'name': 'Johor B3 Family',
                'data': {
                    'state': 'Johor',
                    'income_bracket': 'B3',
                    'household_size': 4,
                    'number_of_children': 2,
                    'is_signature_valid': True,
                    'is_data_authentic': True,
                    'disability_status': False
                },
                'expected_csv_income': 4734.0  # From CSV check
            },
            
            # W.P. state mapping - Kuala Lumpur
            {
                'name': 'Kuala Lumpur B1 Single',
                'data': {
                    'state': 'Kuala Lumpur',  # Frontend format
                    'income_bracket': 'B1',
                    'household_size': 1,
                    'number_of_children': 0,
                    'is_signature_valid': True,
                    'is_data_authentic': True,
                    'disability_status': False
                },
                'expected_csv_income': 4616.0  # W.P. Kuala Lumpur B1 from CSV
            },
            
            # W.P. state mapping - Labuan
            {
                'name': 'Labuan B1 Couple',
                'data': {
                    'state': 'Labuan',  # Frontend format
                    'income_bracket': 'B1', 
                    'household_size': 2,
                    'number_of_children': 0,
                    'is_signature_valid': True,
                    'is_data_authentic': True,
                    'disability_status': True
                },
                'expected_csv_income': 3672.0  # W.P. Labuan B1 from CSV
            },
            
            # W.P. state mapping - Putrajaya
            {
                'name': 'Putrajaya B1 Family',
                'data': {
                    'state': 'Putrajaya',  # Frontend format
                    'income_bracket': 'B1',
                    'household_size': 3,
                    'number_of_children': 1,
                    'is_signature_valid': True,
                    'is_data_authentic': True,
                    'disability_status': False
                },
                'expected_csv_income': 4930.0  # W.P. Putrajaya B1 from CSV
            },
            
            # Rural state - Kelantan
            {
                'name': 'Kelantan B2 Large Family',
                'data': {
                    'state': 'Kelantan',
                    'income_bracket': 'B2',
                    'household_size': 6,
                    'number_of_children': 4,
                    'is_signature_valid': True,
                    'is_data_authentic': True,
                    'disability_status': False
                },
                'expected_csv_income': 2173.0  # Kelantan B2 from CSV
            },
            
            # Developed state - Selangor
            {
                'name': 'Selangor M1 Professional',
                'data': {
                    'state': 'Selangor',
                    'income_bracket': 'M1',
                    'household_size': 2,
                    'number_of_children': 0,
                    'is_signature_valid': True,
                    'is_data_authentic': True,
                    'disability_status': False
                },
                'expected_csv_income': 9905.0  # Selangor M1 from CSV
            },
            
            # Documentation issues
            {
                'name': 'Johor B4 Doc Issues',
                'data': {
                    'state': 'Johor',
                    'income_bracket': 'B4',
                    'household_size': 3,
                    'number_of_children': 1,
                    'is_signature_valid': False,  # Documentation problem
                    'is_data_authentic': True,
                    'disability_status': False
                },
                'expected_csv_income': 5689.0  # Johor B4 from CSV
            }
        ]
    
    def test_csv_loading_success(self):
        """Test that CSV data loads successfully"""
        self.assertGreater(len(self.tool.state_income_data), 10)
        
        # Check specific states exist
        self.assertIn('Johor', self.tool.state_income_data)
        self.assertIn('Selangor', self.tool.state_income_data) 
        self.assertIn('W.P. Kuala Lumpur', self.tool.state_income_data)
        self.assertIn('W.P. Labuan', self.tool.state_income_data)
        self.assertIn('W.P. Putrajaya', self.tool.state_income_data)
        
        # Check income data exists for common brackets
        self.assertIn('B1', self.tool.state_income_data['Johor'])
        self.assertIn('M1', self.tool.state_income_data['Selangor'])
    
    def test_state_name_mapping_comprehensive(self):
        """Test all W.P. state name mappings"""
        # Test direct lookup for W.P. states using CSV names
        kl_direct = self.tool._get_equivalent_income('W.P. Kuala Lumpur', 'B1')
        self.assertGreater(kl_direct, 0)
        
        # Test mapped lookup using frontend names
        kl_mapped = self.tool._get_equivalent_income('Kuala Lumpur', 'B1')
        self.assertEqual(kl_mapped, kl_direct)  # Should be same value
        
        labuan_mapped = self.tool._get_equivalent_income('Labuan', 'B1')
        self.assertGreater(labuan_mapped, 0)
        
        putrajaya_mapped = self.tool._get_equivalent_income('Putrajaya', 'B1')
        self.assertGreater(putrajaya_mapped, 0)
    
    def test_all_real_world_scenarios(self):
        """Test all realistic applicant scenarios"""
        print("\n=== Testing Real-World Scenarios ===")
        
        for test_case in self.test_cases:
            with self.subTest(test_case=test_case['name']):
                print(f"\nTesting: {test_case['name']}")
                
                # Run scoring
                result = self.tool.forward(test_case['data'])
                
                # Verify basic structure
                self.assertIn('final_score', result)
                self.assertIn('equivalent_income', result)
                self.assertIn('breakdown', result)
                self.assertIn('audit_trail', result)
                
                # Verify CSV lookup worked
                self.assertEqual(result['equivalent_income'], test_case['expected_csv_income'])
                
                # Verify scoring components
                self.assertGreaterEqual(result['breakdown']['burden_score'], 0)
                self.assertIn(result['breakdown']['documentation_score'], [0.0, 100.0])  # All-or-nothing
                self.assertGreaterEqual(result['breakdown']['disability_score'], 0)
                
                # Verify final score is reasonable
                self.assertGreater(result['final_score'], 0)
                self.assertLessEqual(result['final_score'], 100)
                
                # Verify adult equivalent calculation
                self.assertGreater(result['adult_equivalent'], 0)
                
                # Verify burden ratio
                self.assertGreater(result['burden_ratio'], 0)
                
                print(f"  ✓ Equivalent Income: RM{result['equivalent_income']:,.2f}")
                print(f"  ✓ Adult Equivalent: {result['adult_equivalent']:.2f}")
                print(f"  ✓ Final Score: {result['final_score']:.2f}")
                print(f"  ✓ Burden Score: {result['breakdown']['burden_score']:.2f}")
                print(f"  ✓ Documentation: {result['breakdown']['documentation_score']:.0f}")
                print(f"  ✓ Disability: {result['breakdown']['disability_score']:.0f}")
    
    def test_tier_scoring_ranges(self):
        """Test that different income brackets produce appropriate score ranges"""
        print("\n=== Testing Tier Scoring Ranges ===")
        
        # Test different income brackets to verify tier ranges
        tier_tests = [
            ('B1', 'B40', 70, 100),
            ('B3', 'B40', 70, 100), 
            ('M1', 'M40_LOWER', 40, 70),
            ('M2', 'M40_LOWER', 40, 70),
            ('T1', 'T20', 0, 15)
        ]
        
        for bracket, tier_name, min_score, max_score in tier_tests:
            with self.subTest(bracket=bracket, tier=tier_name):
                test_data = {
                    'state': 'Johor',
                    'income_bracket': bracket,
                    'household_size': 2,
                    'number_of_children': 0,
                    'is_signature_valid': True,
                    'is_data_authentic': True,
                    'disability_status': False
                }
                
                result = self.tool.forward(test_data)
                burden_score = result['breakdown']['burden_score']
                
                print(f"  {bracket} ({tier_name}): {burden_score:.2f} (range: {min_score}-{max_score})")
                
                # Verify score falls within expected tier range
                self.assertGreaterEqual(burden_score, min_score)
                self.assertLessEqual(burden_score, max_score)
    
    def test_household_composition_effects(self):
        """Test that household size affects burden scores appropriately"""
        print("\n=== Testing Household Composition Effects ===")
        
        base_data = {
            'state': 'Johor',
            'income_bracket': 'B3',
            'is_signature_valid': True,
            'is_data_authentic': True,
            'disability_status': False
        }
        
        household_scenarios = [
            (1, 0, "Single person"),
            (2, 0, "Couple"),
            (4, 2, "Family with 2 children"),
            (6, 4, "Large family with 4 children")
        ]
        
        scores = []
        for household_size, children, desc in household_scenarios:
            test_data = base_data.copy()
            test_data.update({
                'household_size': household_size,
                'number_of_children': children
            })
            
            result = self.tool.forward(test_data)
            scores.append((desc, result['adult_equivalent'], result['breakdown']['burden_score']))
            
            print(f"  {desc}: AE={result['adult_equivalent']:.2f}, Burden Score={result['breakdown']['burden_score']:.2f}")
        
        # Larger households should generally have higher adult equivalent values
        self.assertLess(scores[0][1], scores[-1][1])  # Single < Large family AE
    
    def test_documentation_all_or_nothing_real_cases(self):
        """Test documentation scoring with real data"""
        print("\n=== Testing Documentation Scoring ===")
        
        base_data = {
            'state': 'Selangor',
            'income_bracket': 'B2',
            'household_size': 3,
            'number_of_children': 1,
            'disability_status': False
        }
        
        doc_scenarios = [
            (True, True, "Both valid", 100.0),
            (True, False, "Signature valid only", 0.0),
            (False, True, "Data authentic only", 0.0),
            (False, False, "Both invalid", 0.0)
        ]
        
        for sig_valid, data_auth, desc, expected_score in doc_scenarios:
            test_data = base_data.copy()
            test_data.update({
                'is_signature_valid': sig_valid,
                'is_data_authentic': data_auth
            })
            
            result = self.tool.forward(test_data)
            doc_score = result['breakdown']['documentation_score']
            
            print(f"  {desc}: {doc_score:.0f}")
            self.assertEqual(doc_score, expected_score)
    
    def test_statistics_tracking_real_usage(self):
        """Test statistics tracking with real usage patterns"""
        print("\n=== Testing Statistics Tracking ===")
        
        # Reset stats
        self.tool.scoring_stats = {
            'total_scores_calculated': 0,
            'csv_lookups_successful': 0,
            'national_fallback_used': 0,
            'missing_data_cases': 0
        }
        
        # Process several different scenarios
        test_scenarios = [
            {'state': 'Johor', 'income_bracket': 'B1'},      # CSV lookup
            {'state': 'Kuala Lumpur', 'income_bracket': 'B2'}, # Mapped lookup
            {'state': 'Unknown', 'income_bracket': 'M1'},     # Fallback
        ]
        
        for scenario in test_scenarios:
            test_data = {
                'household_size': 2,
                'number_of_children': 0,
                'is_signature_valid': True,
                'is_data_authentic': True,
                'disability_status': False
            }
            test_data.update(scenario)
            
            self.tool.forward(test_data)
        
        stats = self.tool.get_scoring_statistics()
        
        print(f"  Total calculations: {self.tool.scoring_stats['total_scores_calculated']}")
        print(f"  CSV lookups successful: {self.tool.scoring_stats['csv_lookups_successful']}")
        print(f"  National fallbacks used: {self.tool.scoring_stats['national_fallback_used']}")
        print(f"  CSV success rate: {stats['csv_success_rate']:.2%}")
        print(f"  Fallback usage rate: {stats['fallback_usage_rate']:.2%}")
        
        # Verify tracking is working
        self.assertEqual(self.tool.scoring_stats['total_scores_calculated'], 3)
        self.assertGreaterEqual(self.tool.scoring_stats['csv_lookups_successful'], 2)  # At least Johor + KL mapping


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
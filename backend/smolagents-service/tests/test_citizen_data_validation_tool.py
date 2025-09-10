"""
Comprehensive test suite for CitizenDataValidationTool.

Tests cover all validation categories, confidence levels, and edge cases.
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime

# Add parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.citizen_data_validation_tool import CitizenDataValidationTool, ValidationResult


class TestCitizenDataValidationTool(unittest.TestCase):
    """Test cases for CitizenDataValidationTool functionality"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.tool = CitizenDataValidationTool(enable_audit_logging=True)
        
        # Test data sets for different scenarios
        self.valid_b40_citizen = {
            "citizen_id": "123456789012",
            "income_bracket": "B40",
            "state": "Selangor",
            "age": 35,
            "residency_duration_months": 12,
            "employment_status": "employed",
            "family_size": 4,
            "monthly_income": 2500,
            "has_disability": False
        }
        
        self.valid_m40_citizen = {
            "citizen_id": "123456789013",
            "income_bracket": "M40",
            "state": "Johor",
            "age": 28,
            "residency_duration_months": 24,
            "employment_status": "employed",
            "family_size": 2
        }
        
        self.incomplete_citizen = {
            "citizen_id": "123456789014",
            "income_bracket": "B40",
            "age": 40
            # Missing required fields: state, residency_duration_months
        }
        
        self.invalid_format_citizen = {
            "citizen_id": "123456789015",
            "income_bracket": "B40",
            "state": "Perak",
            "age": "thirty-five",  # Should be int
            "residency_duration_months": "twelve"  # Should be int
        }
        
        self.unknown_bracket_citizen = {
            "citizen_id": "123456789016",
            "income_bracket": "UNKNOWN_BRACKET",
            "state": "Penang",
            "age": 30,
            "residency_duration_months": 8
        }
    
    def test_tool_initialization(self):
        """Test tool initialization and metadata"""
        self.assertEqual(self.tool.name, "citizen_data_validator")
        self.assertIn("citizen_data", self.tool.inputs)
        self.assertIn("validation_type", self.tool.inputs)
        self.assertIn("overall_valid", self.tool.outputs)
        self.assertIn("confidence_score", self.tool.outputs)
        self.assertTrue(self.tool.enable_audit_logging)
    
    def test_format_validation_valid_data(self):
        """Test format validation with valid data"""
        result = self.tool._validate_format(self.valid_b40_citizen)
        
        self.assertEqual(result.category, "format")
        self.assertTrue(result.valid)
        self.assertEqual(result.confidence, 1.0)  # 100% confidence for format validation
        self.assertFalse(result.requires_llm_review)
        self.assertIn("All required fields present", result.reasoning)
        self.assertIsNone(result.missing_fields)
    
    def test_format_validation_missing_fields(self):
        """Test format validation with missing required fields"""
        result = self.tool._validate_format(self.incomplete_citizen)
        
        self.assertFalse(result.valid)
        self.assertEqual(result.confidence, 1.0)  # Still 100% confidence in rule-based validation
        self.assertIn("state", result.missing_fields)
        self.assertIn("residency_duration_months", result.missing_fields)
        self.assertIn("Missing required fields", result.reasoning)
    
    def test_format_validation_wrong_types(self):
        """Test format validation with incorrect data types"""
        result = self.tool._validate_format(self.invalid_format_citizen)
        
        self.assertFalse(result.valid)
        self.assertEqual(result.confidence, 1.0)
        self.assertIn("Type errors", result.reasoning)
        self.assertIn("age must be integer", result.reasoning)
    
    def test_completeness_validation_high_completeness(self):
        """Test completeness validation with many optional fields"""
        result = self.tool._validate_completeness(self.valid_b40_citizen)
        
        self.assertTrue(result.valid)  # Should pass 50% threshold
        self.assertGreater(result.confidence, 0.8)  # High confidence for complete data
        self.assertIn("Data completeness:", result.reasoning)
        # Should not require LLM review for complete data
        self.assertFalse(result.requires_llm_review)
    
    def test_completeness_validation_low_completeness(self):
        """Test completeness validation with few optional fields"""
        minimal_data = {
            "citizen_id": "123456789017",
            "income_bracket": "B40",
            "state": "Kedah",
            "age": 25,
            "residency_duration_months": 10
            # No optional fields
        }
        
        result = self.tool._validate_completeness(minimal_data)
        
        self.assertFalse(result.valid)  # Below 50% threshold
        self.assertLess(result.confidence, 0.8)
        self.assertTrue(result.requires_llm_review)  # Very incomplete data needs review
        self.assertIsNotNone(result.recommendations)
    
    def test_eligibility_validation_b40_eligible(self):
        """Test B40 eligibility validation with eligible citizen (☆☆☆ level - 100% confidence)"""
        result = self.tool._validate_eligibility(self.valid_b40_citizen)
        
        self.assertEqual(result.category, "eligibility")
        self.assertTrue(result.valid)
        self.assertEqual(result.confidence, 1.0)  # 100% confidence for B40
        self.assertFalse(result.requires_llm_review)  # B40 is deterministic
        self.assertIn("B40 (eligible with high confidence)", result.reasoning)
        self.assertIn("Age: 35 (eligible", result.reasoning)
        self.assertIn("Residency: 12 months (eligible", result.reasoning)
    
    def test_eligibility_validation_b40_ineligible_age(self):
        """Test B40 eligibility with invalid age"""
        invalid_age_citizen = self.valid_b40_citizen.copy()
        invalid_age_citizen["age"] = 17  # Below minimum age
        
        result = self.tool._validate_eligibility(invalid_age_citizen)
        
        self.assertFalse(result.valid)
        self.assertEqual(result.confidence, 1.0)  # Still 100% confidence in rule-based decision
        self.assertFalse(result.requires_llm_review)
        self.assertIn("Age: 17 (not eligible", result.reasoning)
    
    def test_eligibility_validation_b40_ineligible_residency(self):
        """Test B40 eligibility with insufficient residency"""
        invalid_residency_citizen = self.valid_b40_citizen.copy()
        invalid_residency_citizen["residency_duration_months"] = 3  # Below minimum
        
        result = self.tool._validate_eligibility(invalid_residency_citizen)
        
        self.assertFalse(result.valid)
        self.assertEqual(result.confidence, 1.0)
        self.assertIn("Residency: 3 months (not eligible", result.reasoning)
    
    def test_eligibility_validation_m40_needs_review(self):
        """Test M40 eligibility validation (★★☆ level - needs LLM review)"""
        result = self.tool._validate_eligibility(self.valid_m40_citizen)
        
        self.assertFalse(result.valid)  # Conservative: assume ineligible until LLM review
        self.assertLess(result.confidence, 1.0)  # Lower confidence for non-B40
        self.assertTrue(result.requires_llm_review)  # Needs LLM guidance
        self.assertIn("M40 (known bracket but requires LLM analysis", result.reasoning)
        self.assertIsNotNone(result.recommendations)
        self.assertIn("LLM analysis required", result.recommendations[0])
    
    def test_eligibility_validation_unknown_bracket(self):
        """Test eligibility validation with unknown income bracket"""
        result = self.tool._validate_eligibility(self.unknown_bracket_citizen)
        
        self.assertFalse(result.valid)
        self.assertEqual(result.confidence, 0.2)  # Very low confidence
        self.assertTrue(result.requires_llm_review)
        self.assertIn("Unknown income bracket", result.reasoning)
        self.assertIn("Verify and correct income bracket", result.recommendations[0])
    
    def test_eligibility_validation_strict_mode(self):
        """Test eligibility validation in strict mode"""
        # Test M40 in strict mode vs regular mode
        regular_result = self.tool._validate_eligibility(self.valid_m40_citizen, strict_mode=False)
        strict_result = self.tool._validate_eligibility(self.valid_m40_citizen, strict_mode=True)
        
        self.assertGreater(strict_result.confidence, regular_result.confidence)
        self.assertTrue(both_require_review := regular_result.requires_llm_review and strict_result.requires_llm_review)
    
    def test_calculate_overall_result_all_valid(self):
        """Test overall result calculation with all validations passing"""
        validation_results = {
            "format": ValidationResult("format", True, 1.0, "All fields valid"),
            "completeness": ValidationResult("completeness", True, 0.9, "Good completeness"),
            "eligibility": ValidationResult("eligibility", True, 1.0, "B40 eligible")
        }
        
        result = self.tool._calculate_overall_result(validation_results)
        
        self.assertTrue(result["valid"])
        self.assertGreater(result["confidence_score"], 0.9)
    
    def test_calculate_overall_result_critical_failure(self):
        """Test overall result calculation with critical validation failure"""
        validation_results = {
            "format": ValidationResult("format", False, 1.0, "Missing fields"),
            "completeness": ValidationResult("completeness", True, 0.9, "Good completeness"),
            "eligibility": ValidationResult("eligibility", True, 1.0, "B40 eligible")
        }
        
        result = self.tool._calculate_overall_result(validation_results)
        
        self.assertFalse(result["valid"])  # Format is critical
        self.assertLess(result["confidence_score"], 1.0)
    
    def test_full_validation_b40_success(self):
        """Test complete validation workflow with successful B40 citizen"""
        result = self.tool.forward(self.valid_b40_citizen, validation_type="all")
        
        self.assertTrue(result["overall_valid"])
        self.assertGreater(result["confidence_score"], 0.8)
        self.assertFalse(result["requires_manual_review"])
        
        # Check validation details structure
        self.assertIn("format", result["validation_details"])
        self.assertIn("completeness", result["validation_details"])
        self.assertIn("eligibility", result["validation_details"])
        
        # Check audit trail
        self.assertIn("audit_trail", result)
        self.assertIn("timestamp", result["audit_trail"])
        self.assertIn("data_characteristics", result["audit_trail"])
        
        # Verify no sensitive data in audit trail (Requirement 6.1)
        audit_data = result["audit_trail"]["data_characteristics"]
        self.assertNotIn("citizen_id", audit_data)  # Sensitive data should not be logged
        self.assertIn("income_bracket", audit_data)  # Non-sensitive classification is OK
    
    def test_full_validation_m40_needs_review(self):
        """Test complete validation workflow with M40 citizen requiring review"""
        result = self.tool.forward(self.valid_m40_citizen, validation_type="all")
        
        self.assertFalse(result["overall_valid"])  # Conservative approach
        self.assertTrue(result["requires_manual_review"])
        self.assertIn("LLM", " ".join(result["recommendations"]))
        
        # Check that eligibility validation flagged LLM review need
        eligibility_details = result["validation_details"]["eligibility"]
        self.assertTrue(eligibility_details["requires_llm_review"])
    
    def test_validation_type_filtering(self):
        """Test different validation type parameters"""
        # Test format only
        format_result = self.tool.forward(self.valid_b40_citizen, validation_type="format")
        self.assertIn("format", format_result["validation_details"])
        self.assertNotIn("eligibility", format_result["validation_details"])
        
        # Test eligibility only
        eligibility_result = self.tool.forward(self.valid_b40_citizen, validation_type="eligibility")
        self.assertIn("eligibility", eligibility_result["validation_details"])
        self.assertNotIn("format", eligibility_result["validation_details"])
    
    def test_error_handling(self):
        """Test error handling for malformed input"""
        # Test with None input
        result = self.tool.forward(None, validation_type="all")
        self.assertFalse(result["overall_valid"])
        self.assertEqual(result["confidence_score"], 0.0)
        self.assertTrue(result["requires_manual_review"])
        self.assertIn("error", result)
    
    def test_recommendations_generation(self):
        """Test recommendation generation for various scenarios"""
        # Test with incomplete data
        result = self.tool.forward(self.incomplete_citizen, validation_type="all")
        recommendations = result["recommendations"]
        
        self.assertIsInstance(recommendations, list)
        self.assertGreater(len(recommendations), 0)
        
        # Should include recommendations for missing fields and manual review
        recommendation_text = " ".join(recommendations).lower()
        self.assertTrue(
            any(keyword in recommendation_text for keyword in ["review", "manual", "missing", "consider"])
        )
    
    def test_validation_statistics(self):
        """Test validation statistics tracking"""
        initial_stats = self.tool.get_validation_statistics()
        
        # Perform some validations
        self.tool.forward(self.valid_b40_citizen, validation_type="all")  # High confidence
        self.tool.forward(self.valid_m40_citizen, validation_type="all")   # Manual review required
        
        updated_stats = self.tool.get_validation_statistics()
        
        # Check statistics updated
        self.assertGreater(
            updated_stats["validation_stats"]["total_validations"],
            initial_stats["validation_stats"]["total_validations"]
        )
        self.assertGreater(
            updated_stats["validation_stats"]["high_confidence_validations"],
            initial_stats["validation_stats"]["high_confidence_validations"]
        )
        self.assertGreater(
            updated_stats["validation_stats"]["manual_review_required"], 
            initial_stats["validation_stats"]["manual_review_required"]
        )
    
    def test_audit_trail_no_sensitive_data(self):
        """Test that audit trail doesn't contain sensitive citizen data"""
        result = self.tool.forward(self.valid_b40_citizen, validation_type="all")
        audit_trail = result["audit_trail"]
        
        # Convert entire audit trail to string for sensitive data check
        audit_str = str(audit_trail).lower()
        
        # Should not contain sensitive identifiers
        self.assertNotIn(self.valid_b40_citizen["citizen_id"], audit_str)
        
        # Should contain non-sensitive characteristics
        self.assertIn("data_characteristics", audit_trail)
        self.assertIn("total_fields", audit_trail["data_characteristics"])
        self.assertIn("income_bracket", audit_trail["data_characteristics"])
    
    def test_confidence_levels_align_with_design(self):
        """Test that confidence levels align with design document requirements"""
        # B40 should get 100% confidence (☆☆☆ level)
        b40_result = self.tool.forward(self.valid_b40_citizen, validation_type="eligibility")
        eligibility_details = b40_result["validation_details"]["eligibility"]
        self.assertEqual(eligibility_details["confidence"], 1.0)
        self.assertFalse(eligibility_details["requires_llm_review"])
        
        # M40 should get lower confidence and require LLM review (★★☆ level)
        m40_result = self.tool.forward(self.valid_m40_citizen, validation_type="eligibility")
        m40_eligibility_details = m40_result["validation_details"]["eligibility"]
        self.assertLess(m40_eligibility_details["confidence"], 1.0)
        self.assertTrue(m40_eligibility_details["requires_llm_review"])
    
    def test_case_insensitive_income_bracket(self):
        """Test that income bracket validation is case-insensitive"""
        lowercase_citizen = self.valid_b40_citizen.copy()
        lowercase_citizen["income_bracket"] = "b40"  # lowercase
        
        result = self.tool.forward(lowercase_citizen, validation_type="eligibility")
        eligibility_details = result["validation_details"]["eligibility"]
        
        self.assertTrue(eligibility_details["valid"])
        self.assertEqual(eligibility_details["confidence"], 1.0)
    
    def test_validation_result_dataclass(self):
        """Test ValidationResult dataclass functionality"""
        result = ValidationResult(
            category="test",
            valid=True,
            confidence=0.95,
            reasoning="Test reasoning",
            missing_fields=["field1"],
            recommendations=["Fix field1"],
            requires_llm_review=False
        )
        
        self.assertEqual(result.category, "test")
        self.assertTrue(result.valid)
        self.assertEqual(result.confidence, 0.95)
        self.assertIn("field1", result.missing_fields)
        self.assertFalse(result.requires_llm_review)


if __name__ == "__main__":
    # Basic smoke test that can be run directly
    print("Running CitizenDataValidationTool smoke test...")
    
    try:
        # Test tool initialization
        tool = CitizenDataValidationTool()
        print(f"✓ Tool initialized: {tool.name}")
        
        # Test B40 validation (should be high confidence)
        test_b40_citizen = {
            "citizen_id": "123456789012",
            "income_bracket": "B40",
            "state": "Selangor",
            "age": 35,
            "residency_duration_months": 12,
            "employment_status": "employed",
            "family_size": 4
        }
        
        result = tool.forward(test_b40_citizen, validation_type="all")
        print(f"✓ B40 validation completed - Valid: {result['overall_valid']}, Confidence: {result['confidence_score']:.2f}")
        
        # Test M40 validation (should require manual review)
        test_m40_citizen = {
            "citizen_id": "123456789013",
            "income_bracket": "M40",
            "state": "Johor", 
            "age": 28,
            "residency_duration_months": 24
        }
        
        m40_result = tool.forward(test_m40_citizen, validation_type="all")
        print(f"✓ M40 validation completed - Manual review required: {m40_result['requires_manual_review']}")
        
        # Test statistics
        stats = tool.get_validation_statistics()
        print(f"✓ Statistics tracking working - Total validations: {stats['validation_stats']['total_validations']}")
        
        print("\nSmoke test completed successfully!")
        print("=" * 50)
        
    except Exception as e:
        print(f"✗ Smoke test failed: {e}")
        sys.exit(1)
    
    # Run full test suite if called as main
    print("Running full test suite...")
    unittest.main(verbosity=2)
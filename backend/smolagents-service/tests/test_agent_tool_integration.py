#!/usr/bin/env python3
"""
Integration tests for CitizenAnalysisAgent with CitizenDataValidationTool.
Tests the complete agent-tool integration for Phase 2.2 completion.
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.citizen_analysis_agent import CitizenAnalysisAgent, AgentConfig
from tools.citizen_data_validation_tool import CitizenDataValidationTool


class TestAgentToolIntegration(unittest.TestCase):
    """Integration tests for agent and validation tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = AgentConfig(model_name="gpt-4o-mini", temperature=0.1)
        
        # Test citizen data
        self.b40_citizen_data = {
            "citizen_id": "123456789012",
            "name": "Ahmad Abdullah",
            "income_bracket": "B40",
            "state": "Selangor",
            "age": 35,
            "residency_duration_months": 12,
            "employment_status": "employed",
            "family_size": 4,
            "monthly_income": 2500,
            "has_disability": False
        }
        
        self.m40_citizen_data = {
            "citizen_id": "123456789013", 
            "name": "Sarah Lee",
            "income_bracket": "M40",
            "state": "Johor",
            "age": 28,
            "residency_duration_months": 24,
            "employment_status": "employed",
            "family_size": 2
        }
    
    def test_agent_includes_validation_tool(self):
        """Test that agent automatically includes validation tool"""
        agent = CitizenAnalysisAgent(config=self.config)
        
        # Check that validation tool was added
        self.assertGreater(len(agent.tools), 0)
        
        # Find validation tool in tools list
        validation_tool = None
        for tool in agent.tools:
            if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                validation_tool = tool
                break
        
        self.assertIsNotNone(validation_tool, "Validation tool should be included in agent tools")
        self.assertIsInstance(validation_tool, CitizenDataValidationTool)
    
    def test_validation_tool_direct_integration(self):
        """Test validation tool integration directly"""
        agent = CitizenAnalysisAgent(config=self.config)
        
        # Get the validation tool
        validation_tool = None
        for tool in agent.tools:
            if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                validation_tool = tool
                break
        
        self.assertIsNotNone(validation_tool)
        
        # Test B40 validation through the tool
        b40_result = validation_tool.forward(
            citizen_data=self.b40_citizen_data,
            validation_type="all"
        )
        
        self.assertTrue(b40_result["overall_valid"])
        self.assertGreater(b40_result["confidence_score"], 0.8)
        self.assertFalse(b40_result["requires_manual_review"])
        
        # Test M40 validation through the tool
        m40_result = validation_tool.forward(
            citizen_data=self.m40_citizen_data,
            validation_type="all"
        )
        
        self.assertFalse(m40_result["overall_valid"])  # Conservative for non-B40
        self.assertTrue(m40_result["requires_manual_review"])
    
    def test_agent_tool_metadata_compatibility(self):
        """Test that agent can access tool metadata correctly"""
        agent = CitizenAnalysisAgent(config=self.config)
        
        validation_tool = None
        for tool in agent.tools:
            if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                validation_tool = tool
                break
        
        # Test tool metadata
        self.assertEqual(validation_tool.name, "citizen_data_validator")
        self.assertIn("citizen_data", validation_tool.inputs)
        self.assertEqual(validation_tool.output_type, "object")
        self.assertIn("Validates citizen data", validation_tool.description)
    
    def test_agent_info_includes_validation_tool(self):
        """Test that agent info correctly reports validation tool"""
        agent = CitizenAnalysisAgent(config=self.config)
        info = agent.get_agent_info()
        
        self.assertGreater(info["tools_count"], 0)
        self.assertIn("CitizenDataValidationTool", info["tool_names"])
    
    def test_multiple_tools_integration(self):
        """Test agent with multiple tools including validation tool"""
        # Create agent with additional custom tools
        custom_tool = MagicMock()
        custom_tool.name = "custom_test_tool"
        
        agent = CitizenAnalysisAgent(config=self.config, tools=[custom_tool])
        
        # Should have both custom tool and validation tool
        self.assertGreater(len(agent.tools), 1)
        
        tool_names = []
        for tool in agent.tools:
            if hasattr(tool, 'name'):
                tool_names.append(tool.name)
        
        self.assertIn("custom_test_tool", tool_names)
        self.assertIn("citizen_data_validator", tool_names)
    
    @patch('smolagents.CodeAgent.run')
    def test_agent_run_with_validation_context(self, mock_parent_run):
        """Test agent run method has access to validation tool context"""
        mock_parent_run.return_value = "Analysis completed with validation"
        
        agent = CitizenAnalysisAgent(config=self.config)
        
        # Simulate analysis run
        result = agent.run(
            citizen_data=self.b40_citizen_data,
            query="Validate and analyze citizen eligibility"
        )
        
        self.assertEqual(result["status"], "completed")
        self.assertIn("Analysis completed", result["raw_result"])
        self.assertEqual(agent.analysis_count, 1)
        
        # Verify agent has validation tool available during run
        validation_tool_available = False
        for tool in agent.tools:
            if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                validation_tool_available = True
                break
        
        self.assertTrue(validation_tool_available)
    
    def test_validation_tool_audit_integration(self):
        """Test that validation tool audit trail integrates with agent context"""
        agent = CitizenAnalysisAgent(config=self.config)
        
        validation_tool = None
        for tool in agent.tools:
            if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                validation_tool = tool
                break
        
        # Perform validation and check audit trail
        result = validation_tool.forward(
            citizen_data=self.b40_citizen_data,
            validation_type="all"
        )
        
        audit_trail = result["audit_trail"]
        self.assertIn("timestamp", audit_trail)
        self.assertIn("data_characteristics", audit_trail)
        self.assertIn("tool_version", audit_trail)
        self.assertIn("validation_stats", audit_trail)
        
        # Verify agent can access validation statistics
        stats = validation_tool.get_validation_statistics()
        self.assertIn("validation_stats", stats)
        self.assertIn("high_confidence_rate", stats)
    
    def test_tool_configuration_alignment(self):
        """Test that tool configuration aligns with agent configuration"""
        config = AgentConfig(model_name="gpt-4o", temperature=0.2)
        agent = CitizenAnalysisAgent(config=config)
        
        # Agent should maintain its configuration
        self.assertEqual(agent.config.model_name, "gpt-4o")
        self.assertEqual(agent.config.temperature, 0.2)
        
        # Validation tool should be properly initialized
        validation_tool = None
        for tool in agent.tools:
            if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                validation_tool = tool
                break
        
        self.assertIsNotNone(validation_tool)
        self.assertTrue(validation_tool.enable_audit_logging)
    
    def test_error_handling_integration(self):
        """Test error handling between agent and validation tool"""
        agent = CitizenAnalysisAgent(config=self.config)
        
        validation_tool = None
        for tool in agent.tools:
            if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                validation_tool = tool
                break
        
        # Test with malformed data
        malformed_data = {"invalid": "data"}
        
        result = validation_tool.forward(
            citizen_data=malformed_data,
            validation_type="all"
        )
        
        # Should handle error gracefully
        self.assertFalse(result["overall_valid"])
        self.assertTrue(result["requires_manual_review"])
        self.assertIn("error", result)
    
    def test_design_requirements_compliance(self):
        """Test compliance with design document requirements"""
        agent = CitizenAnalysisAgent(config=self.config)
        
        # Requirement 9.2: Should include custom analysis tools
        tool_names = [tool.name for tool in agent.tools if hasattr(tool, 'name')]
        self.assertIn("citizen_data_validator", tool_names)
        
        # Requirement 1.1: Should accept and validate data format
        validation_tool = None
        for tool in agent.tools:
            if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                validation_tool = tool
                break
        
        result = validation_tool.forward(
            citizen_data=self.b40_citizen_data,
            validation_type="format"
        )
        
        # Should validate format successfully
        format_details = result["validation_details"]["format"]
        self.assertTrue(format_details["valid"])
        self.assertEqual(format_details["confidence"], 1.0)  # 100% confidence for format validation
        
        # Requirement 5.1: Should return clear validation error messages
        incomplete_data = {"citizen_id": "123", "age": 25}  # Missing required fields
        
        error_result = validation_tool.forward(
            citizen_data=incomplete_data,
            validation_type="format"
        )
        
        format_error_details = error_result["validation_details"]["format"]
        self.assertFalse(format_error_details["valid"])
        self.assertIn("Missing required fields", format_error_details["reasoning"])


class TestPhase2Point2Completion(unittest.TestCase):
    """Test Phase 2.2 completion criteria"""
    
    def test_phase_2_2_deliverables(self):
        """Test all Phase 2.2 deliverables are implemented"""
        # 1. CitizenDataValidationTool class extending Tool ✓
        tool = CitizenDataValidationTool()
        self.assertIsInstance(tool, CitizenDataValidationTool)
        self.assertEqual(tool.name, "citizen_data_validator")
        
        # 2. Format validation (required fields check) ✓
        test_data = {"citizen_id": "123", "income_bracket": "B40"}  # Missing fields
        result = tool._validate_format(test_data)
        self.assertFalse(result.valid)
        self.assertIsNotNone(result.missing_fields)
        
        # 3. Basic eligibility validation (B40 only, income bracket, age) ✓
        eligible_data = {
            "citizen_id": "123456789012",
            "income_bracket": "B40",
            "state": "Selangor",
            "age": 35,
            "residency_duration_months": 12
        }
        
        eligibility_result = tool._validate_eligibility(eligible_data)
        self.assertTrue(eligibility_result.valid)
        self.assertEqual(eligibility_result.confidence, 1.0)
        
        # 4. Agent integration ✓
        agent = CitizenAnalysisAgent()
        validation_tool_present = any(
            hasattr(tool, 'name') and tool.name == 'citizen_data_validator'
            for tool in agent.tools
        )
        self.assertTrue(validation_tool_present)
        
        print("✅ Phase 2.2 - All deliverables implemented successfully!")


def run_integration_test():
    """Run integration test as standalone script"""
    print("=" * 60)
    print("Agent-Tool Integration Test (Phase 2.2)")
    print("=" * 60)
    
    try:
        # Test 1: Agent initialization with validation tool
        print("\n1. Testing agent initialization with validation tool...")
        agent = CitizenAnalysisAgent()
        # Check if tools is dict (new format) or list (old format)
        if isinstance(agent.tools, dict):
            validation_tool_count = 1 if 'citizen_data_validator' in agent.tools else 0
            validation_tool = agent.tools.get('citizen_data_validator')
        else:
            validation_tool_count = sum(
                1 for tool in agent.tools 
                if hasattr(tool, 'name') and tool.name == 'citizen_data_validator'
            )
            validation_tool = None
            for tool in agent.tools:
                if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                    validation_tool = tool
                    break
        print(f"✓ Validation tool integrated: {validation_tool_count} validation tool(s) found")
        
        # Test 2: B40 validation through agent tool
        print("\n2. Testing B40 validation through agent...")
        b40_data = {
            "citizen_id": "123456789012",
            "income_bracket": "B40",
            "state": "Selangor", 
            "age": 35,
            "residency_duration_months": 12,
            "employment_status": "employed",
            "family_size": 4
        }
        
        validation_tool = None
        for tool in agent.tools:
            if hasattr(tool, 'name') and tool.name == 'citizen_data_validator':
                validation_tool = tool
                break
        
        b40_result = validation_tool.forward(b40_data, validation_type="all")
        print(f"✓ B40 validation - Valid: {b40_result['overall_valid']}, Confidence: {b40_result['confidence_score']:.2f}")
        
        # Test 3: M40 validation (should require manual review)
        print("\n3. Testing M40 validation...")
        m40_data = {
            "citizen_id": "123456789013",
            "income_bracket": "M40",
            "state": "Johor",
            "age": 28,
            "residency_duration_months": 24
        }
        
        m40_result = validation_tool.forward(m40_data, validation_type="all")
        print(f"✓ M40 validation - Valid: {m40_result['overall_valid']}, Manual Review: {m40_result['requires_manual_review']}")
        
        # Test 4: Agent info with tool integration
        print("\n4. Testing agent information...")
        info = agent.get_agent_info()
        print(f"✓ Agent tools: {info['tools_count']} total, includes: {info['tool_names']}")
        
        print("\n" + "=" * 60)
        print("✅ Integration test completed successfully!")
        print("Phase 2.2 - CitizenDataValidationTool integration complete")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n✗ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_integration_test()
    
    if success:
        print("\nRunning full test suite...")
        unittest.main(verbosity=2)
    else:
        sys.exit(1)
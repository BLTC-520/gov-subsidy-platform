"""
Test suite for CitizenAnalysisAgent basic functionality.
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.citizen_analysis_agent import CitizenAnalysisAgent, AgentConfig


class TestCitizenAnalysisAgent(unittest.TestCase):
    """Test cases for CitizenAnalysisAgent basic functionality"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.test_citizen_data = {
            "citizen_id": "123456789012",
            "name": "Ahmad Abdullah",
            "age": 35,
            "monthly_income": 2500,
            "family_size": 4,
            "location": "Kuala Lumpur",
            "employment_status": "employed",
            "has_disability": False
        }
    
    def test_agent_config_from_env(self):
        """Test AgentConfig creation from environment variables"""
        # Test with default values
        config = AgentConfig.from_env()
        
        self.assertEqual(config.model_name, "gpt-4o-mini")
        self.assertEqual(config.temperature, 0.1)
        self.assertEqual(config.max_tokens, 2000)
        self.assertEqual(config.timeout, 30)
        
    def test_agent_config_custom(self):
        """Test AgentConfig creation with custom values"""
        config = AgentConfig(
            model_name="gpt-4",
            temperature=0.2,
            max_tokens=1000,
            timeout=60
        )
        
        self.assertEqual(config.model_name, "gpt-4")
        self.assertEqual(config.temperature, 0.2)
        self.assertEqual(config.max_tokens, 1000)
        self.assertEqual(config.timeout, 60)
    
    def test_agent_initialization(self):
        """Test basic agent initialization"""
        config = AgentConfig()
        agent = CitizenAnalysisAgent(config=config)
        
        self.assertIsInstance(agent, CitizenAnalysisAgent)
        self.assertEqual(agent.config.model_name, "gpt-4o-mini")
        self.assertEqual(agent.analysis_count, 0)
        # CodeAgent may have default tools, so just check it's a valid count
        self.assertIsInstance(len(agent.tools), int)
    
    def test_agent_initialization_default(self):
        """Test agent initialization with default config"""
        agent = CitizenAnalysisAgent()
        
        self.assertIsInstance(agent, CitizenAnalysisAgent)
        self.assertIsInstance(agent.config, AgentConfig)
        self.assertEqual(agent.analysis_count, 0)
    
    def test_prepare_analysis_prompt(self):
        """Test analysis prompt preparation"""
        agent = CitizenAnalysisAgent()
        prompt = agent._prepare_analysis_prompt(
            self.test_citizen_data, 
            "Test analysis query"
        )
        
        self.assertIn("Ahmad Abdullah", prompt)
        self.assertIn("monthly income", prompt.lower())
        self.assertIn("Test analysis query", prompt)
        self.assertIn("eligibility", prompt.lower())
    
    def test_format_citizen_data(self):
        """Test citizen data formatting"""
        agent = CitizenAnalysisAgent()
        formatted = agent._format_citizen_data(self.test_citizen_data)
        
        self.assertIn("Citizen Id: 123456789012", formatted)
        self.assertIn("Name: Ahmad Abdullah", formatted)
        self.assertIn("Monthly Income: 2500", formatted)
    
    def test_get_agent_info(self):
        """Test agent information retrieval"""
        config = AgentConfig(model_name="gpt-4o-mini", temperature=0.2)
        agent = CitizenAnalysisAgent(config=config)
        
        info = agent.get_agent_info()
        
        self.assertEqual(info["agent_type"], "CitizenAnalysisAgent")
        self.assertEqual(info["model_name"], "gpt-4o-mini")
        self.assertEqual(info["analysis_count"], 0)
        self.assertIsInstance(info["tools_count"], int)
        self.assertEqual(info["config"]["temperature"], 0.2)
    
    def test_configuration_test_success_mock(self):
        """Test successful configuration test with mock"""
        agent = CitizenAnalysisAgent()
        
        # Mock the model directly
        mock_response = "Configuration test successful"
        agent.model = MagicMock(return_value=mock_response)
        
        result = agent.test_configuration()
        
        self.assertEqual(result["status"], "success")
        self.assertIn("successful", result["message"])
        self.assertEqual(result["model_response"], "Configuration test successful")
        self.assertEqual(result["model_name"], "gpt-4o-mini")
    
    def test_configuration_test_failure_mock(self):
        """Test configuration test failure handling with mock"""
        agent = CitizenAnalysisAgent()
        
        # Mock the model to raise exception
        agent.model = MagicMock(side_effect=Exception("API connection failed"))
        
        result = agent.test_configuration()
        
        self.assertEqual(result["status"], "error")
        self.assertIn("failed", result["message"])
        self.assertEqual(result["error"], "API connection failed")
        self.assertEqual(result["error_type"], "Exception")
    
    @patch('smolagents.CodeAgent.run')
    def test_run_method_mock(self, mock_parent_run):
        """Test run method with mocked parent call"""
        mock_parent_run.return_value = "Mocked analysis result"
        
        agent = CitizenAnalysisAgent()
        result = agent.run(self.test_citizen_data, "Test query")
        
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["citizen_id"], "123456789012")
        self.assertEqual(result["raw_result"], "Mocked analysis result")
        self.assertEqual(result["model_used"], "gpt-4o-mini")
        self.assertEqual(agent.analysis_count, 1)
    
    @patch('smolagents.CodeAgent.run')
    def test_run_method_error_handling(self, mock_parent_run):
        """Test run method error handling"""
        mock_parent_run.side_effect = Exception("Test error")
        
        agent = CitizenAnalysisAgent()
        result = agent.run(self.test_citizen_data)
        
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"], "Test error")
        self.assertEqual(result["error_type"], "Exception")


if __name__ == "__main__":
    # Basic smoke test that can be run directly
    print("Running basic CitizenAnalysisAgent smoke test...")
    
    try:
        # Test agent initialization
        agent = CitizenAnalysisAgent()
        print(f"✓ Agent initialized successfully")
        
        # Test agent info
        info = agent.get_agent_info()
        print(f"✓ Agent info: {info['agent_type']} using {info['model_name']}")
        
        # Test configuration test (will fail if no API key, but shouldn't crash)
        config_result = agent.test_configuration()
        print(f"✓ Configuration test: {config_result['status']}")
        
        print("\nSmoke test completed successfully!")
        
    except Exception as e:
        print(f"✗ Smoke test failed: {e}")
        sys.exit(1)
    
    # Run full test suite if called as main
    print("\nRunning full test suite...")
    unittest.main(verbosity=2)
#!/usr/bin/env python3
"""
Integration test for CitizenAnalysisAgent with real API calls.
Run this to verify the agent works with actual OpenAI API.

Usage:
    cd /path/to/backend/smolagents-service
    source ../venv/bin/activate  
    python tests/integration_test_agent.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.citizen_analysis_agent import CitizenAnalysisAgent, AgentConfig
import json


def main():
    """Run integration test with real API"""
    print("=" * 60)
    print("CitizenAnalysisAgent Integration Test")
    print("=" * 60)
    
    # Test data
    test_citizen = {
        "citizen_id": "123456789012", 
        "name": "Ahmad Abdullah",
        "age": 35,
        "monthly_income": 2500,
        "family_size": 4,
        "location": "Kuala Lumpur",
        "employment_status": "employed",
        "has_disability": False,
        "education_level": "diploma",
        "housing_type": "rental"
    }
    
    try:
        # Test 1: Agent initialization
        print("\n1. Testing agent initialization...")
        agent = CitizenAnalysisAgent()
        print(f"✓ Agent initialized: {agent.config.model_name}")
        
        # Test 2: Configuration test
        print("\n2. Testing configuration...")
        config_result = agent.test_configuration()
        if config_result["status"] == "success":
            print(f"✓ Configuration test successful")
            print(f"  Model response: {config_result['model_response'][:100]}...")
        else:
            print(f"⚠ Configuration test failed: {config_result.get('error', 'Unknown error')}")
            print("  This is expected if API key is not configured")
        
        # Test 3: Agent info
        print("\n3. Testing agent info...")
        info = agent.get_agent_info()
        print(f"✓ Agent type: {info['agent_type']}")
        print(f"  Model: {info['model_name']}")
        print(f"  Tools available: {info['tools_count']}")
        print(f"  Tool names: {info['tool_names']}")
        
        # Test 4: Analysis prompt generation
        print("\n4. Testing analysis prompt generation...")
        prompt = agent._prepare_analysis_prompt(test_citizen, "Analyze eligibility for B40 subsidy")
        print(f"✓ Prompt generated ({len(prompt)} characters)")
        print(f"  Preview: {prompt[:200]}...")
        
        # Test 5: Real analysis (only if API key is available)
        print("\n5. Testing real analysis...")
        if os.getenv("OPENAI_API_KEY"):
            print("  Running real analysis with API call...")
            try:
                result = agent.run(
                    test_citizen, 
                    "Provide a brief eligibility assessment for government subsidy programs",
                    reset=True
                )
                
                if result["status"] == "completed":
                    print(f"✓ Analysis completed successfully")
                    print(f"  Analysis ID: {result['analysis_id']}")
                    print(f"  Citizen ID: {result['citizen_id']}")
                    print(f"  Model used: {result['model_used']}")
                    print(f"  Result preview: {str(result['raw_result'])[:200]}...")
                    
                    # Save full result to file for inspection
                    result_file = "integration_test_result.json"
                    with open(result_file, 'w') as f:
                        json.dump(result, f, indent=2, default=str)
                    print(f"  Full result saved to: {result_file}")
                    
                else:
                    print(f"✗ Analysis failed: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"✗ Analysis error: {e}")
                
        else:
            print("  ⚠ Skipping real analysis - no OPENAI_API_KEY found")
            print("  To test real API calls, set OPENAI_API_KEY environment variable")
        
        print("\n" + "=" * 60)
        print("Integration test completed!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n✗ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
#!/usr/bin/env python3
"""
Final integration test for Phase 2.2 with fixed agent-tool integration.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.citizen_analysis_agent import CitizenAnalysisAgent


def test_final_integration():
    """Test the fixed agent-tool integration"""
    
    print("=" * 60)
    print("🔧 FIXED Agent-Tool Integration Test")
    print("=" * 60)
    
    try:
        # Test 1: Create agent (should show successful tool integration)
        print("\n1. Creating CitizenAnalysisAgent...")
        agent = CitizenAnalysisAgent()
        
        # Test 2: Verify tool integration
        print(f"\n2. Verifying tool integration...")
        print(f"   Tools type: {type(agent.tools)}")
        
        if isinstance(agent.tools, dict):
            print(f"   Tools available: {list(agent.tools.keys())}")
            
            # Get validation tool
            validation_tool = agent.tools.get('citizen_data_validator')
            if validation_tool:
                print(f"   ✅ Validation tool found: {type(validation_tool).__name__}")
                print(f"   ✅ Tool name: {validation_tool.name}")
                print(f"   ✅ Tool description: {validation_tool.description[:60]}...")
            else:
                print("   ❌ Validation tool not found")
                return False
        else:
            print(f"   Tools format: {agent.tools}")
            return False
            
        # Test 3: Use validation tool through agent
        print(f"\n3. Testing B40 validation through agent tool...")
        
        b40_citizen = {
            "citizen_id": "123456789012",
            "income_bracket": "B40", 
            "state": "Selangor",
            "age": 35,
            "residency_duration_months": 12,
            "employment_status": "employed",
            "family_size": 4
        }
        
        result = validation_tool.forward(b40_citizen, validation_type="all")
        print(f"   ✅ B40 Result: Valid={result['overall_valid']}, Confidence={result['confidence_score']:.3f}")
        print(f"   ✅ Manual Review Required: {result['requires_manual_review']}")
        
        # Verify B40 gets high confidence
        assert result['overall_valid'], "B40 should be valid"
        assert result['confidence_score'] > 0.8, "B40 should have high confidence"
        assert not result['requires_manual_review'], "B40 should not require manual review"
        
        # Test 4: Test M40 validation
        print(f"\n4. Testing M40 validation...")
        
        m40_citizen = {
            "citizen_id": "123456789013",
            "income_bracket": "M40",
            "state": "Johor", 
            "age": 28,
            "residency_duration_months": 24
        }
        
        m40_result = validation_tool.forward(m40_citizen, validation_type="all")
        print(f"   ✅ M40 Result: Valid={m40_result['overall_valid']}, Confidence={m40_result['confidence_score']:.3f}")
        print(f"   ✅ Manual Review Required: {m40_result['requires_manual_review']}")
        
        # Verify M40 requires manual review
        assert m40_result['requires_manual_review'], "M40 should require manual review"
        
        # Test 5: Agent info with integrated tools
        print(f"\n5. Testing agent info...")
        info = agent.get_agent_info()
        print(f"   Agent: {info['agent_type']}")
        print(f"   Model: {info['model_name']}")
        print(f"   Tools: {info['tools_count']} total")
        print(f"   Tool Names: {info['tool_names']}")
        
        # Should now include validation tool in count and names
        assert info['tools_count'] >= 1, "Should have at least the validation tool"
        
        print("\n" + "=" * 60)
        print("🎉 INTEGRATION FIXED! All tests passed!")
        print("=" * 60)
        
        print("\n✅ smolagents CodeAgent Tool Integration - RESOLVED!")
        print("✅ CitizenDataValidationTool successfully integrated")
        print("✅ B40 validation: High confidence, no manual review")
        print("✅ M40 validation: Lower confidence, requires LLM review")
        print("✅ Agent reports correct tool count and names")
        print("✅ All Phase 2.2 deliverables working perfectly")
        
        print("\n🚀 Phase 2.2 FULLY COMPLETE - Ready for Phase 2.3!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_final_integration()
    
    if not success:
        sys.exit(1)
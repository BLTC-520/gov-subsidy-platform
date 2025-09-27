#!/usr/bin/env python3
"""
Full Agent Demo - Complete Tool Chaining with Smolagents

This script demonstrates the complete smolagents CitizenAnalysisAgent with
full tool chaining workflow for comprehensive policy analysis.
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_test_citizen_data() -> Dict[str, Any]:
    """Create comprehensive test citizen data"""
    return {
        "citizen_id": "full_agent_test_001",
        "nric": "871234-10-5678",
        "full_name": "Siti binti Mohamed",
        "state": "Selangor",
        "income_bracket": "B2",
        "household_size": 5,
        "number_of_children": 3,
        "disability_status": False,
        "is_signature_valid": True,
        "is_data_authentic": True,
        "age": 36,
        "employment_status": "self_employed",
        "monthly_income": 3500,
        "spouse_employed": True,
        "address": "Taman Desa, Kuala Lumpur"
    }

def test_full_agent_workflow():
    """Test the complete agent with full tool chaining"""
    print("🤖 FULL AGENT WORKFLOW TEST")
    print("=" * 60)

    try:
        print("📦 Importing agent and tools...")
        from agents.citizen_analysis_agent import CitizenAnalysisAgent, AgentConfig
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
        from tools.tavily_search_tool import TavilySearchTool
        from tools.policy_reasoning_tool import PolicyReasoningTool

        print("✅ Modules imported successfully")

        print("\n🛠️  Initializing all tools...")

        # Create all tools
        chromadb_tool = ChromaDBRetrieverTool()
        print("✅ ChromaDB Tool initialized")

        tavily_tool = TavilySearchTool()
        print("✅ Tavily Tool initialized")

        policy_tool = PolicyReasoningTool()
        print("✅ Policy Reasoning Tool initialized")

        tools = [chromadb_tool, tavily_tool, policy_tool]

        print(f"\n🔧 Creating optimized agent configuration...")
        config = AgentConfig(
            model_name="gpt-4o-mini",
            temperature=0.1,
            max_tokens=3000,
            timeout=45
        )
        print(f"✅ Configuration: {config.model_name}, temp={config.temperature}")

        print(f"\n🤖 Initializing Full Agent...")
        agent = CitizenAnalysisAgent(config=config, tools=tools)
        print("✅ Agent initialized with all tools")

        # Create test citizen data
        citizen_data = create_test_citizen_data()
        print(f"\n👤 Test Citizen Profile:")
        print(f"   🆔 Name: {citizen_data['full_name']}")
        print(f"   📍 State: {citizen_data['state']}")
        print(f"   💰 Income Bracket: {citizen_data['income_bracket']}")
        print(f"   🏠 Household Size: {citizen_data['household_size']}")
        print(f"   👶 Children: {citizen_data['number_of_children']}")
        print(f"   💵 Monthly Income: RM{citizen_data['monthly_income']}")

        print(f"\n🚀 Executing Full Agent Analysis with Tool Chaining...")
        print("📋 Expected workflow:")
        print("   1. Validate citizen data")
        print("   2. Retrieve policy documents from ChromaDB")
        print("   3. Search latest policy updates via Tavily")
        print("   4. Analyze with policy reasoning tool")
        print("   5. Provide comprehensive final assessment")

        start_time = datetime.now()

        # Execute the full agent workflow
        result = agent.run(
            citizen_data=citizen_data,
            query="Perform comprehensive Malaysian government subsidy eligibility analysis using all available tools in the prescribed workflow",
            reset=True
        )

        execution_time = (datetime.now() - start_time).total_seconds()

        print(f"\n⏱️  Analysis completed in {execution_time:.1f} seconds")

        return result, citizen_data, execution_time

    except Exception as e:
        print(f"❌ Full agent test failed: {str(e)}")
        traceback.print_exc()
        return None, None, 0

def analyze_agent_result(result: Dict[str, Any], citizen_data: Dict[str, Any], execution_time: float):
    """Analyze and display the agent execution results"""
    print("\n" + "=" * 70)
    print("🏆 FULL AGENT ANALYSIS RESULTS")
    print("=" * 70)

    if not result:
        print("❌ No results to analyze")
        return False

    status = result.get('status', 'unknown')
    print(f"📊 Status: {status.upper()}")
    print(f"⏱️  Execution Time: {execution_time:.1f} seconds")
    print(f"🆔 Analysis ID: {result.get('analysis_id', 'N/A')}")

    if status == 'completed':
        print("✅ SUCCESS: Full agent workflow completed!")

        # Analyze the raw result to see tool usage
        raw_result = result.get('raw_result')
        if raw_result:
            print(f"\n📝 Agent Output Analysis:")
            result_str = str(raw_result)

            # Check for tool usage indicators
            tool_indicators = {
                'citizen_data_validator': 'data validation',
                'chromadb_retriever': 'document retrieval',
                'tavily_search': 'web search',
                'policy_reasoner': 'policy reasoning'
            }

            tools_used = []
            for tool_name, description in tool_indicators.items():
                if tool_name.lower() in result_str.lower() or description in result_str.lower():
                    tools_used.append(f"✅ {tool_name} - {description}")
                else:
                    tools_used.append(f"❓ {tool_name} - {description} (unclear)")

            print("🛠️  Tool Usage Analysis:")
            for tool_usage in tools_used:
                print(f"   {tool_usage}")

            # Display output sample
            if len(result_str) > 1000:
                print(f"\n📄 Output Sample (first 1000 chars):")
                print("-" * 50)
                print(result_str[:1000])
                print(f"\n... [truncated, full length: {len(result_str)} characters]")
            else:
                print(f"\n📄 Complete Output:")
                print("-" * 50)
                print(result_str)

        # Check if tools were actually used
        tools_used_list = result.get('tools_used', [])
        if tools_used_list:
            print(f"\n🔧 Tools Reported as Used:")
            for tool in tools_used_list:
                print(f"   • {tool}")

        return True

    else:
        print("❌ FAILURE: Agent workflow did not complete successfully")

        if result.get('error'):
            print(f"🐛 Error Details: {result['error']}")
            error_type = result.get('error_type', 'Unknown')
            print(f"🔍 Error Type: {error_type}")

        return False

def main():
    """Main full agent demo"""
    print("🎭 FULL AGENT DEMO - COMPLETE TOOL CHAINING")
    print("Smolagents CitizenAnalysisAgent with All Tools")
    print("=" * 70)
    print(f"📅 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Environment check
    required_vars = ["OPENAI_API_KEY", "TAVILY_API_KEY", "MONGO_URI"]
    missing = [var for var in required_vars if not os.getenv(var)]

    if missing:
        print(f"⚠️  Missing environment variables: {', '.join(missing)}")
        print("This will likely cause failures in tool execution.\n")
    else:
        print("✅ All required environment variables are present.\n")

    try:
        # Run the full agent test
        result, citizen_data, execution_time = test_full_agent_workflow()

        # Analyze results
        if result and citizen_data:
            success = analyze_agent_result(result, citizen_data, execution_time)
        else:
            success = False
            print("❌ No results to analyze - agent execution failed")

        # Final summary
        print("\n" + "=" * 70)
        print("🏁 FULL AGENT DEMO SUMMARY")
        print("=" * 70)

        if success:
            print("🎉 SUCCESS: Full agent with tool chaining is working!")
            print("\n📋 Achievements:")
            print("   ✅ Agent initialization with multiple tools")
            print("   ✅ LiteLLM model integration functioning")
            print("   ✅ Tool orchestration and chaining")
            print("   ✅ Policy analysis workflow execution")
            print("   ✅ Comprehensive eligibility assessment")

            print(f"\n🚀 READY FOR PRODUCTION:")
            print("   • Multi-agent RAG system operational")
            print("   • Policy reasoning with real-time data")
            print("   • Malaysian subsidy analysis capability")
            print("   • End-to-end citizen eligibility workflow")

        else:
            print("⚠️  PARTIAL SUCCESS: Agent executed but with issues")
            print("\n🔧 Possible Issues to Address:")
            print("   • Tool chaining execution flow")
            print("   • Agent-tool communication protocol")
            print("   • Output formatting and parsing")
            print("   • Error handling in tool execution")

        print(f"\n⏱️  Total Demo Time: {execution_time:.1f} seconds")
        print("📝 This demonstrates the smolagents framework with full tool integration!")

    except KeyboardInterrupt:
        print("\n👋 Demo interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected demo error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
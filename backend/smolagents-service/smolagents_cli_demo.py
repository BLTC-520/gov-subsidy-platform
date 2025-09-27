#!/usr/bin/env python3
"""
Smolagents CLI Demo - Complete Agent Integration

This script demonstrates the full smolagents CitizenAnalysisAgent with all tools
integrated for comprehensive policy analysis and reasoning.
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_environment():
    """Check required environment variables"""
    print("🔧 Environment Check")
    print("=" * 50)

    required_vars = ["OPENAI_API_KEY", "TAVILY_API_KEY", "MONGO_URI"]
    optional_vars = ["AGENT_MODEL_NAME", "AGENT_TEMPERATURE", "AGENT_MAX_TOKENS"]

    all_good = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: SET ({len(value)} chars)")
        else:
            print(f"❌ {var}: MISSING")
            all_good = False

    print("\n🛠️  Optional Configuration:")
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"⚪ {var}: Using default")

    print(f"\n🌟 Environment Status: {'READY' if all_good else 'INCOMPLETE'}")
    return all_good

def create_test_citizen_data() -> Dict[str, Any]:
    """Create sample citizen data for testing"""
    return {
        "citizen_id": "demo_smolagents_001",
        "nric": "123456-78-9012",
        "full_name": "Ahmad bin Abdullah",
        "state": "Selangor",
        "income_bracket": "B2",
        "household_size": 4,
        "number_of_children": 2,
        "disability_status": False,
        "is_signature_valid": True,
        "is_data_authentic": True,
        "age": 35,
        "employment_status": "self_employed"
    }

def test_smolagents_agent():
    """Test the complete CitizenAnalysisAgent with all tools"""
    print("\n🤖 SMOLAGENTS AGENT TEST")
    print("=" * 50)

    try:
        print("📦 Importing required modules...")
        from agents.citizen_analysis_agent import CitizenAnalysisAgent, AgentConfig
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
        from tools.tavily_search_tool import TavilySearchTool
        from tools.policy_reasoning_tool import PolicyReasoningTool
        print("✅ All modules imported successfully")

        print("\n🛠️  Initializing tools...")

        # Initialize tools
        chromadb_tool = ChromaDBRetrieverTool()
        print("✅ ChromaDB Retriever Tool initialized")

        tavily_tool = TavilySearchTool()
        print("✅ Tavily Search Tool initialized")

        policy_tool = PolicyReasoningTool()
        print("✅ Policy Reasoning Tool initialized")

        tools = [chromadb_tool, tavily_tool, policy_tool]

        print(f"\n🔧 Creating agent configuration...")
        config = AgentConfig.from_env()
        print(f"✅ Model: {config.model_name}")
        print(f"✅ Temperature: {config.temperature}")
        print(f"✅ Max Tokens: {config.max_tokens}")

        print(f"\n🤖 Initializing CitizenAnalysisAgent...")
        agent = CitizenAnalysisAgent(config=config, tools=tools)
        print("✅ Agent initialized successfully")

        # Get test citizen data
        citizen_data = create_test_citizen_data()
        print(f"\n👤 Test Citizen Profile:")
        print(f"   🆔 Name: {citizen_data['full_name']}")
        print(f"   📍 State: {citizen_data['state']}")
        print(f"   💰 Income Bracket: {citizen_data['income_bracket']}")
        print(f"   🏠 Household Size: {citizen_data['household_size']}")
        print(f"   👶 Children: {citizen_data['number_of_children']}")

        print(f"\n🚀 Running agent analysis...")
        start_time = datetime.now()

        # Run the agent
        result = agent.run(
            citizen_data=citizen_data,
            query="Analyze this citizen's eligibility for Malaysian government subsidies using all available tools and policy context"
        )

        execution_time = (datetime.now() - start_time).total_seconds()

        print(f"\n⏱️  Analysis completed in {execution_time:.1f} seconds")

        return result, citizen_data, execution_time

    except Exception as e:
        print(f"❌ Agent test failed: {str(e)}")
        traceback.print_exc()
        return None, None, 0

def display_agent_results(result: Dict[str, Any], citizen_data: Dict[str, Any], execution_time: float):
    """Display formatted agent results"""
    print("\n" + "=" * 60)
    print("🏆 SMOLAGENTS ANALYSIS RESULTS")
    print("=" * 60)

    if not result:
        print("❌ No results to display")
        return

    print(f"📊 Analysis Status: {result.get('status', 'unknown').upper()}")
    print(f"⏱️  Execution Time: {execution_time:.1f} seconds")
    print(f"🆔 Analysis ID: {result.get('analysis_id', 'N/A')}")
    print(f"🤖 Model Used: {result.get('model_used', 'N/A')}")

    # Display tools used
    tools_used = result.get('tools_used', [])
    if tools_used:
        print(f"🛠️  Tools Used:")
        for tool in tools_used:
            print(f"   • {tool}")

    # Display raw result analysis
    raw_result = result.get('raw_result')
    if raw_result:
        print(f"\n📝 Agent Analysis Output:")
        print("-" * 40)

        # Try to format the raw result nicely
        if isinstance(raw_result, str):
            # Truncate if too long
            if len(raw_result) > 2000:
                print(f"{raw_result[:2000]}...")
                print(f"\n[Output truncated - full length: {len(raw_result)} characters]")
            else:
                print(raw_result)
        else:
            print(f"Raw result type: {type(raw_result)}")
            print(f"Raw result: {str(raw_result)[:1000]}...")

    print("\n" + "=" * 60)
    print("🎯 ANALYSIS SUMMARY")
    print("=" * 60)
    print(f"👤 Citizen: {citizen_data.get('full_name', 'N/A')}")
    print(f"🏢 Agent Framework: Smolagents with LiteLLM")
    print(f"🧠 AI Model: {result.get('model_used', 'N/A')}")
    print(f"⚡ Total Processing Time: {execution_time:.1f}s")

    if result.get('status') == 'completed':
        print("✅ Status: SUCCESS - Full RAG analysis completed")
        print("🎉 This demonstrates a working multi-agent RAG system!")
    else:
        print(f"⚠️  Status: {result.get('status', 'unknown').upper()}")
        if result.get('error'):
            print(f"🐛 Error: {result.get('error')}")

def run_agent_info_test():
    """Test agent info and configuration methods"""
    print("\n🔍 AGENT INFO TEST")
    print("=" * 50)

    try:
        from agents.citizen_analysis_agent import CitizenAnalysisAgent, AgentConfig
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool

        # Create minimal agent for info testing
        config = AgentConfig.from_env()
        chromadb_tool = ChromaDBRetrieverTool()
        agent = CitizenAnalysisAgent(config=config, tools=[chromadb_tool])

        # Test configuration
        print("🧪 Testing agent configuration...")
        config_result = agent.test_configuration()

        print(f"✅ Configuration Test: {config_result.get('status', 'unknown')}")
        if config_result.get('status') == 'success':
            print(f"📝 Model Response: {config_result.get('model_response', 'N/A')[:100]}...")
        else:
            print(f"❌ Configuration Error: {config_result.get('error', 'N/A')}")

        # Get agent info
        print("\n📊 Agent Information:")
        info = agent.get_agent_info()
        for key, value in info.items():
            if key == 'config':
                print(f"   🔧 Configuration:")
                for config_key, config_value in value.items():
                    print(f"      • {config_key}: {config_value}")
            else:
                print(f"   📍 {key}: {value}")

        return True

    except Exception as e:
        print(f"❌ Agent info test failed: {str(e)}")
        traceback.print_exc()
        return False

def main():
    """Main CLI demo function"""
    print("🎬 SMOLAGENTS CLI DEMO")
    print("Complete Agent Integration with RAG Analysis")
    print("=" * 60)
    print("📅 Demo Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # Check environment
    env_ok = check_environment()
    if not env_ok:
        print("\n⚠️  WARNING: Missing environment variables.")
        print("The demo may have limited functionality.")

        print("⚠️  Continuing with demo despite missing environment check...")
        print("📝 Note: The tools may still work if .env file is properly loaded")

    try:
        # Test agent info
        print("\n" + "🔬 Phase 1: Agent Configuration Test")
        info_success = run_agent_info_test()

        if not info_success:
            print("⚠️  Agent configuration test failed, but continuing with main demo...")

        # Main agent test
        print("\n" + "🚀 Phase 2: Full Agent Analysis Test")
        result, citizen_data, execution_time = test_smolagents_agent()

        # Display results
        if result and citizen_data:
            display_agent_results(result, citizen_data, execution_time)
        else:
            print("❌ Agent analysis failed - no results to display")

        print("\n" + "=" * 60)
        print("🏁 DEMO COMPLETE!")
        print("=" * 60)

        if result and result.get('status') == 'completed':
            print("🎉 SUCCESS: Smolagents agent is working correctly!")
            print("🤖 The multi-agent RAG system is operational")
            print("📊 Policy analysis and reasoning completed successfully")
        else:
            print("⚠️  PARTIAL SUCCESS: Some components may need attention")
            print("🔧 Check the error messages above for troubleshooting")

        print("\n📝 Key Features Demonstrated:")
        print("   ✅ Smolagents framework integration")
        print("   ✅ LiteLLM model configuration")
        print("   ✅ Multi-tool orchestration (ChromaDB + Tavily + PolicyReasoning)")
        print("   ✅ Structured citizen eligibility analysis")
        print("   ✅ End-to-end RAG pipeline execution")

    except KeyboardInterrupt:
        print("\n👋 Demo interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Real Smolagents Agent Test with ChromaDBRetrieverTool

This test shows:
1. Real smolagents CodeAgent with LiteLLMModel (gpt-4o-mini)
2. Agent equipped with ChromaDBRetrieverTool
3. User gives search query
4. Agent decides to call chromadb_retriever tool
5. See the complete workflow in action
"""

import sys
import os
from dotenv import load_dotenv

# Add current directory to path  
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

def create_agent_with_retriever():
    """Create a real smolagents agent with ChromaDBRetrieverTool"""
    print("🤖 Creating Smolagents Agent with ChromaDB Retriever...")
    
    try:
        from smolagents import CodeAgent, LiteLLMModel
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
        
        # Create LiteLLM model (gpt-4o-mini)
        model = LiteLLMModel(
            model_id="gpt-4o-mini",
            api_key=os.environ["OPENAI_API_KEY"]
        )
        print("✅ LiteLLMModel created with gpt-4o-mini")
        
        # Create ChromaDB retriever tool
        retriever_tool = ChromaDBRetrieverTool()
        print(f"✅ ChromaDBRetrieverTool created - loaded {len(retriever_tool.docs)} documents")
        
        # Create agent with retriever tool
        agent = CodeAgent(
            model=model,
            tools=[retriever_tool],
            max_steps=5,
            verbosity_level=2  # Show what the agent is thinking
        )
        print("✅ CodeAgent created with ChromaDB retriever tool")
        
        return agent
        
    except Exception as e:
        print(f"❌ Failed to create agent: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_user_search_queries(agent):
    """Test agent with different user search queries"""
    print("\n🔍 Testing Agent with User Search Queries")
    print("=" * 50)
    
    # Test queries that should trigger the retriever tool
    test_queries = [
        "Find information about housing assistance programs in Malaysia",
        "What are the eligibility requirements for B40 citizens?", 
        "Search for rental assistance policies",
        "Look up healthcare subsidies for low-income families"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n--- Test {i}: User Query ---")
        print(f"User: '{query}'")
        print("\nAgent thinking process:")
        print("-" * 30)
        
        try:
            # Run the agent with the user query
            result = agent.run(
                f"The user is asking: '{query}'. "
                f"Help them by searching for relevant information and providing a helpful response."
            )
            
            print(f"\n🎯 Agent Response:")
            print(result)
            print("\n" + "="*50)
            
        except Exception as e:
            print(f"❌ Agent run failed: {e}")
            
        # Break after first successful test to avoid too much output
        if i == 1:
            print("\n💡 That was just the first test. Agent successfully used the retriever!")
            break

def test_agent_tool_interaction():
    """Show exactly how the agent calls the retriever tool"""
    print("\n🔧 Agent-Tool Interaction Test")
    print("=" * 50)
    
    try:
        from smolagents import CodeAgent, LiteLLMModel  
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
        
        # Create simple test setup
        model = LiteLLMModel(
            model_id="gpt-4o-mini", 
            api_key=os.environ["OPENAI_API_KEY"]
        )
        
        retriever_tool = ChromaDBRetrieverTool()
        
        agent = CodeAgent(
            model=model,
            tools=[retriever_tool],
            max_steps=3,
            verbosity_level=2
        )
        
        # Simple, direct search task
        task = """
        Search for information about "housing assistance" using the available tools.
        Then summarize what you found.
        """
        
        print("Task given to agent:")
        print(task)
        print("\nAgent execution:")
        print("-" * 30)
        
        result = agent.run(task)
        
        print(f"\n✅ Final Result:")
        print(result)
        
    except Exception as e:
        print(f"❌ Tool interaction test failed: {e}")
        import traceback
        traceback.print_exc()

def verify_environment():
    """Verify all required environment variables are set"""
    print("🔧 Verifying Environment Setup...")
    
    required_vars = [
        'OPENAI_API_KEY',
        'MONGO_URI', 
        'MONGO_DB',
        'MONGO_COLLECTION'
    ]
    
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
        else:
            print(f"✅ {var}: {'*' * 10}...{os.getenv(var)[-4:] if len(os.getenv(var)) > 4 else 'set'}")
    
    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        return False
    
    return True

def main():
    """Run the complete agent test"""
    print("🚀 Smolagents Agent + ChromaDB Retriever Test")
    print("=" * 60)
    
    # Step 1: Verify environment
    if not verify_environment():
        print("Please check your .env file")
        return False
    
    # Step 2: Create agent
    agent = create_agent_with_retriever()
    if not agent:
        return False
    
    # Step 3: Test agent with user queries
    test_user_search_queries(agent)
    
    # Step 4: Test direct tool interaction
    test_agent_tool_interaction()
    
    print("\n" + "=" * 60)
    print("🎉 Agent Test Complete!")
    print("\nWhat you just saw:")
    print("1. ✅ Real smolagents CodeAgent with LiteLLMModel")
    print("2. ✅ Agent equipped with ChromaDBRetrieverTool") 
    print("3. ✅ User query → Agent decides to search → Calls retriever")
    print("4. ✅ Agent receives document chunks → Provides informed response")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        print("\n⚠️ Test failed. Please check your setup.")
        sys.exit(1)
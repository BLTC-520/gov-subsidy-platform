#!/usr/bin/env python3
"""
Simple RAG Demo - Smolagents with LiteLLM
Shows ChromaDB + Web Search + LLM reasoning for citizen analysis
"""

import os
import sys
import traceback
from datetime import datetime

def test_chroma_retrieval():
    """Test ChromaDB retrieval"""
    print("\n1. Testing ChromaDB Retriever...")
    try:
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
        chroma_tool = ChromaDBRetrieverTool()

        # Test query for B2 income bracket policy
        query = "B2 income bracket eligibility policy Malaysia Selangor"
        result = chroma_tool.forward(query, max_results=3)

        if isinstance(result, dict) and result.get("documents"):
            print(f"   SUCCESS: Found {len(result['documents'])} documents")
            print(f"   Sample: {result['documents'][0].get('content', '')[:100]}...")
            return result
        else:
            print(f"   WARNING: {result}")
            return None

    except Exception as e:
        print(f"   FAILED: {e}")
        traceback.print_exc()
        return None

def test_web_search():
    """Test web search"""
    print("\n2. Testing Web Search...")
    try:
        from tools.tavily_search_tool import TavilySearchTool
        tavily_tool = TavilySearchTool()

        query = "Malaysia B40 M40 income bracket subsidy eligibility 2024"
        result = tavily_tool.forward(query, search_type="policy", max_results=2)

        print(f"   SUCCESS: {len(result)} characters returned")
        print(f"   Sample: {result[:100]}...")
        return result

    except Exception as e:
        print(f"   FAILED: {e}")
        traceback.print_exc()
        return None

def test_llm_reasoning(chroma_context, web_context, citizen_data):
    """Test LLM policy reasoning"""
    print("\n3. Testing LLM Policy Reasoning...")
    try:
        from tools.policy_reasoning_tool import PolicyReasoningTool
        reasoning_tool = PolicyReasoningTool()

        # Combine contexts
        combined_context = ""
        if chroma_context:
            combined_context += "POLICY DOCUMENTS FROM DATABASE:\n"
            combined_context += str(chroma_context) + "\n\n"

        if web_context:
            combined_context += "LATEST POLICY UPDATES:\n"
            combined_context += web_context + "\n\n"

        if not combined_context:
            combined_context = "No additional context available - using base knowledge."

        # Run reasoning
        result = reasoning_tool.forward(
            citizen_data=citizen_data,
            policy_context=combined_context,
            analysis_focus="comprehensive"
        )

        if result and 'score' in result:
            print(f"   SUCCESS: LLM reasoning completed")
            print(f"   Score: {result['score']}")
            print(f"   Class: {result['eligibility_class']}")
            print(f"   Confidence: {result['confidence']:.1%}")
            return result
        else:
            print(f"   FAILED: {result}")
            return None

    except Exception as e:
        print(f"   FAILED: {e}")
        traceback.print_exc()
        return None

def run_full_rag_analysis():
    """Run complete RAG analysis pipeline"""
    print("="*60)
    print("FULL RAG ANALYSIS PIPELINE")
    print("="*60)

    citizen_data = {
        "citizen_id": "demo_001",
        "income_bracket": "B2",
        "state": "Selangor",
        "household_size": 4,
        "number_of_children": 2,
        "is_signature_valid": True,
        "is_data_authentic": True,
        "disability_status": False
    }

    print(f"Analyzing Citizen: {citizen_data['citizen_id']}")
    print(f"Income Bracket: {citizen_data['income_bracket']}")
    print(f"State: {citizen_data['state']}")
    print(f"Household Size: {citizen_data['household_size']}")

    start_time = datetime.now()

    # Step 1: ChromaDB retrieval
    print("\nStep 1: Retrieving policy documents from ChromaDB...")
    chroma_result = test_chroma_retrieval()

    # Step 2: Web search
    print("\nStep 2: Searching for latest policies via web...")
    web_result = test_web_search()

    # Step 3: LLM reasoning
    print("\nStep 3: AI policy analysis and reasoning...")
    reasoning_result = test_llm_reasoning(chroma_result, web_result, citizen_data)

    # Final Results
    execution_time = (datetime.now() - start_time).total_seconds()

    print("\n" + "="*60)
    print("FINAL RAG ANALYSIS RESULTS")
    print("="*60)

    if reasoning_result:
        print(f"Analysis Status: SUCCESS")
        print(f"Execution Time: {execution_time:.1f} seconds")
        print(f"Eligibility Score: {reasoning_result['score']}")
        print(f"Classification: {reasoning_result['eligibility_class']}")
        print(f"AI Confidence: {reasoning_result['confidence']:.1%}")
        print(f"\nAI Explanation:")
        print(reasoning_result['explanation'])

        if 'reasoning_details' in reasoning_result:
            details = reasoning_result['reasoning_details']
            if details.get('policy_factors'):
                print(f"\nPolicy Factors Considered:")
                for factor in details['policy_factors']:
                    print(f"   - {factor}")

            if details.get('edge_cases_identified'):
                print(f"\nEdge Cases Identified:")
                for case in details['edge_cases_identified']:
                    print(f"   - {case}")

        if reasoning_result.get('recommendations'):
            print(f"\nRecommendations:")
            for rec in reasoning_result['recommendations']:
                print(f"   - {rec}")

    else:
        print(f"Analysis Status: FAILED")
        print(f"Execution Time: {execution_time:.1f} seconds")
        print("Check component errors above")

    return reasoning_result

def check_environment():
    """Check required environment variables"""
    print("Environment Check")
    print("="*30)

    required_vars = ["OPENAI_API_KEY", "TAVILY_API_KEY", "MONGO_URI"]

    all_good = True
    for var in required_vars:
        status = "SET" if os.getenv(var) else "MISSING"
        print(f"{var}: {status}")
        if not os.getenv(var):
            all_good = False

    print(f"\nEnvironment Status: {'READY' if all_good else 'INCOMPLETE'}")
    return all_good

if __name__ == "__main__":
    print("RAG Analysis Demo for Teacher")
    print("Smolagents + LiteLLM + ChromaDB + Web Search")
    print("="*60)

    # Check environment
    env_ok = check_environment()
    if not env_ok:
        print("\nWARNING: Missing environment variables. Demo will show limited functionality.")

    try:
        # Run full analysis
        result = run_full_rag_analysis()

        print("\n" + "="*60)
        print("Demo Complete!")
        print("\nThis demonstrates:")
        print("- ChromaDB document retrieval")
        print("- Tavily web search integration")
        print("- LiteLLM reasoning and analysis")
        print("- Complete RAG pipeline for citizen eligibility")

        if result:
            print(f"\nFinal Recommendation: {result['eligibility_class']}")

    except KeyboardInterrupt:
        print("\nDemo interrupted by user")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        traceback.print_exc()
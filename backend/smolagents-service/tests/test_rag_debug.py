#!/usr/bin/env python3
"""
Simple test script to debug RAG analysis service issues.
Run this to see exactly where the problem occurs.
"""

import os
import sys
import traceback
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

def test_rag_components():
    """Test each RAG component individually"""
    
    print("🧪 Testing RAG Analysis Components")
    print("=" * 50)
    
    # Sample test data
    test_citizen_data = {
        "citizen_id": "debug_test_001",
        "income_bracket": "B40",
        "state": "Selangor",
        "age": 35,
        "household_size": 4,
        "number_of_children": 2,
        "residency_duration_months": 24,
        "employment_status": "employed",
        "is_signature_valid": True,
        "is_data_authentic": True,
        "disability_status": False
    }
    
    # Test 1: Import check
    print("\n1. Testing Imports...")
    try:
        from services.rag_analysis_service import RagAnalysisService
        print("   ✅ RagAnalysisService import successful")
    except Exception as e:
        print(f"   ❌ RagAnalysisService import failed: {e}")
        return
    
    # Test 2: Service initialization
    print("\n2. Testing Service Initialization...")
    try:
        rag_service = RagAnalysisService()
        print("   ✅ RagAnalysisService initialization successful")
        print(f"   📋 Tools loaded: {len(rag_service.tools)}")
        for i, tool in enumerate(rag_service.tools):
            print(f"      {i+1}. {tool.__class__.__name__}")
    except Exception as e:
        print(f"   ❌ RagAnalysisService initialization failed: {e}")
        traceback.print_exc()
        return
    
    # Test 3: Agent initialization
    print("\n3. Testing Agent Initialization...")
    try:
        agent_info = rag_service.agent.get_agent_info()
        print("   ✅ CitizenAnalysisAgent initialization successful")
        print(f"   📋 Agent tools: {agent_info.get('tool_names', [])}")
        print(f"   🤖 Model: {agent_info.get('model_name', 'unknown')}")
    except Exception as e:
        print(f"   ❌ Agent initialization check failed: {e}")
        traceback.print_exc()
    
    # Test 4: Individual tool testing
    print("\n4. Testing Individual Tools...")
    
    # Test ChromaDB tool
    try:
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
        chromadb_tool = ChromaDBRetrieverTool()
        test_result = chromadb_tool.forward("B40 eligibility policy", max_results=2)
        print(f"   ✅ ChromaDBRetrieverTool: Found {len(test_result)} chars of results")
    except Exception as e:
        print(f"   ⚠️ ChromaDBRetrieverTool failed: {e}")
    
    # Test Tavily tool (expected to fail without API key)
    try:
        from tools.tavily_search_tool import TavilySearchTool
        tavily_tool = TavilySearchTool()
        print("   ✅ TavilySearchTool: Initialization successful")
    except Exception as e:
        print(f"   ⚠️ TavilySearchTool failed (expected): {e}")
    
    # Test Policy Reasoning tool
    try:
        from tools.policy_reasoning_tool import PolicyReasoningTool
        policy_tool = PolicyReasoningTool()
        print("   ✅ PolicyReasoningTool: Initialization successful")
    except Exception as e:
        print(f"   ⚠️ PolicyReasoningTool failed: {e}")
    
    # Test 5: Analysis with debug mode
    print("\n5. Testing Full Analysis...")
    try:
        print("   🔄 Starting RAG analysis (this may take 30-60 seconds)...")
        start_time = datetime.now()
        
        result = rag_service.analyze(test_citizen_data)
        
        execution_time = (datetime.now() - start_time).total_seconds()
        print(f"   ✅ RAG analysis completed in {execution_time:.1f}s")
        print(f"   📊 Result: {result.eligibility_class} (Score: {result.score:.1f}, Confidence: {result.confidence:.2f})")
        print(f"   📝 Explanation: {result.explanation[:100]}...")
        
    except Exception as e:
        print(f"   ❌ RAG analysis failed: {e}")
        print("\n🔍 Full traceback:")
        traceback.print_exc()
        
        # Additional debugging info
        print("\n🔧 Debug Information:")
        print(f"   - Python version: {sys.version}")
        print(f"   - Working directory: {os.getcwd()}")
        print(f"   - OPENAI_API_KEY set: {'OPENAI_API_KEY' in os.environ}")
        print(f"   - TAVILY_API_KEY set: {'TAVILY_API_KEY' in os.environ}")
        
        # Check agent tools
        try:
            print(f"   - Agent tools type: {type(rag_service.agent.tools)}")
            if hasattr(rag_service.agent, 'tools'):
                if isinstance(rag_service.agent.tools, dict):
                    print(f"   - Agent tools keys: {list(rag_service.agent.tools.keys())}")
                elif isinstance(rag_service.agent.tools, list):
                    print(f"   - Agent tools list: {[tool.__class__.__name__ for tool in rag_service.agent.tools]}")
        except Exception as debug_e:
            print(f"   - Agent tools debug failed: {debug_e}")


def test_comparison_endpoint():
    """Test the comparison functionality with mock data"""
    print("\n" + "=" * 50)
    print("🧪 Testing Comparison Service")
    print("=" * 50)
    
    try:
        from services.analysis_comparator import AnalysisComparator
        
        comparator = AnalysisComparator()
        
        # Mock data for testing
        rag_result = {
            "score": 75.0,
            "confidence": 0.85,
            "eligibility_class": "B40",
            "explanation": "RAG analysis indicates B40 eligibility"
        }
        
        formula_result = {
            "score": 78.0,
            "confidence": 1.0,
            "eligibility_class": "B40",
            "explanation": "Formula calculation shows B40 classification"
        }
        
        comparison = comparator.compare(rag_result, formula_result, "debug_test_001")
        
        print("   ✅ Comparison service successful")
        print(f"   📊 Agreement: {comparison.agreement}")
        print(f"   📏 Score difference: {comparison.score_difference}")
        print(f"   💡 Recommendation: {comparison.recommendation}")
        
    except Exception as e:
        print(f"   ❌ Comparison test failed: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    print(f"🚀 Starting RAG Debug Test at {datetime.now()}")
    
    # Test RAG components
    test_rag_components()
    
    # Test comparison service
    test_comparison_endpoint()
    
    print("\n" + "=" * 50)
    print("🏁 Debug test completed!")
    print("\nIf you see the 'callback' error above, it's likely an issue with")
    print("how smolagents handles the tools list in the CitizenAnalysisAgent.")
    print("\nTo run this test:")
    print("cd /path/to/smolagents-service")
    print("source venv/bin/activate") 
    print("python test_rag_debug.py")
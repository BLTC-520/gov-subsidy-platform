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
# sys.path.insert(0, os.path.dirname(_file_))

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
        from services.dual_analysis_coordinator import DualAnalysisCoordinator
        print("   ✅ DualAnalysisCoordinator import successful")
    except Exception as e:
        print(f"   ❌ DualAnalysisCoordinator import failed: {e}")
        return
    
    # Test 2: Service initialization
    print("\n2. Testing Service Initialization...")
    try:
        coordinator = DualAnalysisCoordinator()
        print("   ✅ DualAnalysisCoordinator initialization successful")
    except Exception as e:
        print(f"   ❌ DualAnalysisCoordinator initialization failed: {e}")
        traceback.print_exc()
        return
    
    # Test 3: Individual tool testing
    print("\n3. Testing Individual Tools...")
    
    # Test ChromaDB tool
    try:
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
        chromadb_tool = ChromaDBRetrieverTool()
        test_result = chromadb_tool.forward("B40 eligibility policy", max_results=2)
        print(f"   ✅ ChromaDBRetrieverTool: Found {len(test_result)} chars of results")
    except Exception as e:
        print(f"   ⚠ ChromaDBRetrieverTool failed: {e}")
    
    # Test Tavily tool
    try:
        from tools.tavily_search_tool import TavilySearchTool
        tavily_tool = TavilySearchTool()
        print("   ✅ TavilySearchTool: Initialization successful")
    except Exception as e:
        print(f"   ⚠ TavilySearchTool failed: {e}")
    
    # Test Policy Reasoning tool
    try:
        from tools.policy_reasoning_tool import PolicyReasoningTool
        policy_tool = PolicyReasoningTool()
        print("   ✅ PolicyReasoningTool: Initialization successful")
    except Exception as e:
        print(f"   ⚠ PolicyReasoningTool failed: {e}")
    
    # Test 4: Full RAG Analysis
    print("\n4. Testing Full RAG Analysis...")
    try:
        print("   🔄 Starting RAG analysis (this may take 30-60 seconds)...")
        start_time = datetime.now()
        
        # First, let's try to disable the mock and use real RAG
        # We need to temporarily modify the coordinator to use real RAG
        import asyncio
        
        # Create a proper async test
        async def run_real_rag():
            # Prepare proper citizen data format
            citizen_data_full = {
                'full_name': 'Test Citizen',
                'date_of_birth': '1985-03-15',
                'gender': 'Male',
                'household_size': 4,
                'number_of_children': 2,
                'disability_status': False,
                'state': 'Selangor',
                'income_bracket': 'B2',
                'zk_class_flags': '[0,1,0,0,0,0,0,0,0,0]',
                'is_signature_valid': True,
                'is_data_authentic': True,
                'monthly_income': 3500.0
            }
            
            # Try to run the full dual analysis
            result = await coordinator.analyze_citizen("debug_test_001", citizen_data_full)
            return result.get("analysis", {}).get("rag_result", {})
        
        # Run the async RAG analysis
        rag_result = asyncio.run(run_real_rag())
        
        execution_time = (datetime.now() - start_time).total_seconds()
        print(f"   ✅ RAG analysis completed in {execution_time:.1f}s")
        print(f"   📊 Result: {rag_result.get('eligibility_class', 'Unknown')} (Score: {rag_result.get('score', 0)}, Confidence: {rag_result.get('confidence', 0):.2f})")
        print(f"   📝 Explanation: {rag_result.get('explanation', 'No explanation')[:200]}...")
        
        # Print full reasoning for screenshot
        print("\n" + "="*60)
        print("📋 FULL RAG REASONING OUTPUT (for screenshot):")
        print("="*60)
        print(f"Score: {rag_result.get('score', 0)}")
        print(f"Eligibility Class: {rag_result.get('eligibility_class', 'Unknown')}")
        print(f"Confidence: {rag_result.get('confidence', 0):.1%}")
        print("\nDetailed Reasoning:")
        print(rag_result.get('explanation', 'No explanation available'))
        
        if 'reasoning_details' in rag_result:
            print("\nPolicy Factors Considered:")
            for factor in rag_result['reasoning_details'].get('policy_factors', []):
                print(f"• {factor}")
        
        if 'recommendations' in rag_result:
            print("\nRecommendations:")
            for rec in rag_result.get('recommendations', []):
                print(f"• {rec}")
        
        print("="*60)
        
        return rag_result
        
    except Exception as e:
        print(f"   ❌ RAG analysis failed: {e}")
        print("\n🔍 Full traceback:")
        traceback.print_exc()
        return None

def test_formula_analysis():
    """Test formula analysis for comparison"""
    print("\n" + "=" * 50)
    print("🧪 Testing Formula Analysis")
    print("=" * 50)
    
    try:
        from services.formula_analysis_service import FormulaAnalysisService
        
        test_citizen_data = {
            "citizen_id": "debug_test_001",
            "income_bracket": "B2",
            "state": "Selangor",
            "household_size": 4,
            "number_of_children": 2,
            "disability_status": False,
            "is_signature_valid": True,
            "is_data_authentic": True,
            "monthly_income": 3500.0
        }
        
        formula_service = FormulaAnalysisService()
        result = formula_service.analyze(test_citizen_data)
        
        print("   ✅ Formula analysis successful")
        print(f"   📊 Score: {result['score']}")
        print(f"   📋 Class: {result['eligibility_class']}")
        print(f"   📝 Explanation: {result['explanation'][:200]}...")
        
        return result
        
    except Exception as e:
        print(f"   ❌ Formula analysis failed: {e}")
        traceback.print_exc()
        return None

def test_comparison_endpoint():
    """Test the comparison functionality with real data"""
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
        print(f"   📊 Agreement: {comparison['agreement']}")
        print(f"   📏 Score difference: {comparison['score_difference']}")
        print(f"   💡 Recommendation: {comparison['recommendation']}")
        
    except Exception as e:
        print(f"   ❌ Comparison test failed: {e}")
        traceback.print_exc()

def save_results_to_file(rag_result, formula_result):
    """Save detailed results to a downloadable file"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"rag_analysis_results_{timestamp}.txt"
    
    # Build content safely without complex f-string expressions
    rag_score = rag_result.get('score', 'N/A') if rag_result else 'FAILED'
    rag_class = rag_result.get('eligibility_class', 'N/A') if rag_result else 'FAILED'
    rag_confidence = f"{(rag_result.get('confidence', 0) * 100):.1f}%" if rag_result else 'FAILED'
    rag_explanation = rag_result.get('explanation', 'No explanation available') if rag_result else 'Analysis failed - see error logs'
    
    formula_score = formula_result.get('score', 'N/A') if formula_result else 'FAILED'
    formula_class = formula_result.get('eligibility_class', 'N/A') if formula_result else 'FAILED'
    formula_explanation = formula_result.get('explanation', 'No explanation') if formula_result else 'Analysis failed'
    
    # Policy factors
    policy_factors = ""
    if rag_result and 'reasoning_details' in rag_result:
        factors = rag_result['reasoning_details'].get('policy_factors', [])
        policy_factors = "\n".join([f"• {factor}" for factor in factors])
    else:
        policy_factors = "Not available"
    
    # Recommendations
    recommendations = ""
    if rag_result and 'recommendations' in rag_result:
        recs = rag_result.get('recommendations', [])
        recommendations = "\n".join([f"• {rec}" for rec in recs])
    else:
        recommendations = "Not available"
    
    openai_status = 'SET' if 'OPENAI_API_KEY' in os.environ else 'NOT SET'
    tavily_status = 'SET' if 'TAVILY_API_KEY' in os.environ else 'NOT SET'
    mongo_status = 'SET' if 'MONGO_URI' in os.environ else 'NOT SET'
    
    content = f"""RAG Analysis Debug Results
========================
Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

RAG ANALYSIS RESULTS:
====================
Score: {rag_score}
Eligibility Class: {rag_class}
Confidence: {rag_confidence}

Detailed Reasoning:
{rag_explanation}

Policy Factors Considered:
{policy_factors}

Recommendations:
{recommendations}

FORMULA ANALYSIS RESULTS (for comparison):
=========================================
Score: {formula_score}
Eligibility Class: {formula_class}
Explanation: {formula_explanation}

TECHNICAL DETAILS:
=================
Python Version: {sys.version}
Working Directory: {os.getcwd()}
Environment Variables:
- OPENAI_API_KEY: {openai_status}
- TAVILY_API_KEY: {tavily_status}
- MONGO_URI: {mongo_status}

Generated by RAG Debug Script
============================"""
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n💾 Results saved to: {filename}")
        return filename
    except Exception as e:
        print(f"\n❌ Failed to save results: {e}")
        return None

if __name__ == "__main__":
    print(f"🚀 Starting RAG Debug Test at {datetime.now()}")
    
    # Test RAG components
    rag_result = test_rag_components()
    
    # Test formula analysis for comparison
    formula_result = test_formula_analysis()
    
    # Test comparison service
    test_comparison_endpoint()
    
    # Save results to file
    save_results_to_file(rag_result, formula_result)
    
    print("\n" + "=" * 50)
    print("🏁 Debug test completed!")
    print("\nIf you see any errors above, they indicate where the RAG analysis is failing.")
    print("The results file contains the full reasoning output for screenshots.")
    print("\nTo run this test:")
    print("cd backend/smolagents-service")
    print("source venv/bin/activate")
    print("python test_rag_debug.py")
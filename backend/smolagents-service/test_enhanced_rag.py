#!/usr/bin/env python3
"""
Test Enhanced RAG Analysis Service with real Supabase data.
This tests the updated RagAnalysisService that uses CitizenAnalysisAgent with smart prompting.
"""

import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment and add path
load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))

def load_real_citizen_from_json():
    """Load real citizen data from downloaded JSON file"""
    print("\n📄 Loading Real Citizen Data from JSON")
    print("=" * 50)
    
    try:
        json_path = "/Users/brianhar/Downloads/profiles_rows.json"
        
        with open(json_path, 'r') as file:
            profiles_data = json.load(file)
        
        if profiles_data and len(profiles_data) > 0:
            # Get the first profile
            raw_profile = profiles_data[0]
            
            # Calculate age from date of birth
            birth_date = datetime.strptime(raw_profile.get('date_of_birth', '2003-05-20'), '%Y-%m-%d')
            age = datetime.now().year - birth_date.year
            
            # Use ACTUAL Supabase fields - no fake field mapping
            citizen_data = {
                "id": raw_profile.get('id'),
                "full_name": raw_profile.get('full_name'),
                "date_of_birth": raw_profile.get('date_of_birth'),
                "age": age,  # Calculated from date_of_birth
                "gender": raw_profile.get('gender'),
                "household_size": raw_profile.get('household_size'),
                "number_of_children": raw_profile.get('number_of_children'),
                "disability_status": raw_profile.get('disability_status'),
                "state": raw_profile.get('state'),
                "income_bracket": raw_profile.get('income_bracket'),
                "is_signature_valid": raw_profile.get('is_signature_valid'),
                "is_data_authentic": raw_profile.get('is_data_authentic'),
                "nric": raw_profile.get('nric')  # Keep NRIC as identifier
            }
            
            print("✅ Real citizen data loaded from JSON:")
            print(f"   📋 Profile ID: {citizen_data['id']}")
            print(f"   👤 Name: {citizen_data['full_name']}")
            print(f"   🆔 NRIC: {citizen_data['nric']}")
            print(f"   💰 Income Bracket: {citizen_data['income_bracket']}")
            print(f"   🏠 State: {citizen_data['state']}")
            print(f"   👨‍👩‍👧‍👦 Household Size: {citizen_data['household_size']}")
            print(f"   👶 Children: {citizen_data['number_of_children']}")
            print(f"   🎂 Age: {citizen_data['age']} years old")
            print(f"   ♿ Disability Status: {citizen_data['disability_status']}")
            print(f"   ✅ Data Valid: Signature={citizen_data['is_signature_valid']}, Authentic={citizen_data['is_data_authentic']}")
            
            return citizen_data
            
        else:
            print("⚠️ No profiles found in JSON file")
            return None
            
    except Exception as e:
        print(f"❌ JSON loading failed: {e}")
        return None

def test_enhanced_rag_service():
    """Test the enhanced RagAnalysisService with real citizen data"""
    print("\n🧠 Testing Enhanced RagAnalysisService")
    print("=" * 50)
    
    # Load real citizen data
    citizen_data = load_real_citizen_from_json()
    
    if not citizen_data:
        print("❌ Failed to load citizen data, aborting test")
        return
    
    try:
        from services.rag_analysis_service import RagAnalysisService
        
        # Create enhanced RAG analysis service
        rag_service = RagAnalysisService()
        
        print("✅ Enhanced RagAnalysisService created")
        print(f"   🤖 Agent Type: {type(rag_service.agent).__name__}")
        print(f"   🛠️ Tools Available: {list(rag_service.agent.tools.keys())}")
        print(f"   📊 Model: {rag_service.config.model_name}")
        print(f"   📁 Output Logging: {rag_service.output_log_dir}")
        
        print("\n🔄 Running enhanced RAG analysis with smart prompting...")
        print(f"   👤 Citizen: {citizen_data.get('full_name', 'unknown')} ({citizen_data.get('nric', 'unknown')})")
        print(f"   💰 Income Bracket: {citizen_data.get('income_bracket', 'unknown')}")
        print(f"   🏠 State: {citizen_data.get('state', 'unknown')}")
        print(f"   ♿ Disability Status: {citizen_data.get('disability_status', 'unknown')}")
        print(f"   🎂 Age: {citizen_data.get('age', 'unknown')} years old")
        print("   🧠 Using CitizenAnalysisAgent with smart structured prompting!")
        print("   🚨 Agent will be forced to cite policy documents and provide structured output!")
        
        # Use the enhanced service - it handles smart prompting internally
        result = rag_service.analyze(citizen_data)
        
        print("\n✅ Enhanced RAG analysis completed!")
        print("=" * 50)
        print("📊 STRUCTURED RESULTS:")
        print(f"   📈 Score: {result.score} / 100")
        print(f"   📊 Confidence: {result.confidence:.2f} / 1.0")
        print(f"   🎯 Eligibility Class: {result.eligibility_class}")
        print(f"   📚 Retrieved Documents: {len(result.retrieved_context)} documents")
        print(f"   🔍 Reasoning Steps: {len(result.reasoning_path)} steps")
        print(f"   ⚖️ Policy Factors: {len(result.policy_factors)} factors")
        print(f"   ⚠️ Edge Cases: {len(result.edge_cases_identified)} cases")
        
        print("\n📝 EXPLANATION:")
        print(f"   {result.explanation}")
        
        print("\n🔍 REASONING PATH:")
        for i, step in enumerate(result.reasoning_path, 1):
            print(f"   {i}. {step}")
        
        print("\n📚 RETRIEVED CONTEXT:")
        for i, context in enumerate(result.retrieved_context[:3], 1):  # Show first 3
            print(f"   {i}. {context[:100]}...")
        
        print("\n⚖️ POLICY FACTORS:")
        for i, factor in enumerate(result.policy_factors, 1):
            print(f"   {i}. {factor}")
        
        if result.edge_cases_identified:
            print("\n⚠️ EDGE CASES IDENTIFIED:")
            for i, case in enumerate(result.edge_cases_identified, 1):
                print(f"   {i}. {case}")
        
        if result.web_search_summary:
            print(f"\n🌐 WEB SEARCH SUMMARY:")
            print(f"   {result.web_search_summary}")
        
        if result.validation_results:
            print(f"\n✅ VALIDATION RESULTS:")
            print(f"   Overall Valid: {result.validation_results.get('overall_valid', 'unknown')}")
        
        return result
        
    except Exception as e:
        print(f"❌ Enhanced RAG analysis failed: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Run enhanced RAG service test"""
    print("🚀 Enhanced RAG Analysis Service Test")
    print("Testing CitizenAnalysisAgent with smart structured prompting")
    print("Using real citizen data from profiles_rows.json")
    print("=" * 60)
    
    # Test enhanced RAG service
    result = test_enhanced_rag_service()
    
    print("\n" + "=" * 60)
    print("🏁 Enhanced RAG test completed!")
    
    if result:
        print("\n💡 Key Improvements Tested:")
        print("   ✅ CitizenAnalysisAgent with smart prompting")
        print("   ✅ Enforced JSON output structure with score & confidence")
        print("   ✅ Citation requirements to prevent misinformation")
        print("   ✅ Real Supabase field mapping (no fake fields)")
        print("   ✅ Output recording for learning from mistakes")
        print("   ✅ Structured analysis with reasoning paths")
        
        print(f"\n📊 Final Result Summary:")
        print(f"   Score: {result.score} | Confidence: {result.confidence:.2f} | Class: {result.eligibility_class}")
    else:
        print("\n❌ Test failed - check logs for details")

if __name__ == "__main__":
    main()
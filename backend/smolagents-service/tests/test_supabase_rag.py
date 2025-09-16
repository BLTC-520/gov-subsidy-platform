#!/usr/bin/env python3
"""
Test RAG analysis with real Supabase data to debug callback issue.
This follows the correct smolagents pattern from example_agent_usage.py.
"""

import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment and add path
load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def test_simple_agent_with_real_data():
    """Test smolagents CodeAgent with correct pattern and real Supabase data"""
    print("🧪 Testing Simple Agent with Real Supabase Data")
    print("=" * 50)
    
    try:
        # Import required components
        from smolagents import CodeAgent, LiteLLMModel
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
        from tools.citizen_data_validation_tool import CitizenDataValidationTool
        
        print("✅ Imports successful")
        
        # Create simple agent following example pattern
        agent = CodeAgent(
            model=LiteLLMModel(
                model_id="gpt-4o-mini",
                api_key=os.environ["OPENAI_API_KEY"]
            ),
            tools=[
                ChromaDBRetrieverTool(),
                CitizenDataValidationTool()
            ],
            max_steps=5  # Keep it simple
        )
        
        print("✅ Agent created successfully")
        print(f"   Tools: {list(agent.tools.keys())}")
        
        # Load real citizen data for simple test too
        citizen_data = load_real_citizen_from_json()
        if not citizen_data:
            print("❌ Failed to load citizen data, using mock data with correct Supabase fields")
            citizen_data = {
                "id": "test_001", 
                "nric": "000000-00-0000",
                "full_name": "Test Citizen",
                "income_bracket": "B40", 
                "state": "Selangor", 
                "household_size": 4,
                "number_of_children": 2,
                "age": 35,
                "disability_status": False,
                "is_signature_valid": True,
                "is_data_authentic": True
            }
        
        # Simple task with real citizen data
        simple_task = f"""
        Please help me validate this REAL citizen data and search for relevant policies:
        
        Real Citizen Data (Actual Supabase Fields):
        - id: "{citizen_data.get('id', 'unknown')}"
        - nric: "{citizen_data.get('nric', 'unknown')}"
        - full_name: "{citizen_data.get('full_name', 'unknown')}"
        - income_bracket: "{citizen_data.get('income_bracket', 'unknown')}"
        - state: "{citizen_data.get('state', 'unknown')}"
        - household_size: {citizen_data.get('household_size', 'unknown')}
        - number_of_children: {citizen_data.get('number_of_children', 'unknown')}
        - disability_status: {citizen_data.get('disability_status', 'unknown')}
        - age: {citizen_data.get('age', 'unknown')} (calculated from date_of_birth)
        - is_signature_valid: {citizen_data.get('is_signature_valid', 'unknown')}
        - is_data_authentic: {citizen_data.get('is_data_authentic', 'unknown')}
        
        Steps:
        1. Use citizen_data_validator to check this real data
        2. Use chromadb_retriever to find {citizen_data.get('income_bracket', 'M2')} eligibility policies  
        3. Provide structured summary with SCORE and CONFIDENCE
        
        REQUIRED OUTPUT: Must include numerical score (0-100) and confidence (0.0-1.0) in your response.
        """
        
        print("🔄 Running simple agent task...")
        result = agent.run(simple_task)
        
        print("✅ Agent task completed!")
        print(f"Result type: {type(result)}")
        print(f"Result preview: {str(result)[:200]}...")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

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
        print("Using fallback mock data...")
        return {
            "id": "fallback_001",
            "nric": "000000-00-0000", 
            "full_name": "Fallback Citizen",
            "income_bracket": "B40", 
            "state": "Selangor",
            "household_size": 4,
            "number_of_children": 2,
            "age": 35,
            "disability_status": False,
            "is_signature_valid": True,
            "is_data_authentic": True
        }

def test_rag_with_real_citizen_data():
    """Test RAG analysis with actual citizen data"""
    print("\n🏛️ Testing RAG Analysis with Real Citizen Data")
    print("=" * 50)
    
    # Get real citizen data from JSON
    citizen_data = load_real_citizen_from_json()
    
    if not citizen_data:
        print("❌ Failed to load citizen data, aborting test")
        return
    
    try:
        from services.rag_analysis_service import RagAnalysisService
        
        # Create enhanced RAG analysis service with CitizenAnalysisAgent
        rag_service = RagAnalysisService()
        
        print("✅ Enhanced RAG analysis service created")
        print(f"   🤖 Agent Type: {type(rag_service.agent).__name__}")
        print(f"   🛠️ Tools Available: {list(rag_service.agent.tools.keys())}")
        print(f"   📊 Model: {rag_service.config.model_name}")
        print(f"   📁 Output Logging: {rag_service.output_log_dir}")
        
        print("🔄 Running enhanced RAG analysis with smart prompting...")
        print(f"   👤 Citizen: {citizen_data.get('full_name', 'unknown')} ({citizen_data.get('nric', 'unknown')})")
        print(f"   💰 Income Bracket: {citizen_data.get('income_bracket', 'unknown')} (Will find actual thresholds in policy docs)")
        print(f"   🏠 State: {citizen_data.get('state', 'unknown')}")
        print(f"   ♿ Disability Status: {citizen_data.get('disability_status', 'unknown')}")
        print(f"   🎂 Age: {citizen_data.get('age', 'unknown')} years old")
        print("   🧠 Using enhanced CitizenAnalysisAgent with smart structured prompting!")
        
        # Use the enhanced service's analyze method - it handles all the smart prompting internally
        result = rag_service.analyze(citizen_data)
        
        print("✅ Enhanced RAG analysis completed!")
        print(f"   📊 Score: {result.score}")
        print(f"   📈 Confidence: {result.confidence:.2f}")
        print(f"   🎯 Class: {result.eligibility_class}")
        print(f"   📝 Explanation: {result.explanation[:100]}...")
        print(f"   📚 Retrieved Context: {len(result.retrieved_context)} documents")
        print(f"   🔍 Reasoning Steps: {len(result.reasoning_path)} steps")
        
        return result
        
    except Exception as e:
        print(f"❌ Enhanced RAG analysis failed: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Run all tests - now using enhanced RagAnalysisService"""
        Analyze this REAL citizen's eligibility for Malaysian government subsidies.

        🇲🇾 ACTUAL SUPABASE CITIZEN DATA:
        - ID: {citizen_data.get('id', 'unknown')}
        - NRIC: {citizen_data.get('nric', 'unknown')}
        - Full Name: {citizen_data.get('full_name', 'unknown')}
        - Income Bracket: {citizen_data.get('income_bracket', 'unknown')} 
        - State: {citizen_data.get('state', 'unknown')}
        - Age: {citizen_data.get('age', 'unknown')} years old
        - Date of Birth: {citizen_data.get('date_of_birth', 'unknown')}
        - Gender: {citizen_data.get('gender', 'unknown')}
        - Household Size: {citizen_data.get('household_size', 'unknown')}
        - Number of Children: {citizen_data.get('number_of_children', 'unknown')}
        - Disability Status: {citizen_data.get('disability_status', 'unknown')}
        - Signature Valid: {citizen_data.get('is_signature_valid', 'unknown')}
        - Data Authentic: {citizen_data.get('is_data_authentic', 'unknown')}

        🚨 CRITICAL REQUIREMENTS - NO ASSUMPTIONS ALLOWED:
        1. DO NOT make up income thresholds (like "M2 = RM3,000") 
        2. MUST use chromadb_retriever to find ACTUAL policy documents
        3. MUST cite specific policy documents for income bracket definitions
        4. If policy documents don't contain specific income amounts, say "income threshold not found in policy documents"
        
        📋 REQUIRED ANALYSIS STEPS:
        1. Use citizen_data_validator with ACTUAL Supabase fields (no fake fields like citizen_id or residency_duration_months)
        2. Use chromadb_retriever to search for:
           - "{citizen_data.get('income_bracket', 'M2')}" income bracket policy definitions and thresholds
           - Disability benefit policies for status={citizen_data.get('disability_status', 'unknown')}
           - "{citizen_data.get('state', 'Johor')}" state-specific subsidy programs
           - Young adult family support (age {citizen_data.get('age', 'unknown')}, {citizen_data.get('number_of_children', 'unknown')} children)
        3. Use policy_reasoner to assess eligibility ONLY based on retrieved documents
        4. Provide analysis with CITATIONS to specific policy documents

        🔍 CITATION REQUIREMENTS:
        - Every income threshold claim must cite a specific policy document
        - Every eligibility criterion must reference retrieved policy text
        - If information is not found in policy documents, explicitly state this
        - NO assumptions about income amounts or thresholds

        📊 REQUIRED OUTPUT FORMAT - MUST RETURN EXACT JSON STRUCTURE:
        Your final answer MUST be a JSON object with these exact fields:
        {{
            "score": [number 0-100, required],
            "confidence": [number 0.0-1.0, required], 
            "eligibility_class": "[B40|M40-M1|M40-M2|T20, required]",
            "explanation": "[detailed explanation with policy citations, required]",
            "retrieved_context": ["list of policy documents found", "required"],
            "reasoning_path": ["step 1 reasoning", "step 2 reasoning", "required"],
            "policy_factors": ["policy factor 1", "policy factor 2", "required"],
            "edge_cases_identified": ["edge case 1", "required"],
            "web_search_summary": "[summary of web search results, optional]",
            "validation_results": {{"overall_valid": true/false, "required"}}
        }}

        🎯 SCORING GUIDELINES:
        - B40: 70-90 points (high eligibility)
        - M40-M1: 60-75 points (moderate eligibility) 
        - M40-M2: 45-60 points (limited eligibility)
        - T20: 20-40 points (minimal eligibility)
        - Disability status: +5-10 bonus points
        - Family with children: +3-7 bonus points
        - Data authenticity issues: -10-20 points

        🔒 CONFIDENCE GUIDELINES:
        - 0.8-1.0: Strong policy document support
        - 0.6-0.8: Moderate policy support with some gaps
        - 0.4-0.6: Limited policy information available
        - 0.2-0.4: Uncertain due to missing policy data
        - 0.0-0.2: Very uncertain, mostly assumptions
        """
        
        print("🔄 Running real citizen analysis with citation enforcement...")
        print(f"   👤 Citizen: {citizen_data.get('full_name', 'unknown')} ({citizen_data.get('nric', 'unknown')})")
        print(f"   💰 Income Bracket: {citizen_data.get('income_bracket', 'unknown')} (MUST find actual threshold in policy docs)")
        print(f"   🏠 State: {citizen_data.get('state', 'unknown')}")
        print(f"   ♿ Disability Status: {citizen_data.get('disability_status', 'unknown')}")
        print(f"   🎂 Age: {citizen_data.get('age', 'unknown')} years old")
        print("   🚨 Agent MUST cite policy documents - NO assumptions allowed!")
        
        result = agent.run(analysis_task)
        
        print("✅ Real citizen analysis completed!")
        print(f"Result: {str(result)[:300]}...")
        
        return result
        
    except Exception as e:
        print(f"❌ Real citizen analysis failed: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Run all tests"""
    print("🚀 Real Citizen RAG Analysis Test")
    print("Using real citizen data from profiles_rows.json")
    print("=" * 60)
    
    # Test 1: Simple agent creation and tool calling with real data
    test_simple_agent_with_real_data()
    
    # Test 2: Full RAG analysis with real citizen data
    test_rag_with_real_citizen_data()
    
    print("\n" + "=" * 60)
    print("🏁 Real citizen analysis test completed!")
    print("\n💡 This test uses ACTUAL citizen data:")
    print("   - HAR SZE HAO (NRIC: 030520-01-2185)")  
    print("   - M2 Income Bracket (Middle Income)")
    print("   - Johor State")
    print("   - Disability Status: TRUE")
    print("   - Age: 22 years old")
    print("\nThis provides much more realistic testing than mock data!")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Example: How a smolagents agent calls the ChromaDBRetrieverTool

This shows different ways agents can use the ChromaDB retriever tool
for document search and retrieval.
"""

import sys
import os
from dotenv import load_dotenv

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

def example_direct_tool_call():
    """Example 1: Direct tool instantiation and call"""
    print("🔍 Example 1: Direct Tool Call")
    print("=" * 40)
    
    try:
        from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
        
        # Create the tool
        retriever = ChromaDBRetrieverTool()
        
        # Method 1: Use forward() method (returns structured dict)
        print("Method 1: forward() - Returns structured data")
        result = retriever.forward("housing assistance policy", max_results=2)
        print(f"Type: {type(result)}")
        print(f"Keys: {list(result.keys())}")
        print(f"Documents found: {result.get('total_found', 0)}")
        
        print("\nMethod 2: __call__() - Returns formatted string")
        # Method 2: Use __call__ method (smolagents compatible)
        result_str = retriever("eligibility requirements")
        print(f"Type: {type(result_str)}")
        print(f"Preview: {result_str[:200]}...")
        
    except Exception as e:
        print(f"❌ Error: {e}")

def example_agent_with_retriever_tool():
    """Example 2: Agent using the retriever tool"""
    print("\n🤖 Example 2: Agent with ChromaDB Retriever")
    print("=" * 40)
    
    try:
        # This would be the real smolagents code structure
        agent_code = '''
from smolagents import CodeAgent, LiteLLMModel
from tools.chromadb_retriever_tool import ChromaDBRetrieverTool

# Create agent with ChromaDB retriever tool
agent = CodeAgent(
    model=LiteLLMModel(
        model_id="gpt-4o-mini",
        api_key=os.environ["OPENAI_API_KEY"]
    ),
    tools=[
        ChromaDBRetrieverTool(),  # Our retriever tool
        # ... other tools
    ],
    max_steps=10
)

# Agent task example
task = """
Help me find information about housing assistance programs.
Search for relevant policies and eligibility requirements.
"""

# When agent runs, it can call the ChromaDB retriever like this:
# result = chromadb_retriever("housing assistance eligibility")
# The agent will receive the formatted search results and can use them
# to provide informed responses about housing policies.
'''
        print("Agent setup code:")
        print(agent_code)
        
        print("\n💡 The agent would automatically:")
        print("1. Receive user question about housing")
        print("2. Decide to search for relevant documents")
        print("3. Call chromadb_retriever('housing assistance eligibility')")
        print("4. Receive document chunks about housing policies")
        print("5. Use retrieved info to answer user's question")
        
    except Exception as e:
        print(f"❌ Error: {e}")

def example_citizen_analysis_agent():
    """Example 3: How CitizenAnalysisAgent would use the retriever"""
    print("\n👥 Example 3: CitizenAnalysisAgent Integration")
    print("=" * 40)
    
    citizen_analysis_example = '''
# In agents/citizen_analysis_agent.py

class CitizenAnalysisAgent(CodeAgent):
    def __init__(self):
        super().__init__(
            model=LiteLLMModel(model_id="gpt-4o-mini"),
            tools=[
                ChromaDBRetrieverTool(),           # 🔍 Search documents
                CitizenDataValidationTool(),       # ✅ Validate data  
                EligibilityScoreTool(),           # 📊 Calculate scores
            ]
        )
    
    def analyze_citizen_eligibility(self, citizen_data, query):
        task = f"""
        Analyze eligibility for citizen: {citizen_data['citizen_id']}
        
        Citizen Profile:
        - Income Bracket: {citizen_data['income_bracket']}
        - State: {citizen_data['state']}
        - Household Size: {citizen_data['household_size']}
        
        Query: {query}
        
        Steps:
        1. Search for relevant eligibility policies using chromadb_retriever
        2. Validate the citizen data using citizen_data_validator  
        3. Calculate eligibility score using eligibility_scorer
        4. Provide comprehensive analysis and recommendations
        """
        
        return self.run(task)

# Agent execution flow:
# 1. Agent receives task
# 2. LLM decides: "I need to search for eligibility policies"  
# 3. Agent calls: chromadb_retriever("B40 housing eligibility Malaysia")
# 4. Retriever returns: Policy documents about B40 housing programs
# 5. LLM analyzes documents + citizen data
# 6. Agent calls: citizen_data_validator(citizen_data)
# 7. Agent calls: eligibility_scorer(analysis_results)
# 8. Agent synthesizes final comprehensive analysis
'''
    
    print("CitizenAnalysisAgent integration:")
    print(citizen_analysis_example)

def example_tool_outputs():
    """Example 4: Show what the tool outputs look like"""
    print("\n📄 Example 4: Tool Output Formats")
    print("=" * 40)
    
    # Simulate tool outputs (what the agent would receive)
    structured_output_example = {
        "documents": [
            {
                "content": "Housing assistance programs are available for B40 income families...",
                "metadata": {"chunk_id": "chunk_123", "source_file": "housing_policy_2024.pdf"},
                "source_file": "housing_policy_2024.pdf",
                "page_number": 15
            }
        ],
        "query": "housing assistance B40",
        "total_found": 3,
        "search_type": "semantic"
    }
    
    string_output_example = """Found 3 documents for 'housing assistance B40':

===== Document 1 =====
Source: housing_policy_2024.pdf
Chunk ID: chunk_123
Page: 15

Housing assistance programs are available for B40 income families...
"""
    
    print("Structured output (forward method):")
    print(structured_output_example)
    print("\nString output (__call__ method):")
    print(string_output_example)

def main():
    """Run all examples"""
    print("🚀 ChromaDB Retriever Tool - Agent Usage Examples")
    print("=" * 60)
    
    example_direct_tool_call()
    example_agent_with_retriever_tool()  
    example_citizen_analysis_agent()
    example_tool_outputs()
    
    print("\n" + "=" * 60)
    print("💡 Key Points:")
    print("1. Agents can call the tool directly via tool name")
    print("2. Tool returns either structured data or formatted strings")
    print("3. Agent LLM decides when to search based on the task")
    print("4. Retrieved documents inform agent's responses")
    print("5. Compatible with existing smolagents Tool interface")

if __name__ == "__main__":
    main()
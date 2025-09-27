#!/usr/bin/env python3
"""
Agentic Tool Orchestrator - CodeAgent with Dynamic JSON Input

This uses the smolagents CodeAgent framework to let the agent decide
which tools to use and when, with dynamic JSON input that can be changed each run.
"""

import os
import sys
import json
import re
import traceback
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AgenticCitizenAnalysisOrchestrator:
    """
    Agentic orchestrator using CodeAgent that lets the framework decide tool usage.

    The agent will autonomously:
    - Analyze the input JSON
    - Decide which tools are needed
    - Execute tools in the order it determines
    - Provide final analysis with scoring
    """

    def __init__(self):
        """Initialize agentic orchestrator with CodeAgent"""
        print("🤖 Initializing Agentic Citizen Analysis Orchestrator...")

        try:
            # Import smolagents components
            from smolagents import CodeAgent, LiteLLMModel

            # Import all available tools
            from tools.citizen_data_validation_tool import CitizenDataValidationTool
            from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
            from tools.tavily_search_tool import TavilySearchTool
            from tools.policy_reasoning_tool import PolicyReasoningTool

            # Initialize tools
            self.validator_tool = CitizenDataValidationTool()
            self.chromadb_tool = ChromaDBRetrieverTool()
            self.tavily_tool = TavilySearchTool()
            self.policy_tool = PolicyReasoningTool()

            # Create tools list for agent
            tools = [
                self.validator_tool,
                self.chromadb_tool,
                self.tavily_tool,
                self.policy_tool
            ]

            # Initialize LiteLLM model with optimal settings - Updated to gpt-4.1-2025-04-14
            model = LiteLLMModel(
                model_id="gpt-4.1-2025-04-14",
                temperature=0.1,
                max_tokens=3000,
                requests_per_minute=60,
                api_key=os.getenv("OPENAI_API_KEY")
            )

            # Create CodeAgent with planning disabled for better control
            self.agent = CodeAgent(
                tools=tools,
                model=model,
                planning_interval=None,  # Disable planning for direct execution
                stream_outputs=False,
                max_print_outputs_length=1000
            )

            print("✅ CodeAgent initialized successfully with all tools:")
            for tool in tools:
                print(f"   🛠️  {getattr(tool, 'name', tool.__class__.__name__)}")

        except Exception as e:
            print(f"❌ Failed to initialize orchestrator: {str(e)}")
            raise

    def analyze_citizen(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze citizen using CodeAgent with agentic tool selection.

        Args:
            input_data: Dynamic JSON input with citizen_id and citizen_data

        Returns:
            Complete analysis results with agent reasoning and final scores
        """
        print("\n🚀 Starting Agentic Analysis")
        print("=" * 70)

        start_time = datetime.now()

        # Setup output logging to file
        log_filename = f"agent_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        log_file = open(log_filename, 'w', encoding='utf-8')

        def log_and_print(message):
            print(message)
            log_file.write(message + "\n")
            log_file.flush()

        # Log header with analysis details
        log_and_print("=" * 100)
        log_and_print("🤖 SMOLAGENTS AGENTIC ANALYSIS - DETAILED LOG")
        log_and_print("=" * 100)
        log_and_print(f"📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        log_and_print(f"🎯 Model: gpt-4.1-2025-04-14 (Enhanced reasoning)")
        log_and_print(f"🛠️  Tools Available: citizen_data_validator, chromadb_retriever, tavily_search, policy_reasoner")
        log_and_print(f"📁 Log File: {log_filename}")
        log_and_print("=" * 100)

        try:
            # Extract citizen information
            citizen_id = input_data.get("citizen_id", "unknown")
            citizen_data = input_data.get("citizen_data", {})

            log_and_print(f"🆔 Citizen ID: {citizen_id}")
            log_and_print(f"👤 Citizen Name: {citizen_data.get('full_name', 'Unknown')}")
            log_and_print(f"📍 State: {citizen_data.get('state', 'Unknown')}")
            log_and_print(f"💰 Income Bracket: {citizen_data.get('income_bracket', 'Unknown')}")

            # Create comprehensive analysis prompt for the agent
            analysis_prompt = self._create_agentic_prompt(citizen_id, citizen_data)

            log_and_print(f"\n🧠 Executing CodeAgent Analysis...")
            log_and_print("   Agent will decide which tools to use and in what order")
            log_and_print("-" * 50)

            # Run the CodeAgent - it will decide tool usage autonomously
            agent_result = self.agent.run(analysis_prompt)

            execution_time = (datetime.now() - start_time).total_seconds()

            log_and_print(f"\n✅ Agent analysis completed in {execution_time:.2f}s")
            log_and_print("-" * 50)
            log_and_print(f"\n📊 DETAILED AGENT ANALYSIS:")
            log_and_print("=" * 80)
            log_and_print("FULL AGENT OUTPUT (NO TRUNCATION):")
            log_and_print("-" * 50)

            # Log the complete agent result without truncation
            full_result = str(agent_result)
            log_and_print(full_result)

            log_and_print("-" * 50)
            log_and_print("AGENT WORKFLOW ANALYSIS:")
            log_and_print("-" * 50)

            # Extract and log tool usage details
            if hasattr(agent_result, '__dict__'):
                for attr, value in agent_result.__dict__.items():
                    log_and_print(f"{attr}: {value}")

            # Try to extract referenced files and reasoning
            result_str = str(agent_result)
            if "Document" in result_str:
                log_and_print("\n📁 REFERENCED DOCUMENTS:")
                doc_matches = re.findall(r'Source: ([^\\n]+)', result_str)
                chunk_matches = re.findall(r'Chunk ID: ([^\\n]+)', result_str)
                page_matches = re.findall(r'Page: ([^\\n]+)', result_str)

                for i, (source, chunk, page) in enumerate(zip(doc_matches, chunk_matches, page_matches), 1):
                    log_and_print(f"  {i}. Source File: {source}")
                    log_and_print(f"     Chunk ID: {chunk}")
                    log_and_print(f"     Page: {page}")

            if "score" in result_str.lower():
                log_and_print("\n🎯 SCORING DETAILS:")
                score_matches = re.findall(r'score[\'\":]?\s*([0-9.]+)', result_str, re.IGNORECASE)
                for score in score_matches:
                    log_and_print(f"  Score found: {score}")

            log_and_print("=" * 80)

            # Process and structure the results
            structured_result = self._process_agent_result(
                agent_result,
                citizen_id,
                citizen_data,
                execution_time
            )

            log_and_print(f"\n💾 Analysis log saved to: {log_filename}")
            return structured_result

        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            error_msg = f"\n❌ Agent analysis failed after {execution_time:.2f}s: {str(e)}"
            log_and_print(error_msg)
            log_and_print(traceback.format_exc())

            return {
                "status": "error",
                "citizen_id": input_data.get("citizen_id", "unknown"),
                "error": str(e),
                "error_type": type(e).__name__,
                "execution_time": execution_time,
                "timestamp": datetime.now().isoformat()
            }

        finally:
            # Always close the log file
            if 'log_file' in locals():
                log_file.close()

    def _create_agentic_prompt(self, citizen_id: str, citizen_data: Dict[str, Any]) -> str:
        """Create comprehensive prompt that lets the agent decide tool usage"""

        return f"""You are an expert Malaysian government subsidy eligibility analyst with access to specialized analysis tools.

CITIZEN TO ANALYZE:
ID: {citizen_id}
Data: {json.dumps(citizen_data, indent=2)}

YOUR MISSION:
Perform a comprehensive eligibility analysis for Malaysian government subsidies. You have access to these tools:

🔍 citizen_data_validator - Validates and checks data completeness and accuracy
📚 chromadb_retriever - Retrieves relevant policy documents from knowledge base
🌐 tavily_search - Searches for latest government policy updates and news
🧠 policy_reasoner - Performs detailed policy analysis with context

INSTRUCTIONS:
1. ANALYZE the citizen data and DECIDE which tools you need to use
2. USE the tools in whatever order makes most sense for thorough analysis
3. GATHER all relevant policy context and recent updates
4. PROVIDE a final comprehensive assessment

REQUIRED FINAL OUTPUT STRUCTURE:
After using your selected tools, you MUST provide:

**ELIGIBILITY SCORE**: [0-100 numerical score]
**INCOME CLASSIFICATION**: [B40/M40/T20 category with specific tier like B4, M40-M1, etc.]
**FINAL RECOMMENDATION**: [Approve/Conditional Approve/Reject with clear reasoning]
**CONFIDENCE LEVEL**: [High/Medium/Low with percentage]
**KEY FACTORS**: [List main factors that influenced your decision]
**POLICY BASIS**: [Cite specific policies or documents that support your assessment]

ANALYSIS FOCUS AREAS:
- Income bracket verification for {citizen_data.get('income_bracket', 'Unknown')} classification
- {citizen_data.get('state', 'Unknown')} state-specific eligibility criteria
- Household composition impact (size: {citizen_data.get('household_number', 'Unknown')}, children: {citizen_data.get('number_of_child', 'Unknown')})
- Document authenticity verification
- Recent policy changes affecting eligibility

Take your time, use the tools strategically, and provide thorough analysis. The agent framework trusts you to make the right tool selection decisions.

Begin your analysis now."""

    def _process_agent_result(
        self,
        agent_result: Any,
        citizen_id: str,
        citizen_data: Dict[str, Any],
        execution_time: float
    ) -> Dict[str, Any]:
        """Process and structure the agent's raw result into standardized format"""

        try:
            # Convert agent result to string for parsing
            result_str = str(agent_result)

            # Try to extract structured information from the result
            extracted_info = self._extract_analysis_components(result_str)

            return {
                "status": "completed",
                "citizen_id": citizen_id,
                "citizen_data": citizen_data,
                "analysis_results": {
                    "eligibility_score": extracted_info.get("score"),
                    "income_classification": extracted_info.get("classification"),
                    "final_recommendation": extracted_info.get("recommendation"),
                    "confidence_level": extracted_info.get("confidence"),
                    "key_factors": extracted_info.get("factors", []),
                    "policy_basis": extracted_info.get("policy_basis", [])
                },
                "raw_agent_output": result_str,
                "execution_time": execution_time,
                "timestamp": datetime.now().isoformat(),
                "analysis_method": "agentic_framework"
            }

        except Exception as e:
            return {
                "status": "processing_error",
                "citizen_id": citizen_id,
                "error": f"Failed to process agent result: {str(e)}",
                "raw_agent_output": str(agent_result),
                "execution_time": execution_time,
                "timestamp": datetime.now().isoformat()
            }

    def _extract_analysis_components(self, result_text: str) -> Dict[str, Any]:
        """Extract structured analysis components from agent output"""

        import re

        extracted = {}

        # Extract eligibility score
        score_pattern = r'(?:ELIGIBILITY SCORE|Score)[:\s]*(\d+(?:\.\d+)?)'
        score_match = re.search(score_pattern, result_text, re.IGNORECASE)
        if score_match:
            extracted["score"] = float(score_match.group(1))

        # Extract income classification
        class_pattern = r'(?:INCOME CLASSIFICATION|Classification)[:\s]*(B40|M40|T20|B\d+|M40-M\d+|T20-T\d+)'
        class_match = re.search(class_pattern, result_text, re.IGNORECASE)
        if class_match:
            extracted["classification"] = class_match.group(1)

        # Extract recommendation
        rec_pattern = r'(?:FINAL RECOMMENDATION|Recommendation)[:\s]*(Approve|Conditional Approve|Reject|Approved|Rejected)'
        rec_match = re.search(rec_pattern, result_text, re.IGNORECASE)
        if rec_match:
            extracted["recommendation"] = rec_match.group(1)

        # Extract confidence
        conf_pattern = r'(?:CONFIDENCE LEVEL|Confidence)[:\s]*(High|Medium|Low|[\d.]+%?)'
        conf_match = re.search(conf_pattern, result_text, re.IGNORECASE)
        if conf_match:
            extracted["confidence"] = conf_match.group(1)

        # Extract key factors (look for bullet points or numbered lists)
        factors_section = re.search(r'(?:KEY FACTORS|Key factors)[:\s]*(.*?)(?:\n\n|\*\*|\n[A-Z])', result_text, re.IGNORECASE | re.DOTALL)
        if factors_section:
            factors_text = factors_section.group(1)
            factors = re.findall(r'[•\-\*]\s*(.+)', factors_text)
            extracted["factors"] = factors[:5]  # Limit to 5 factors

        return extracted

    def display_results(self, results: Dict[str, Any]):
        """Display comprehensive analysis results"""
        print("\n" + "🏆" * 25 + " AGENTIC ANALYSIS RESULTS " + "🏆" * 25)

        if results.get("status") == "error":
            print(f"❌ Analysis failed: {results.get('error', 'Unknown error')}")
            return

        citizen_data = results.get("citizen_data", {})
        analysis = results.get("analysis_results", {})

        print(f"\n👤 CITIZEN PROFILE:")
        print(f"   🆔 ID: {results.get('citizen_id', 'N/A')}")
        print(f"   📝 Name: {citizen_data.get('full_name', 'N/A')}")
        print(f"   🏠 State: {citizen_data.get('state', 'N/A')}")
        print(f"   💰 Income Bracket: {citizen_data.get('income_bracket', 'N/A')}")
        print(f"   👨‍👩‍👧‍👦 Household: {citizen_data.get('household_number', 'N/A')} members, {citizen_data.get('number_of_child', 'N/A')} children")

        print(f"\n📊 AGENTIC ANALYSIS RESULTS:")
        print(f"   🎯 Eligibility Score: {analysis.get('eligibility_score', 'N/A')}")
        print(f"   🏷️  Classification: {analysis.get('income_classification', 'N/A')}")
        print(f"   ✅ Recommendation: {analysis.get('final_recommendation', 'N/A')}")
        print(f"   🎪 Confidence: {analysis.get('confidence_level', 'N/A')}")

        factors = analysis.get('key_factors', [])
        if factors:
            print(f"\n🔍 KEY FACTORS:")
            for i, factor in enumerate(factors, 1):
                print(f"   {i}. {factor}")

        print(f"\n⏱️  PERFORMANCE:")
        print(f"   Execution Time: {results.get('execution_time', 0):.2f}s")
        print(f"   Analysis Method: {results.get('analysis_method', 'N/A')}")
        print(f"   Timestamp: {results.get('timestamp', 'N/A')}")

        print(f"\n📄 AGENT OUTPUT SAMPLE:")
        raw_output = results.get('raw_agent_output', '')
        if len(raw_output) > 500:
            print(f"   {raw_output[:500]}...")
            print(f"   [Output truncated - full length: {len(raw_output)} characters]")
        else:
            print(f"   {raw_output}")

        print("\n" + "🏆" * 80)


def load_input_from_file(filename: str = "citizen_input.json") -> Dict[str, Any]:
    """Load citizen input from JSON file"""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  File {filename} not found. Using default input.")
        return get_default_input()
    except json.JSONDecodeError as e:
        print(f"⚠️  Invalid JSON in {filename}: {e}. Using default input.")
        return get_default_input()

def get_default_input() -> Dict[str, Any]:
    """Get default citizen input data"""
    return {
        "citizen_id": "58e7db18-c58c-4e69-8b62-bc49d578b600",
        "citizen_data": {
            "email": "meiling@gmail.com",
            "full_name": "TAN MEI LING",
            "nric": "850420-04-3344",
            "birthday": "1985-04-20",
            "income_bracket": "B4",
            "state": "Melaka",
            "household_number": 4,
            "number_of_child": 2,
            "is_signature_valid": True,
            "is_data_authentic": True
        }
    }

def save_sample_input():
    """Save sample input JSON file for easy editing"""
    sample_data = get_default_input()
    with open("citizen_input.json", 'w') as f:
        json.dump(sample_data, f, indent=2)
    print("📁 Created citizen_input.json - edit this file to change input data")

def main():
    """Main agentic orchestrator demo"""
    print("🤖 AGENTIC CITIZEN ANALYSIS ORCHESTRATOR")
    print("CodeAgent with Dynamic JSON Input")
    print("=" * 80)
    print(f"📅 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Environment check
    required_vars = ["OPENAI_API_KEY", "TAVILY_API_KEY", "MONGO_URI"]
    missing = [var for var in required_vars if not os.getenv(var)]

    if missing:
        print(f"⚠️  Missing environment variables: {', '.join(missing)}")
        print("This may cause tool failures.\n")
    else:
        print("✅ All required environment variables present.\n")

    try:
        # Create sample input file if it doesn't exist
        if not os.path.exists("citizen_input.json"):
            save_sample_input()

        # Load input data (can be changed each run)
        print("📄 Loading citizen input data...")
        input_data = load_input_from_file()

        print(f"✅ Loaded citizen: {input_data['citizen_data'].get('full_name', 'Unknown')}")
        print(f"   Income bracket: {input_data['citizen_data'].get('income_bracket', 'Unknown')}")
        print(f"   State: {input_data['citizen_data'].get('state', 'Unknown')}")

        # Create orchestrator
        orchestrator = AgenticCitizenAnalysisOrchestrator()

        # Execute agentic analysis
        results = orchestrator.analyze_citizen(input_data)

        # Display results
        orchestrator.display_results(results)

        # Success message
        if results.get("status") == "completed":
            print("\n🚀 SUCCESS: Agentic framework analysis completed!")
            print("✅ CodeAgent autonomously selected and executed tools")
            print("✅ Dynamic input JSON processing successful")
            print("✅ Complete eligibility analysis with scoring")
            print("\n💡 To change input: Edit citizen_input.json and run again")

    except KeyboardInterrupt:
        print("\n👋 Demo interrupted by user")
    except Exception as e:
        print(f"\n💥 Demo failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
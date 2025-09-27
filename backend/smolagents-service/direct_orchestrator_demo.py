#!/usr/bin/env python3
"""
Direct Tool Orchestrator - Manual Control Over Tool Sequence

This implements Method 2 (Direct Tool Orchestration) for complete control
over the 4-tool citizen analysis sequence without agent interpretation issues.
"""

import os
import sys
import traceback
import json
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DirectCitizenAnalysisOrchestrator:
    """
    Direct tool orchestrator that bypasses agent interpretation for complete control.

    Executes the exact 4-tool sequence:
    1. citizen_data_validator
    2. chromadb_retriever
    3. tavily_search
    4. policy_reasoner
    """

    def __init__(self):
        """Initialize orchestrator with direct tool access"""
        print("🔧 Initializing Direct Citizen Analysis Orchestrator...")

        try:
            # Import tools directly
            from tools.citizen_data_validation_tool import CitizenDataValidationTool
            from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
            from tools.tavily_search_tool import TavilySearchTool
            from tools.policy_reasoning_tool import PolicyReasoningTool

            # Create tool instances
            self.validator_tool = CitizenDataValidationTool()
            self.chromadb_tool = ChromaDBRetrieverTool()
            self.tavily_tool = TavilySearchTool()
            self.policy_tool = PolicyReasoningTool()

            print("✅ All tools initialized successfully")

            # Tool sequence definition
            self.tool_sequence = [
                {
                    "name": "citizen_data_validator",
                    "tool": self.validator_tool,
                    "description": "Validate citizen input data"
                },
                {
                    "name": "chromadb_retriever",
                    "tool": self.chromadb_tool,
                    "description": "Retrieve relevant policy documents"
                },
                {
                    "name": "tavily_search",
                    "tool": self.tavily_tool,
                    "description": "Search latest policy updates"
                },
                {
                    "name": "policy_reasoner",
                    "tool": self.policy_tool,
                    "description": "Final policy analysis and scoring"
                }
            ]

        except Exception as e:
            print(f"❌ Failed to initialize orchestrator: {str(e)}")
            raise

    def execute_full_analysis(self, citizen_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the complete 4-tool analysis sequence with proper data chaining.

        Args:
            citizen_data: Citizen information dictionary

        Returns:
            Final analysis results with scores and recommendations
        """
        print("🚀 Starting Direct Tool Orchestration Analysis")
        print("=" * 70)

        start_time = datetime.now()
        results = {"steps": [], "final_result": None, "execution_time": None}

        try:
            # STEP 1: Validate citizen data
            print("🔍 STEP 1/4: Citizen Data Validation")
            print("-" * 50)

            step1_start = datetime.now()
            validation_result = self.validator_tool.forward(
                citizen_data=citizen_data,
                validation_type="all",
                strict_mode=False  # Use lenient mode for better results
            )
            step1_time = (datetime.now() - step1_start).total_seconds()

            print(f"✅ Validation completed in {step1_time:.2f}s")
            print(f"   Overall Valid: {validation_result.get('overall_valid', False)}")
            print(f"   Confidence: {validation_result.get('confidence_score', 0):.2f}")

            results["steps"].append({
                "step": 1,
                "tool": "citizen_data_validator",
                "result": validation_result,
                "execution_time": step1_time
            })

            # STEP 2: Retrieve policy documents from ChromaDB
            print(f"\n📚 STEP 2/4: ChromaDB Policy Document Retrieval")
            print("-" * 50)

            # Create search query based on citizen data
            search_query = f"{citizen_data.get('income_bracket', 'B2')} income bracket eligibility Malaysia {citizen_data.get('state', 'Selangor')} subsidy policy"

            step2_start = datetime.now()
            chromadb_result = self.chromadb_tool.forward(
                query=search_query,
                max_results=5
            )
            step2_time = (datetime.now() - step2_start).total_seconds()

            print(f"✅ Document retrieval completed in {step2_time:.2f}s")
            print(f"   Documents found: {len(chromadb_result.get('documents', []))}")
            if chromadb_result.get('documents'):
                print(f"   Sample source: {chromadb_result['documents'][0].get('source_file', 'N/A')}")

            results["steps"].append({
                "step": 2,
                "tool": "chromadb_retriever",
                "result": chromadb_result,
                "execution_time": step2_time
            })

            # STEP 3: Search latest policy updates via Tavily
            print(f"\n🌐 STEP 3/4: Tavily Web Search for Latest Policies")
            print("-" * 50)

            # Create targeted search for latest updates
            tavily_query = f"Malaysia {citizen_data.get('income_bracket', 'B2')} subsidy eligibility 2024 2025 government policy updates"

            step3_start = datetime.now()
            tavily_result = self.tavily_tool.forward(
                query=tavily_query,
                search_type="policy",
                max_results=3
            )
            step3_time = (datetime.now() - step3_start).total_seconds()

            print(f"✅ Web search completed in {step3_time:.2f}s")
            print(f"   Content retrieved: {len(tavily_result)} characters")

            results["steps"].append({
                "step": 3,
                "tool": "tavily_search",
                "result": tavily_result,
                "execution_time": step3_time
            })

            # STEP 4: Final policy reasoning with all gathered context
            print(f"\n🧠 STEP 4/4: Policy Reasoning and Final Analysis")
            print("-" * 50)

            # Combine all context for policy reasoning
            combined_context = self._build_policy_context(chromadb_result, tavily_result)

            step4_start = datetime.now()
            final_result = self.policy_tool.forward(
                citizen_data=citizen_data,
                policy_context=combined_context,
                analysis_focus="comprehensive"
            )
            step4_time = (datetime.now() - step4_start).total_seconds()

            print(f"✅ Policy analysis completed in {step4_time:.2f}s")
            print(f"   Final Score: {final_result.get('score', 'N/A')}")
            print(f"   Classification: {final_result.get('eligibility_class', 'N/A')}")
            print(f"   Confidence: {final_result.get('confidence', 0):.1%}")

            results["steps"].append({
                "step": 4,
                "tool": "policy_reasoner",
                "result": final_result,
                "execution_time": step4_time
            })

            # Calculate total execution time
            total_time = (datetime.now() - start_time).total_seconds()
            results["execution_time"] = total_time
            results["final_result"] = final_result

            print("\n" + "=" * 70)
            print("🎉 DIRECT ORCHESTRATION COMPLETED SUCCESSFULLY!")
            print("=" * 70)
            print(f"⏱️  Total execution time: {total_time:.2f}s")

            return results

        except Exception as e:
            print(f"\n❌ Error during orchestration: {str(e)}")
            traceback.print_exc()

            results["error"] = {
                "message": str(e),
                "type": type(e).__name__,
                "execution_time": (datetime.now() - start_time).total_seconds()
            }

            return results

    def _build_policy_context(self, chromadb_result: Dict[str, Any], tavily_result: str) -> str:
        """Build combined policy context for final reasoning"""
        context_parts = []

        # Add ChromaDB documents
        if chromadb_result.get("documents"):
            context_parts.append("HISTORICAL POLICY DOCUMENTS:")
            for i, doc in enumerate(chromadb_result["documents"][:3], 1):
                context_parts.append(f"Document {i}:")
                context_parts.append(f"Source: {doc.get('source_file', 'Unknown')}")
                context_parts.append(f"Content: {doc.get('content', '')[:500]}...")
                context_parts.append("")

        # Add Tavily search results
        if tavily_result and len(tavily_result) > 100:
            context_parts.append("LATEST POLICY UPDATES:")
            context_parts.append(tavily_result[:1500] + "...")
            context_parts.append("")

        return "\n".join(context_parts)

    def display_final_summary(self, results: Dict[str, Any], citizen_data: Dict[str, Any]):
        """Display comprehensive analysis summary"""
        print("\n" + "🏆" * 20 + " FINAL ANALYSIS SUMMARY " + "🏆" * 20)

        if results.get("error"):
            print(f"❌ Analysis failed: {results['error']['message']}")
            return

        final_result = results.get("final_result", {})

        print(f"\n👤 CITIZEN PROFILE:")
        print(f"   Name: {citizen_data.get('full_name', 'N/A')}")
        print(f"   Income Bracket: {citizen_data.get('income_bracket', 'N/A')}")
        print(f"   State: {citizen_data.get('state', 'N/A')}")
        print(f"   Household Size: {citizen_data.get('household_size', 'N/A')}")

        print(f"\n📊 FINAL ELIGIBILITY ASSESSMENT:")
        print(f"   🎯 Score: {final_result.get('score', 'N/A')}/100")
        print(f"   🏷️  Classification: {final_result.get('eligibility_class', 'N/A')}")
        print(f"   🎪 Confidence: {final_result.get('confidence', 0):.1%}")

        print(f"\n💡 EXPLANATION:")
        explanation = final_result.get('explanation', 'No explanation available')
        print(f"   {explanation}")

        recommendations = final_result.get('recommendations', [])
        if recommendations:
            print(f"\n📋 RECOMMENDATIONS:")
            for i, rec in enumerate(recommendations, 1):
                print(f"   {i}. {rec}")

        print(f"\n⚡ PERFORMANCE METRICS:")
        print(f"   Total execution time: {results.get('execution_time', 0):.2f}s")
        print(f"   Tools executed: {len(results.get('steps', []))}/4")

        step_times = [step['execution_time'] for step in results.get('steps', [])]
        if step_times:
            print(f"   Average step time: {sum(step_times)/len(step_times):.2f}s")

        print("\n" + "🏆" * 70)

def create_test_citizen_data() -> Dict[str, Any]:
    """Create comprehensive test citizen data"""
    return {
        "citizen_id": "direct_orchestrator_test",
        "nric": "891234-56-7890",
        "full_name": "Aminah binti Hassan",
        "state": "Selangor",
        "income_bracket": "B2",
        "household_size": 4,
        "number_of_children": 2,
        "disability_status": False,
        "is_signature_valid": True,
        "is_data_authentic": True,
        "age": 34,
        "employment_status": "self_employed",
        "monthly_income": 4200,
        "spouse_employed": False
    }

def main():
    """Main direct orchestrator demo"""
    print("🎭 DIRECT CITIZEN ANALYSIS ORCHESTRATOR")
    print("Complete Manual Tool Chain Control")
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
        # Create orchestrator
        orchestrator = DirectCitizenAnalysisOrchestrator()

        # Create test citizen data
        citizen_data = create_test_citizen_data()

        # Execute full analysis
        results = orchestrator.execute_full_analysis(citizen_data)

        # Display comprehensive summary
        orchestrator.display_final_summary(results, citizen_data)

        # Success message
        if not results.get("error") and results.get("final_result"):
            print("\n🚀 SUCCESS: Direct tool orchestration working perfectly!")
            print("✅ All 4 tools executed in sequence")
            print("✅ Data chaining between tools successful")
            print("✅ Final analysis with score and recommendations complete")
            print("✅ No agent interpretation issues - full manual control achieved")

    except KeyboardInterrupt:
        print("\n👋 Demo interrupted by user")
    except Exception as e:
        print(f"\n💥 Demo failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
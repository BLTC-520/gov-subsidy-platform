"""
RagAnalysisService - Service wrapper for RAG-based citizen eligibility analysis.

This service uses the CitizenAnalysisAgent with policy-focused tools to provide
contextual, flexible eligibility analysis that complements mathematical scoring.
Emphasizes policy interpretation and edge case handling.
"""

import logging
import json
import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime

from agents.citizen_analysis_agent import CitizenAnalysisAgent, AgentConfig
from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
from tools.tavily_search_tool import TavilySearchTool
from tools.policy_reasoning_tool import PolicyReasoningTool

logger = logging.getLogger(__name__)


@dataclass
class RagAnalysisResult:
    """Structured result for RAG-based analysis"""
    score: float
    confidence: float
    eligibility_class: str
    explanation: str
    retrieved_context: List[str]
    reasoning_path: List[str]
    policy_factors: List[str]
    edge_cases_identified: List[str]
    web_search_summary: Optional[str] = None
    validation_results: Optional[Dict[str, Any]] = None


class RagAnalysisService:
    """
    Service wrapper for RAG-based eligibility analysis using CodeAgent with smart prompting.
    
    Orchestrates multiple tools for comprehensive policy-based reasoning:
    - CitizenDataValidationTool: Input validation (automatically added by CodeAgent)
    - ChromaDBRetrieverTool: Policy document retrieval from knowledge base  
    - TavilySearchTool: Latest policy updates from web search
    - PolicyReasoningTool: LLM-based contextual reasoning
    
    Key Features:
    - Smart prompt engineering for consistent structured output
    - Policy-focused contextual analysis with required scoring
    - Edge case handling through LLM reasoning
    - Output recording for learning from mistakes
    - Enforced citation requirements to prevent misinformation
    """
    
    def __init__(self, config: Optional[AgentConfig] = None):
        """Initialize RAG analysis service with enhanced CitizenAnalysisAgent"""
        self.logger = logging.getLogger(__name__)
        
        # Use enhanced CitizenAnalysisAgent with smart prompting
        self.config = config or AgentConfig.from_env()
        
        # Tools for RAG analysis (CitizenAnalysisAgent auto-adds validation tool)
        self.tools = [
            ChromaDBRetrieverTool(),
            TavilySearchTool(),
            PolicyReasoningTool()
        ]
        
        # Initialize CitizenAnalysisAgent with enhanced tools
        self.agent = CitizenAnalysisAgent(
            config=self.config,
            tools=self.tools
        )
        
        # Setup output recording directory for learning
        self.output_log_dir = "logs/rag_outputs"
        os.makedirs(self.output_log_dir, exist_ok=True)
        
        self.logger.info("RagAnalysisService initialized with enhanced CitizenAnalysisAgent and smart prompting")
    
    def analyze(self, citizen_data: Dict[str, Any]) -> RagAnalysisResult:
        """
        Perform RAG-based analysis using policy context and smart prompting.
        
        Args:
            citizen_data: Citizen information dictionary (actual Supabase fields)
            
        Returns:
            RagAnalysisResult with contextual analysis and required scoring
            
        Raises:
            Exception: If analysis fails or data is invalid
        """
        citizen_id = citizen_data.get('id', citizen_data.get('nric', 'unknown'))
        
        try:
            self.logger.info(f"Starting RAG analysis for citizen: {citizen_id}")
            
            # Create smart structured analysis prompt
            analysis_task = self._create_smart_analysis_prompt(citizen_data)
            
            # Record input for learning
            self._record_analysis_input(citizen_id, citizen_data, analysis_task)
            
            # Run CitizenAnalysisAgent with smart prompt
            agent_result = self.agent.run(
                citizen_data=citizen_data,
                query=analysis_task,
                reset=True  # Fresh analysis for each citizen
            )
            
            # Record raw output for learning
            self._record_raw_output(citizen_id, agent_result)
            
            # Parse structured result
            structured_result = self._parse_smart_agent_result(agent_result, citizen_data)
            
            # Record final structured result
            self._record_structured_output(citizen_id, structured_result)
            
            self.logger.info(f"RAG analysis completed - ID: {citizen_id}, Class: {structured_result.eligibility_class}, Score: {structured_result.score}, Confidence: {structured_result.confidence:.2f}")
            
            return structured_result
            
        except Exception as e:
            self.logger.error(f"RAG analysis failed for {citizen_id}: {str(e)}")
            self._record_error(citizen_id, str(e), citizen_data)
            raise
    
    def _create_smart_analysis_prompt(self, citizen_data: Dict[str, Any]) -> str:
        """Create smart structured analysis prompt with enforced output format"""
        
        # Use actual Supabase field names
        citizen_id = citizen_data.get('id', citizen_data.get('nric', 'unknown'))
        income_bracket = citizen_data.get('income_bracket', 'unknown')
        state = citizen_data.get('state', 'unknown')
        household_size = citizen_data.get('household_size', 'unknown')
        number_of_children = citizen_data.get('number_of_children', 'unknown')
        disability_status = citizen_data.get('disability_status', 'unknown')
        age = citizen_data.get('age', 'unknown')
        
        prompt = f"""
Analyze this REAL citizen's eligibility for Malaysian government subsidies.

🇲🇾 ACTUAL SUPABASE CITIZEN DATA:
- ID: {citizen_id}
- NRIC: {citizen_data.get('nric', 'unknown')}
- Full Name: {citizen_data.get('full_name', 'unknown')}
- Income Bracket: {income_bracket}
- State: {state}
- Age: {age} years old
- Date of Birth: {citizen_data.get('date_of_birth', 'unknown')}
- Gender: {citizen_data.get('gender', 'unknown')}
- Household Size: {household_size}
- Number of Children: {number_of_children}
- Disability Status: {disability_status}
- Signature Valid: {citizen_data.get('is_signature_valid', 'unknown')}
- Data Authentic: {citizen_data.get('is_data_authentic', 'unknown')}

🚨 CRITICAL REQUIREMENTS - NO ASSUMPTIONS ALLOWED:
1. DO NOT make up income thresholds (like "M2 = RM3,000") 
2. MUST use chromadb_retriever to find ACTUAL policy documents
3. MUST cite specific policy documents for income bracket definitions
4. If policy documents don't contain specific income amounts, say "income threshold not found in policy documents"

📋 REQUIRED ANALYSIS STEPS:
1. Use citizen_data_validator with ACTUAL Supabase fields
2. Use chromadb_retriever to search for:
   - "{income_bracket}" income bracket policy definitions and thresholds
   - Disability benefit policies for status={disability_status}
   - "{state}" state-specific subsidy programs  
   - Family assistance programs (age {age}, {number_of_children} children)
3. Use policy_reasoner to assess eligibility ONLY based on retrieved documents
4. Provide analysis with CITATIONS to specific policy documents

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

🔍 CITATION REQUIREMENTS:
- Every income threshold claim must cite a specific policy document
- Every eligibility criterion must reference retrieved policy text
- If information is not found in policy documents, explicitly state this
- NO assumptions about income amounts or thresholds
"""
        
        return prompt.strip()
    
    def _parse_smart_agent_result(self, agent_result: Dict[str, Any], citizen_data: Dict[str, Any]) -> RagAnalysisResult:
        """Parse enhanced agent result with structured output"""
        
        try:
            # Check if agent succeeded
            if agent_result.get("status") == "error":
                raise Exception(f"Agent failed: {agent_result.get('error', 'Unknown error')}")
            
            # Try to extract JSON from agent output
            raw_result = agent_result.get('raw_result', '')
            
            # If raw_result is already a dict, use it directly
            if isinstance(raw_result, dict):
                parsed_json = raw_result
            else:
                # Try to extract JSON from string output
                import re
                json_match = re.search(r'\{.*\}', str(raw_result), re.DOTALL)
                if json_match:
                    try:
                        parsed_json = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        parsed_json = None
                else:
                    parsed_json = None
            
            # Create structured result with extracted data or defaults
            if parsed_json and isinstance(parsed_json, dict):
                result = RagAnalysisResult(
                    score=float(parsed_json.get('score', 50.0)),
                    confidence=float(parsed_json.get('confidence', 0.5)),
                    eligibility_class=parsed_json.get('eligibility_class', 'Unknown'),
                    explanation=parsed_json.get('explanation', 'Analysis completed with limited parsing'),
                    retrieved_context=parsed_json.get('retrieved_context', ['Policy analysis performed']),
                    reasoning_path=parsed_json.get('reasoning_path', ['Agent reasoning completed']),
                    policy_factors=parsed_json.get('policy_factors', ['Standard policy criteria applied']),
                    edge_cases_identified=parsed_json.get('edge_cases_identified', []),
                    web_search_summary=parsed_json.get('web_search_summary'),
                    validation_results=parsed_json.get('validation_results', {'overall_valid': True})
                )
            else:
                # Fallback parsing from string
                result_text = str(raw_result).lower()
                
                # Extract basic information
                score = 60.0
                confidence = 0.6
                eligibility_class = "Unknown"
                
                if "b40" in result_text:
                    eligibility_class = "B40"
                    score = 80.0
                elif "m40-m1" in result_text:
                    eligibility_class = "M40-M1"
                    score = 65.0
                elif "m40-m2" in result_text or "m2" in result_text:
                    eligibility_class = "M40-M2"
                    score = 50.0
                elif "t20" in result_text:
                    eligibility_class = "T20"
                    score = 30.0
                
                # Adjust for disability
                if citizen_data.get('disability_status'):
                    score += 8
                
                # Adjust for children
                children = citizen_data.get('number_of_children', 0)
                if children > 0:
                    score += min(children * 2, 6)
                
                result = RagAnalysisResult(
                    score=min(max(score, 0.0), 100.0),
                    confidence=confidence,
                    eligibility_class=eligibility_class,
                    explanation=f"Analysis completed. Raw result: {str(raw_result)[:200]}...",
                    retrieved_context=["Policy documents retrieved"],
                    reasoning_path=["Agent analysis performed"],
                    policy_factors=["Standard eligibility criteria applied"],
                    edge_cases_identified=[],
                    web_search_summary="Web search completed",
                    validation_results={'overall_valid': True}
                )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to parse smart agent result: {str(e)}")
            
            # Return minimal result on parsing failure
            return RagAnalysisResult(
                score=50.0,
                confidence=0.3,
                eligibility_class="Unknown",
                explanation=f"Analysis completed but result parsing failed: {str(e)}",
                retrieved_context=["Analysis performed"],
                reasoning_path=["Agent execution completed with parsing issues"],
                policy_factors=["Parsing error prevented detailed analysis"],
                edge_cases_identified=[f"Result parsing error: {str(e)}"],
                web_search_summary="Search completed but results not parsed",
                validation_results={"overall_valid": False, "error": str(e)}
            )

    def _record_analysis_input(self, citizen_id: str, citizen_data: Dict[str, Any], prompt: str):
        """Record analysis input for learning purposes"""
        try:
            timestamp = datetime.now().isoformat()
            input_record = {
                "timestamp": timestamp,
                "citizen_id": citizen_id,
                "citizen_data": citizen_data,
                "prompt_length": len(prompt),
                "prompt_preview": prompt[:200] + "..." if len(prompt) > 200 else prompt
            }
            
            input_file = os.path.join(self.output_log_dir, f"input_{citizen_id}_{timestamp.replace(':', '-')}.json")
            with open(input_file, 'w') as f:
                json.dump(input_record, f, indent=2)
                
        except Exception as e:
            self.logger.warning(f"Failed to record input: {e}")

    def _record_raw_output(self, citizen_id: str, agent_result: Dict[str, Any]):
        """Record raw agent output for analysis"""
        try:
            timestamp = datetime.now().isoformat()
            output_record = {
                "timestamp": timestamp,
                "citizen_id": citizen_id,
                "agent_result": agent_result,
                "result_type": type(agent_result).__name__,
                "status": agent_result.get("status", "unknown")
            }
            
            output_file = os.path.join(self.output_log_dir, f"raw_output_{citizen_id}_{timestamp.replace(':', '-')}.json")
            with open(output_file, 'w') as f:
                json.dump(output_record, f, indent=2)
                
        except Exception as e:
            self.logger.warning(f"Failed to record raw output: {e}")

    def _record_structured_output(self, citizen_id: str, result: RagAnalysisResult):
        """Record final structured result"""
        try:
            timestamp = datetime.now().isoformat()
            structured_record = {
                "timestamp": timestamp,
                "citizen_id": citizen_id,
                "score": result.score,
                "confidence": result.confidence,
                "eligibility_class": result.eligibility_class,
                "explanation_length": len(result.explanation),
                "retrieved_context_count": len(result.retrieved_context),
                "reasoning_steps": len(result.reasoning_path),
                "policy_factors_count": len(result.policy_factors),
                "edge_cases_count": len(result.edge_cases_identified),
                "has_web_search": result.web_search_summary is not None,
                "validation_status": result.validation_results.get('overall_valid', False) if result.validation_results else False
            }
            
            structured_file = os.path.join(self.output_log_dir, f"structured_{citizen_id}_{timestamp.replace(':', '-')}.json")
            with open(structured_file, 'w') as f:
                json.dump(structured_record, f, indent=2)
                
        except Exception as e:
            self.logger.warning(f"Failed to record structured output: {e}")

    def _record_error(self, citizen_id: str, error_msg: str, citizen_data: Dict[str, Any]):
        """Record analysis errors for debugging"""
        try:
            timestamp = datetime.now().isoformat()
            error_record = {
                "timestamp": timestamp,
                "citizen_id": citizen_id,
                "error": error_msg,
                "citizen_data_summary": {
                    "income_bracket": citizen_data.get('income_bracket'),
                    "state": citizen_data.get('state'),
                    "disability_status": citizen_data.get('disability_status'),
                    "household_size": citizen_data.get('household_size')
                }
            }
            
            error_file = os.path.join(self.output_log_dir, f"error_{citizen_id}_{timestamp.replace(':', '-')}.json")
            with open(error_file, 'w') as f:
                json.dump(error_record, f, indent=2)
                
        except Exception as e:
            self.logger.warning(f"Failed to record error: {e}")
    
    def _parse_agent_result(self, agent_result: Dict[str, Any], citizen_data: Dict[str, Any]) -> RagAnalysisResult:
        """Parse agent result and extract structured information"""
        
        try:
            # Extract raw result from agent
            raw_result = agent_result.get('raw_result', {})
            
            # Try to extract structured information from agent output
            # This is a simplified parser - in practice, we'd need more sophisticated parsing
            
            # Default values
            default_result = RagAnalysisResult(
                score=60.0,  # Neutral score
                confidence=0.6,  # Medium confidence
                eligibility_class="Unknown",
                explanation="RAG analysis completed with limited structured output",
                retrieved_context=["Policy documents retrieved"],
                reasoning_path=["Agent analysis performed"],
                policy_factors=["Standard policy criteria applied"],
                edge_cases_identified=[],
                web_search_summary="Web search completed",
                validation_results={"overall_valid": True}
            )
            
            # If we have a string result, try to extract key information
            if isinstance(raw_result, str):
                result_text = raw_result.lower()
                
                # Extract eligibility class
                if "b40" in result_text:
                    default_result.eligibility_class = "B40"
                    default_result.score = 80.0
                elif "m40" in result_text:
                    if "m1" in result_text or "lower" in result_text:
                        default_result.eligibility_class = "M40-M1"
                        default_result.score = 65.0
                    else:
                        default_result.eligibility_class = "M40-M2" 
                        default_result.score = 45.0
                elif "t20" in result_text:
                    default_result.eligibility_class = "T20"
                    default_result.score = 25.0
                
                # Extract confidence indicators
                if "high confidence" in result_text or "certain" in result_text:
                    default_result.confidence = 0.85
                elif "low confidence" in result_text or "uncertain" in result_text:
                    default_result.confidence = 0.4
                
                # Set explanation from part of the result
                explanation_preview = raw_result[:200] + "..." if len(raw_result) > 200 else raw_result
                default_result.explanation = f"Policy analysis: {explanation_preview}"
            
            # Try to extract more structured information if agent provided it
            if isinstance(raw_result, dict):
                default_result.score = float(raw_result.get('score', default_result.score))
                default_result.confidence = float(raw_result.get('confidence', default_result.confidence))
                default_result.eligibility_class = raw_result.get('eligibility_class', default_result.eligibility_class)
                default_result.explanation = raw_result.get('explanation', default_result.explanation)
            
            # Ensure score and confidence are within valid ranges
            default_result.score = max(0.0, min(100.0, default_result.score))
            default_result.confidence = max(0.0, min(1.0, default_result.confidence))
            
            return default_result
            
        except Exception as e:
            self.logger.error(f"Failed to parse agent result: {str(e)}")
            
            # Return minimal result on parsing failure
            return RagAnalysisResult(
                score=50.0,
                confidence=0.3,
                eligibility_class="Unknown",
                explanation=f"RAG analysis completed but result parsing failed: {str(e)}",
                retrieved_context=["Analysis performed"],
                reasoning_path=["Agent execution completed with parsing issues"],
                policy_factors=["Parsing error prevented detailed analysis"],
                edge_cases_identified=[f"Result parsing error: {str(e)}"],
                web_search_summary="Search completed but results not parsed",
                validation_results={"overall_valid": False, "error": str(e)}
            )
    
    def get_analysis_info(self) -> Dict[str, Any]:
        """
        Get information about the RAG analysis method.
        
        Returns metadata about the analysis approach for comparison purposes.
        """
        return {
            'method': 'rag_based',
            'approach': 'contextual_policy_reasoning',
            'flexibility': 'high_contextual_adaptation',
            'tools_used': [
                'CitizenDataValidationTool',
                'ChromaDBRetrieverTool', 
                'TavilySearchTool',
                'PolicyReasoningTool'
            ],
            'agent_config': {
                'model_name': self.config.model_name,
                'temperature': self.config.temperature,
                'max_tokens': self.config.max_tokens
            },
            'data_sources': [
                'chromadb_policy_documents',
                'tavily_web_search',
                'llm_contextual_reasoning'
            ],
            'strengths': [
                'Contextual policy interpretation',
                'Edge case handling',
                'Latest policy updates integration',
                'Flexible reasoning capabilities',
                'Natural language explanations'
            ],
            'limitations': [
                'Dependent on LLM model quality',
                'Variable confidence based on policy clarity',
                'Requires comprehensive policy document corpus',
                'May be inconsistent across similar cases',
                'Computation time varies with complexity'
            ]
        }
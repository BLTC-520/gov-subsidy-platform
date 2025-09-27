"""
PolicyReasoningTool - LLM-based policy reasoning for citizen eligibility analysis.

This tool uses LLM reasoning to analyze citizen eligibility based on policy context,
retrieved documents, and web search results. Provides flexible, contextual analysis
that complements mathematical scoring approaches.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass

from smolagents import Tool, LiteLLMModel

logger = logging.getLogger(__name__)


@dataclass
class PolicyReasoningResult:
    """Structured result from policy reasoning analysis"""
    score: float
    confidence: float
    eligibility_class: str
    explanation: str
    reasoning_path: List[str]
    policy_factors: List[str]
    edge_cases_identified: List[str]
    recommendations: List[str]


class PolicyReasoningTool(Tool):
    """
    LLM-based policy reasoning tool for flexible eligibility analysis.
    
    Uses contextual reasoning to analyze citizen eligibility by combining:
    - Citizen demographic and financial data
    - Retrieved policy documents from ChromaDB
    - Latest policy updates from web search
    - Edge case handling and policy interpretation
    """
    
    name = "policy_reasoner"
    description = "Analyze citizen eligibility using LLM reasoning with policy context and edge case handling"
    output_type = "object"
    
    inputs = {
        "citizen_data": {
            "type": "object",
            "description": "Citizen demographic and financial information"
        },
        "policy_context": {
            "type": "string",
            "description": "Retrieved policy documents and context from ChromaDB/Tavily",
            "nullable": True
        },
        "analysis_focus": {
            "type": "string",
            "description": "Analysis focus: 'comprehensive' (default), 'edge_cases', or 'policy_changes'",
            "nullable": True
        }
    }
    
    def __init__(self, model_name: str = "gpt-4.1-2025-04-14"):
        """Initialize policy reasoning tool with LLM"""
        super().__init__()
        
        # Initialize LiteLLM model
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.model = LiteLLMModel(
            model_id=model_name,
            temperature=0.3,  # Balanced creativity vs consistency
            max_tokens=3000,
            api_key=api_key
        )
        
        # Policy reasoning configuration
        self.confidence_thresholds = {
            'high': 0.85,
            'medium': 0.65,
            'low': 0.45
        }
        
        # Malaysian subsidy program context
        self.subsidy_programs = {
            "B40": {
                "description": "Bottom 40% income group - highest priority for government assistance",
                "typical_benefits": ["housing assistance", "healthcare subsidies", "education support"],
                "income_focus": "household income below national B40 threshold"
            },
            "M40-M1": {
                "description": "Middle 40% lower tier - targeted assistance programs",
                "typical_benefits": ["healthcare subsidies", "education loans", "home ownership schemes"],
                "income_focus": "household income in lower M40 range"
            },
            "M40-M2": {
                "description": "Middle 40% upper tier - limited targeted assistance",
                "typical_benefits": ["education loans", "home ownership schemes"],
                "income_focus": "household income in upper M40 range"
            }
        }
        
        logger.info(f"PolicyReasoningTool initialized with model: {model_name}")
    
    def forward(
        self, 
        citizen_data: Dict[str, Any], 
        policy_context: Optional[str] = None,
        analysis_focus: str = "comprehensive"
    ) -> Dict[str, Any]:
        """
        Perform LLM-based policy reasoning for eligibility analysis.
        
        Args:
            citizen_data: Citizen information dictionary
            policy_context: Retrieved policy documents and web search results
            analysis_focus: Type of analysis to perform
            
        Returns:
            Structured reasoning result with score, confidence, and explanations
        """
        try:
            logger.info(f"Starting policy reasoning analysis - Focus: {analysis_focus}")
            
            # Create reasoning prompt
            reasoning_prompt = self._create_reasoning_prompt(
                citizen_data, policy_context, analysis_focus
            )
            
            # Perform LLM reasoning using proper LiteLLMModel format
            messages = [{"role": "user", "content": [{"type": "text", "text": reasoning_prompt}]}]
            response = self.model(messages)
            
            # Parse LLM response
            reasoning_result = self._parse_reasoning_response(response, citizen_data)
            
            # Create structured output
            return self._format_reasoning_output(reasoning_result, citizen_data, analysis_focus)
            
        except Exception as e:
            logger.error(f"Policy reasoning failed: {str(e)}")
            return self._create_error_response(str(e), citizen_data)
    
    def _create_reasoning_prompt(
        self, 
        citizen_data: Dict[str, Any], 
        policy_context: Optional[str],
        analysis_focus: str
    ) -> str:
        """Create comprehensive reasoning prompt for LLM analysis"""
        
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        prompt = f"""You are an expert policy analyst specializing in Malaysian government subsidy programs. Today's date is {current_date}.

Your task is to analyze citizen eligibility for government subsidies using contextual reasoning and policy interpretation.

CITIZEN DATA:
{json.dumps(citizen_data, indent=2)}

POLICY CONTEXT (from knowledge base and web search):
{policy_context or "No additional policy context provided - use your knowledge of Malaysian subsidy programs."}

SUBSIDY PROGRAM KNOWLEDGE:
{json.dumps(self.subsidy_programs, indent=2)}

ANALYSIS FOCUS: {analysis_focus}

Please perform a comprehensive analysis considering:

1. INCOME BRACKET ANALYSIS:
   - Evaluate the citizen's income bracket classification
   - Consider household composition and regional factors
   - Assess alignment with B40/M40/T20 eligibility criteria

2. DEMOGRAPHIC FACTORS:
   - Age, residency duration, family composition
   - Special circumstances (disability, employment status)
   - Geographic location and state-specific programs

3. POLICY INTERPRETATION:
   - Recent policy changes or updates
   - Edge cases not covered by standard mathematical scoring
   - Contextual factors that mathematical models might miss

4. CONFIDENCE ASSESSMENT:
   - How certain are you about this eligibility determination?
   - What factors contribute to uncertainty?
   - Are there missing data points that affect confidence?

Please respond in the following JSON format:
{{
  "score": <numerical score 0-100 based on eligibility likelihood>,
  "confidence": <confidence level 0.0-1.0>,
  "eligibility_class": "<predicted class: B40, M40-M1, M40-M2, T20, or Unknown>",
  "explanation": "<2-3 sentence summary of eligibility determination>",
  "reasoning_path": [
    "<step 1 of reasoning process>",
    "<step 2 of reasoning process>",
    "<step 3 of reasoning process>"
  ],
  "policy_factors": [
    "<policy factor 1 that influenced decision>",
    "<policy factor 2 that influenced decision>"
  ],
  "edge_cases_identified": [
    "<any edge cases or unusual circumstances noted>"
  ],
  "recommendations": [
    "<recommendation 1 for citizen or policy maker>",
    "<recommendation 2 for citizen or policy maker>"
  ],
  "uncertainty_factors": [
    "<factors that create uncertainty in this analysis>"
  ]
}}

Focus on providing nuanced analysis that captures policy context and edge cases that pure mathematical scoring cannot handle."""
        
        return prompt
    
    def _parse_reasoning_response(self, response: Any, citizen_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse and validate LLM reasoning response"""
        try:
            # Handle different response formats from LiteLLM
            if hasattr(response, 'content'):
                response_text = response.content
            elif isinstance(response, dict) and 'content' in response:
                response_text = response['content']
            elif isinstance(response, str):
                response_text = response
            else:
                response_text = str(response)
            
            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            
            if json_match:
                json_str = json_match.group()
                parsed_result = json.loads(json_str)
                
                # Validate required fields and apply defaults
                validated_result = {
                    "score": float(parsed_result.get("score", 50.0)),
                    "confidence": float(parsed_result.get("confidence", 0.5)),
                    "eligibility_class": parsed_result.get("eligibility_class", "Unknown"),
                    "explanation": parsed_result.get("explanation", "Policy analysis completed"),
                    "reasoning_path": parsed_result.get("reasoning_path", ["Analysis performed"]),
                    "policy_factors": parsed_result.get("policy_factors", ["Standard policy criteria applied"]),
                    "edge_cases_identified": parsed_result.get("edge_cases_identified", []),
                    "recommendations": parsed_result.get("recommendations", []),
                    "uncertainty_factors": parsed_result.get("uncertainty_factors", [])
                }
                
                # Validate score and confidence ranges
                validated_result["score"] = max(0.0, min(100.0, validated_result["score"]))
                validated_result["confidence"] = max(0.0, min(1.0, validated_result["confidence"]))
                
                return validated_result
            
            else:
                # Fallback if JSON extraction fails
                return {
                    "score": 50.0,
                    "confidence": 0.4,
                    "eligibility_class": "Unknown",
                    "explanation": "Policy analysis completed but response parsing failed",
                    "reasoning_path": ["LLM analysis performed"],
                    "policy_factors": ["Response parsing issues"],
                    "edge_cases_identified": ["JSON parsing failure"],
                    "recommendations": ["Review response format"],
                    "uncertainty_factors": ["Technical parsing issues"],
                    "raw_response": response_text
                }
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {str(e)}")
            return {
                "score": 50.0,
                "confidence": 0.3,
                "eligibility_class": "Unknown",
                "explanation": "Policy analysis completed but JSON parsing failed",
                "reasoning_path": ["Analysis performed with parsing issues"],
                "policy_factors": ["JSON format errors"],
                "edge_cases_identified": [f"Parsing error: {str(e)}"],
                "recommendations": ["Review LLM response format"],
                "uncertainty_factors": ["Response format issues"]
            }
    
    def _format_reasoning_output(
        self, 
        reasoning_result: Dict[str, Any], 
        citizen_data: Dict[str, Any],
        analysis_focus: str
    ) -> Dict[str, Any]:
        """Format reasoning result for service consumption"""
        
        return {
            "score": reasoning_result["score"],
            "confidence": reasoning_result["confidence"],
            "eligibility_class": reasoning_result["eligibility_class"],
            "explanation": reasoning_result["explanation"],
            "reasoning_details": {
                "reasoning_path": reasoning_result["reasoning_path"],
                "policy_factors": reasoning_result["policy_factors"],
                "edge_cases_identified": reasoning_result["edge_cases_identified"],
                "uncertainty_factors": reasoning_result.get("uncertainty_factors", [])
            },
            "recommendations": reasoning_result["recommendations"],
            "analysis_metadata": {
                "analysis_focus": analysis_focus,
                "citizen_id": citizen_data.get("citizen_id", "unknown"),
                "timestamp": datetime.now().isoformat(),
                "model_used": self.model.model_id,
                "confidence_level": self._classify_confidence(reasoning_result["confidence"])
            },
            "method": "llm_policy_reasoning"
        }
    
    def _classify_confidence(self, confidence: float) -> str:
        """Classify confidence level"""
        if confidence >= self.confidence_thresholds['high']:
            return "high"
        elif confidence >= self.confidence_thresholds['medium']:
            return "medium" 
        else:
            return "low"
    
    def _create_error_response(self, error_message: str, citizen_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create error response for failed reasoning"""
        return {
            "score": 0.0,
            "confidence": 0.0,
            "eligibility_class": "Unknown",
            "explanation": f"Policy reasoning failed: {error_message}",
            "reasoning_details": {
                "reasoning_path": ["Error occurred during analysis"],
                "policy_factors": [],
                "edge_cases_identified": [f"Analysis error: {error_message}"],
                "uncertainty_factors": ["Technical failure"]
            },
            "recommendations": ["Retry analysis or use alternative method"],
            "analysis_metadata": {
                "analysis_focus": "error",
                "citizen_id": citizen_data.get("citizen_id", "unknown"),
                "timestamp": datetime.now().isoformat(),
                "error": error_message
            },
            "method": "llm_policy_reasoning"
        }
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage
from typing import Dict, Any, Tuple
import logging
import json
from config.settings import settings
from models.schemas import ScoringResult, CitizenProfile
from datetime import datetime
from data.malaysian_policy_data import (
    get_policy_context_string, 
    OFFICIAL_SCORING_WEIGHTS, 
    INCOME_CLASSIFICATIONS,
    OFFICIAL_POVERTY_LINE_INCOME_2022
)

logger = logging.getLogger(__name__)

class ScoringAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.google_api_key,
            temperature=0.1  # Low temperature for consistent scoring
        )
        self.scoring_criteria = self._load_scoring_criteria()
    
    def _load_scoring_criteria(self) -> Dict[str, Any]:
        """Load Malaysian subsidy scoring criteria."""
        return {
            "income_thresholds": {
                "B40": 4850,  # Bottom 40% household income (MYR)
                "M40": 10970,  # Middle 40% household income (MYR)
                "base_threshold": settings.base_income_threshold
            },
            "household_multipliers": {
                "per_member": settings.family_size_multiplier,
                "per_child": 200,  # Additional threshold per child
                "single_parent": 500  # Additional threshold for single parent
            },
            "disability_bonus": settings.disability_bonus,
            "state_adjustments": {
                "Sabah": 0.15,
                "Sarawak": 0.15,
                "Kelantan": 0.10,
                "Terengganu": 0.10,
                "Kedah": 0.10,
                "Perlis": 0.10,
                "Pahang": 0.05,
                "Perak": 0.05,
                "default": 0.0
            },
            "scoring_weights": {
                "income_score": 0.50,
                "household_score": 0.20,
                "disability_score": 0.15,
                "state_score": 0.10,
                "context_score": 0.05
            }
        }
    
    def calculate_ai_base_score(self, citizen_profile: Dict[str, Any], pdf_context: str = "", web_context: str = "") -> Tuple[float, str]:
        """
        Calculate base eligibility score using AI analysis (0-100).
        LLM analyzes all factors and decides the complete score.
        
        Args:
            citizen_profile: Dictionary containing citizen profile data
            pdf_context: Context from government documents
            web_context: Context from web search
            
        Returns:
            Tuple of (score, reasoning)
        """
        try:
            system_prompt = """You are an AI expert in Malaysian government subsidy eligibility assessment.

Your task is to analyze a citizen's profile and assign an ELIGIBILITY SCORE ONLY (0-100) with EVIDENCE-BASED REASONING.

IMPORTANT: You ONLY provide eligibility scoring. Do NOT calculate subsidy amounts - admin will determine those separately.

CRITICAL REQUIREMENTS:
1. CITE specific documents and data when making decisions
2. REFERENCE exact thresholds from government documents
3. QUOTE relevant sections that support your scoring
4. PROVIDE specific evidence for each factor's weight
5. EXPLAIN why each factor received its particular score weight

MALAYSIAN SUBSIDY CONTEXT:
- B40 households: Monthly income ≤ RM4,850 (bottom 40%)
- M40 households: Monthly income RM4,851-RM10,970 (middle 40%)
- OKU (Orang Kurang Upaya): Disabled persons eligible for additional benefits
- State variations: East Malaysia (Sabah/Sarawak) often have higher thresholds
- Family size: Larger families typically get higher thresholds
- Children: Additional considerations for families with children

DYNAMIC SCORING METHODOLOGY:
You must INTELLIGENTLY DETERMINE the optimal weights for each factor based on:
1. Available evidence quality and relevance in the provided documents
2. This specific citizen's circumstances and which factors are most relevant
3. Government policy priorities evident in the documents and web search results
4. Strength of correlation between factors and eligibility in Malaysian programs

ADAPTIVE WEIGHTING GUIDELINES:
- Income Factor: Weight higher (40-60%) if clear income thresholds dominate policy documents
- Household Size: Weight higher (20-30%) if family composition is emphasized in policies
- Disability Status: Weight higher (15-25%) if OKU benefits are prominently featured in evidence
- State Adjustments: Weight higher (10-20%) if significant regional variations are documented
- Children/Dependents: Weight higher (10-20%) if child-focused policies are well-evidenced

INTELLIGENT DECISION PROCESS:
1. Analyze all available evidence (PDF documents + web search results)
2. Identify which factors have the strongest policy support and documentation
3. Consider this citizen's specific profile - which factors are most relevant?
4. Determine optimal weights that reflect both policy priorities AND citizen relevance
5. Calculate individual factor scores based on citizen's profile
6. Apply your determined weights to get final composite score
7. Validate final score makes sense given overall circumstances

EVIDENCE REQUIREMENTS:
- Quote specific sections from documents that justify your weighting decisions
- Cite filenames and relevant content that influenced factor importance
- Reference web search results that validate current policy priorities
- Explain mathematical calculations showing how your chosen weights were applied

Output Format:
{
    "eligibility_score": [number 0-100],
    "detailed_analysis": "Step-by-step analysis with document citations explaining your weighting rationale",
    "dynamic_weights": {
        "income_factor": {"weight": [your AI-determined %], "score": [0-100], "reasoning": "Why you chose this weight based on evidence..."},
        "household_factor": {"weight": [your AI-determined %], "score": [0-100], "reasoning": "Evidence supporting this weighting decision..."},
        "disability_factor": {"weight": [your AI-determined %], "score": [0-100], "reasoning": "Policy evidence for disability priority level..."},
        "state_factor": {"weight": [your AI-determined %], "score": [0-100], "reasoning": "Regional variation evidence strength..."},
        "children_factor": {"weight": [your AI-determined %], "score": [0-100], "reasoning": "Child-focused policy evidence..."}
    },
    "weighting_rationale": "Detailed explanation of how you determined optimal weights from available evidence and citizen relevance",
    "evidence_citations": ["Document sources that most influenced your weighting decisions"],
    "confidence": [number 0.0-1.0]
}
"""
            
            # Get state-specific poverty line income for context
            citizen_state = citizen_profile.get('state', 'Unknown')
            state_pli = OFFICIAL_POVERTY_LINE_INCOME_2022.get(citizen_state, OFFICIAL_POVERTY_LINE_INCOME_2022.get('Malaysia', 2208))
            monthly_income = citizen_profile.get('monthly_income', 0)
            
            human_prompt = f"""
CITIZEN PROFILE TO ANALYZE:
- Monthly Income: RM{monthly_income}
- Household Size: {citizen_profile.get('household_size', 1)} people
- Number of Children: {citizen_profile.get('number_of_children', 0)}
- Disability Status: {citizen_profile.get('disability_status', False)}
- State: {citizen_state}
- State-Specific Poverty Line Income: RM{state_pli} (from DOSM 2022 data)

OFFICIAL MALAYSIAN GOVERNMENT POLICY (You MUST use these official criteria):
{get_policy_context_string()}

GOVERNMENT DOCUMENT CONTEXT (Additional supporting documents):
{pdf_context if pdf_context else "No additional government documents available for analysis."}

CURRENT POLICY CONTEXT FROM WEB SEARCH (Supporting current information):
{web_context if web_context else "No additional current policy information available."}

TASK: Analyze this citizen's ELIGIBILITY SCORE ONLY (0-100):

IMPORTANT: You are ONLY determining eligibility score. Do NOT calculate subsidy amounts.
Admin will determine final subsidy amounts based on your eligibility assessment.

REQUIREMENTS:
1. CITE specific documents/sections that define income thresholds
2. REFERENCE exact data that supports household size adjustments  
3. QUOTE relevant policies for disability benefits
4. CALCULATE weighted composite score with clear math
5. PROVIDE evidence citations for each decision
6. SCORE ONLY - No subsidy amount calculations

Your scoring must be transparent and traceable to the source documents and web search results provided above.

Provide your assessment as a JSON object with the required evidence-based format.
"""
            
            # Log what we're sending to the AI for debugging
            logger.info(f"=== SENDING TO AI SCORER ===")
            logger.info(f"PDF Context Length: {len(pdf_context)} chars")
            logger.info(f"Web Context Length: {len(web_context)} chars")
            policy_context = get_policy_context_string()
            logger.info(f"Policy Context Length: {len(policy_context)} chars")
            total_prompt = len(system_prompt) + len(human_prompt)
            logger.info(f"Total Prompt Length: {total_prompt} chars")
            logger.info(f"PDF Context Preview: {pdf_context[:300]}...")
            logger.info(f"Web Context Preview: {web_context[:300]}...")
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]
            
            response = self.llm.invoke(messages)
            
            logger.info(f"Raw AI Response: {response.content[:500]}...")
            
            # Try to parse JSON response
            try:
                # Extract JSON from response
                response_text = response.content.strip()
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                    if response_text.endswith('```'):
                        response_text = response_text[:-3]
                elif response_text.startswith('```'):
                    response_text = response_text[3:]
                    if response_text.endswith('```'):
                        response_text = response_text[:-3]
                
                # Find the JSON object boundaries
                json_start = response_text.find('{')
                if json_start != -1:
                    # Find the matching closing brace
                    brace_count = 0
                    json_end = json_start
                    for i, char in enumerate(response_text[json_start:], json_start):
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_end = i + 1
                                break
                    
                    # Extract only the JSON part
                    response_text = response_text[json_start:json_end]
                
                # Clean up common JSON formatting issues
                response_text = response_text.replace(": +", ": ").replace(":+", ":")
                
                ai_assessment = json.loads(response_text)
                
                eligibility_score = ai_assessment.get("eligibility_score", 0)
                detailed_analysis = ai_assessment.get("detailed_analysis", "No analysis provided")
                dynamic_weights = ai_assessment.get("dynamic_weights", {})
                weighting_rationale = ai_assessment.get("weighting_rationale", "No weighting rationale provided")
                evidence_citations = ai_assessment.get("evidence_citations", [])
                confidence = ai_assessment.get("confidence", 0.5)
                
                # Ensure score is within bounds
                eligibility_score = max(0, min(100, float(eligibility_score)))
                
                # Build comprehensive reasoning with evidence
                reasoning = f"=== EVIDENCE-BASED AI SCORING ===\n"
                reasoning += f"Final Eligibility Score: {eligibility_score}/100\n\n"
                
                reasoning += f"=== DETAILED ANALYSIS ===\n{detailed_analysis}\n\n"
                
                reasoning += f"=== DYNAMIC WEIGHTING RATIONALE ===\n{weighting_rationale}\n\n"
                
                reasoning += f"=== DYNAMIC FACTOR BREAKDOWN ===\n"
                total_calculated = 0
                for factor_name, factor_data in dynamic_weights.items():
                    if isinstance(factor_data, dict):
                        weight = factor_data.get("weight", 0)
                        score = factor_data.get("score", 0)
                        factor_reasoning = factor_data.get("reasoning", "No reasoning")
                        contribution = (weight * score) / 100
                        total_calculated += contribution
                        reasoning += f"{factor_name.replace('_', ' ').title()}:\n"
                        reasoning += f"  AI-Determined Weight: {weight}% | Score: {score}/100 | Contribution: {contribution:.1f}\n"
                        reasoning += f"  Weighting Justification: {factor_reasoning}\n\n"
                
                reasoning += f"Calculated Total: {total_calculated:.1f}/100\n\n"
                
                reasoning += f"=== EVIDENCE CITATIONS ===\n"
                for i, citation in enumerate(evidence_citations, 1):
                    reasoning += f"{i}. {citation}\n"
                
                reasoning += f"\nConfidence Level: {confidence:.2f}\n"
                reasoning += f"FINAL AI-VALIDATED SCORE: {eligibility_score}/100"
                
                return eligibility_score, reasoning
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")
                logger.error(f"Raw response was: {response.content}")
                raise Exception(f"AI response parsing failed: {e}")
            
        except Exception as e:
            logger.error(f"Error in AI base scoring: {str(e)}")
            raise Exception(f"AI scoring failed: {str(e)}")
    
    
    def ai_review_scoring(self, initial_score: float, initial_reasoning: str, 
                         citizen_profile: Dict[str, Any]) -> Tuple[float, str]:
        """
        AI reviews and validates the initial scoring decision.
        Acts as a second opinion to ensure consistency and catch potential errors.
        
        Args:
            initial_score: Initial AI-generated score
            initial_reasoning: Initial reasoning explanation  
            citizen_profile: Citizen profile data
            
        Returns:
            Tuple of (reviewed_score, reviewed_reasoning)
        """
        try:
            system_prompt = """You are a senior AI reviewer for Malaysian government subsidy eligibility assessment.

Your task is to review and validate an initial scoring decision made by another AI agent.

REVIEW GUIDELINES:
1. Check if the initial score is reasonable and justified
2. Look for any obvious errors or inconsistencies
3. Consider if the score aligns with Malaysian subsidy criteria
4. Validate the reasoning provided
5. Make adjustments ONLY if there are clear errors or major oversights

ADJUSTMENT RULES:
- Small adjustments (-5 to +5 points): Minor scoring errors or oversights
- Large adjustments (-15 to +15 points): Major errors or missing critical factors
- No adjustment (0 points): Score is appropriate and well-reasoned

MALAYSIAN CONTEXT REMINDER:
- B40: ≤RM4,850 monthly income (should score 60-100)
- M40: RM4,851-RM10,970 (should score 20-60)
- T20: >RM10,970 (should score 0-30)
- OKU (disabled): Additional benefits regardless of income
- Large families: Higher thresholds apply
- East Malaysia: Often more generous criteria

Output Format:
{
    "reviewed_score": [number 0-100],
    "score_adjustment": [number -15 to +15],
    "review_reasoning": "Explanation of review decision",
    "validation_status": "approved/adjusted/rejected",
    "confidence": [number 0.0-1.0]
}
"""
            
            human_prompt = f"""
INITIAL SCORING TO REVIEW:
Score: {initial_score}/100

Initial Reasoning:
{initial_reasoning}

CITIZEN PROFILE FOR CONTEXT:
- Monthly Income: RM{citizen_profile.get('monthly_income', 0)}
- Household Size: {citizen_profile.get('household_size', 1)} people
- Number of Children: {citizen_profile.get('number_of_children', 0)}
- Disability Status: {citizen_profile.get('disability_status', False)}
- State: {citizen_profile.get('state', 'Unknown')}

Please review this scoring decision:
1. Is the score reasonable given the profile?
2. Does it align with Malaysian B40/M40/T20 classifications?
3. Are there any obvious errors or oversights?
4. Is the reasoning logical and complete?

Provide your review as a JSON object.
"""
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]
            
            response = self.llm.invoke(messages)
            
            # Try to parse JSON response
            try:
                # Extract JSON from response
                response_text = response.content.strip()
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                    if response_text.endswith('```'):
                        response_text = response_text[:-3]
                elif response_text.startswith('```'):
                    response_text = response_text[3:]
                    if response_text.endswith('```'):
                        response_text = response_text[:-3]
                
                # Find the JSON object boundaries for review response
                json_start = response_text.find('{')
                if json_start != -1:
                    brace_count = 0
                    json_end = json_start
                    for i, char in enumerate(response_text[json_start:], json_start):
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_end = i + 1
                                break
                    response_text = response_text[json_start:json_end]
                
                # Clean up common JSON formatting issues for review
                response_text = response_text.replace(": +", ": ").replace(":+", ":")
                
                review_assessment = json.loads(response_text)
                
                reviewed_score = review_assessment.get("reviewed_score", initial_score)
                score_adjustment = review_assessment.get("score_adjustment", 0)
                review_reasoning = review_assessment.get("review_reasoning", "No review reasoning provided")
                validation_status = review_assessment.get("validation_status", "approved")
                confidence = review_assessment.get("confidence", 0.5)
                
                # Ensure score is within bounds
                reviewed_score = max(0, min(100, float(reviewed_score)))
                
                # Build comprehensive reasoning
                final_reasoning = f"{initial_reasoning}\n\n"
                final_reasoning += f"=== AI REVIEW & VALIDATION ===\n"
                final_reasoning += f"Initial Score: {initial_score}/100\n"
                final_reasoning += f"Reviewed Score: {reviewed_score}/100\n"
                final_reasoning += f"Adjustment: {score_adjustment:+.1f} points\n"
                final_reasoning += f"Status: {validation_status.upper()}\n"
                final_reasoning += f"Review Reasoning: {review_reasoning}\n"
                final_reasoning += f"Review Confidence: {confidence:.2f}\n"
                final_reasoning += f"FINAL VALIDATED SCORE: {reviewed_score}/100"
                
                return reviewed_score, final_reasoning
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI review response as JSON: {e}")
                logger.error(f"Raw review response was: {response.content}")
                raise Exception(f"AI review response parsing failed: {e}")
            
        except Exception as e:
            logger.error(f"Error in AI review: {str(e)}")
            raise Exception(f"AI review failed: {str(e)}")
    
    def calculate_subsidy_amount(self, eligibility_score: float, citizen_profile: Dict[str, Any]) -> float:
        """
        Placeholder for subsidy amount calculation.
        
        Args:
            eligibility_score: Final eligibility score (0-100)
            citizen_profile: Citizen profile data
            
        Returns:
            Always returns 0.0 - Admin will determine actual subsidy amounts
        """
        # AI only provides eligibility score (0-100)
        # Admin will determine final subsidy amounts based on:
        # - AI eligibility score
        # - Available budget
        # - Program priorities
        # - Manual review if needed
        
        logger.info(f"AI Eligibility Score: {eligibility_score}/100 - Subsidy amount to be determined by admin")
        return 0.0  # Admin decides subsidy amounts
    
    def score_citizen(self, citizen_profile: Dict[str, Any], pdf_context: str = "", 
                     web_context: str = "") -> ScoringResult:
        """
        Pure AI-driven eligibility scoring process for a citizen.
        
        Process:
        1. AI analyzes profile and context to generate initial score (0-100)
        2. AI reviewer validates and potentially adjusts the score
        3. Return score only - admin determines subsidy amounts separately
        
        Args:
            citizen_profile: Dictionary containing citizen profile data
            pdf_context: Context from government documents
            web_context: Context from web search
            
        Returns:
            ScoringResult object with score and reasoning (subsidy_amount=0.0)
        """
        try:
            # Step 1: AI generates initial score based on all available information
            initial_score, initial_reasoning = self.calculate_ai_base_score(
                citizen_profile, pdf_context, web_context
            )
            
            # Step 2: AI reviewer validates and potentially adjusts the score
            final_score, final_reasoning = self.ai_review_scoring(
                initial_score, initial_reasoning, citizen_profile
            )
            
            # Note: subsidy_amount set to 0.0 - admin will determine actual amounts
            logger.info(f"Pure AI Scoring Complete: {final_score}/100 for citizen {citizen_profile.get('id', 'unknown')}")
            
            return ScoringResult(
                citizen_id=citizen_profile.get("id", "unknown"),
                eligibility_score=final_score,
                subsidy_amount=0.0,  # Admin determines subsidy amounts
                reasoning=final_reasoning,
                processed_at=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error scoring citizen: {str(e)}")
            return ScoringResult(
                citizen_id=citizen_profile.get("id", "unknown"),
                eligibility_score=0.0,
                subsidy_amount=0.0,
                reasoning=f"Scoring error: {str(e)}",
                processed_at=datetime.now()
            )
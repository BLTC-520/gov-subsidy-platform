from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from typing import TypedDict, Annotated
import logging
from models.schemas import AgentState, ScoringResult
from agents.pdf_retriever import PDFRetrieverAgent
from agents.web_search import WebSearchAgent
from agents.scoring_agent import ScoringAgent

logger = logging.getLogger(__name__)

class EligibilityState(TypedDict):
    """State for the eligibility scoring workflow."""
    citizen_id: str
    citizen_profile: dict
    documents: list
    pdf_context: str
    web_context: str
    scoring_result: ScoringResult
    error: str
    include_web_search: bool

class EligibilityWorkflow:
    def __init__(self):
        self.pdf_retriever = PDFRetrieverAgent()
        self.web_search = WebSearchAgent()
        self.scoring_agent = ScoringAgent()
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow for eligibility scoring."""
        workflow = StateGraph(EligibilityState)
        
        # Add nodes
        workflow.add_node("pdf_retrieval", self.pdf_retrieval_node)
        workflow.add_node("web_search", self.web_search_node)
        workflow.add_node("scoring", self.scoring_node)
        workflow.add_node("error_handler", self.error_handler_node)
        
        # Add edges
        workflow.set_entry_point("pdf_retrieval")
        
        # PDF retrieval -> web search or scoring
        workflow.add_conditional_edges(
            "pdf_retrieval",
            self.should_do_web_search,
            {
                "web_search": "web_search",
                "scoring": "scoring",
                "error_handler": "error_handler"
            }
        )
        
        # Web search -> scoring
        workflow.add_edge("web_search", "scoring")
        
        # Scoring -> end
        workflow.add_edge("scoring", END)
        
        # Error handling
        workflow.add_edge("error_handler", END)
        
        return workflow.compile()
    
    def should_do_web_search(self, state: EligibilityState) -> str:
        """Determine if web search should be performed."""
        if state.get("error"):
            return "error_handler"
        
        if state.get("include_web_search", True):
            return "web_search"
        else:
            return "scoring"
    
    def pdf_retrieval_node(self, state: EligibilityState) -> EligibilityState:
        """Node for PDF document retrieval and context extraction."""
        try:
            logger.info(f"Starting PDF retrieval for citizen {state['citizen_id']}")
            
            citizen_profile = state["citizen_profile"]
            pdf_context = self.pdf_retriever.get_eligibility_context(citizen_profile)
            
            logger.info(f"PDF retrieval completed for citizen {state['citizen_id']}")
            
            return {
                **state,
                "pdf_context": pdf_context
            }
            
        except Exception as e:
            logger.error(f"Error in PDF retrieval: {str(e)}")
            return {
                **state,
                "error": f"PDF retrieval error: {str(e)}",
                "pdf_context": ""
            }
    
    def web_search_node(self, state: EligibilityState) -> EligibilityState:
        """Node for web search and context gathering."""
        try:
            logger.info(f"Starting web search for citizen {state['citizen_id']}")
            
            citizen_profile = state["citizen_profile"]
            web_context = self.web_search.get_comprehensive_context(citizen_profile)
            
            logger.info(f"Web search completed for citizen {state['citizen_id']}")
            
            return {
                **state,
                "web_context": web_context
            }
            
        except Exception as e:
            logger.error(f"Error in web search: {str(e)}")
            return {
                **state,
                "error": f"Web search error: {str(e)}",
                "web_context": ""
            }
    
    def scoring_node(self, state: EligibilityState) -> EligibilityState:
        """Node for eligibility scoring calculation."""
        try:
            logger.info(f"Starting scoring for citizen {state['citizen_id']}")
            
            citizen_profile = state["citizen_profile"]
            pdf_context = state.get("pdf_context", "")
            web_context = state.get("web_context", "")
            
            scoring_result = self.scoring_agent.score_citizen(
                citizen_profile, pdf_context, web_context
            )
            
            logger.info(f"Scoring completed for citizen {state['citizen_id']}: {scoring_result.eligibility_score}")
            
            return {
                **state,
                "scoring_result": scoring_result
            }
            
        except Exception as e:
            logger.error(f"Error in scoring: {str(e)}")
            return {
                **state,
                "error": f"Scoring error: {str(e)}"
            }
    
    def error_handler_node(self, state: EligibilityState) -> EligibilityState:
        """Node for handling errors in the workflow."""
        logger.error(f"Error in eligibility workflow: {state.get('error', 'Unknown error')}")
        
        # Create a default scoring result for error cases
        default_result = ScoringResult(
            citizen_id=state["citizen_id"],
            eligibility_score=0.0,
            subsidy_amount=0.0,
            reasoning=f"Workflow error: {state.get('error', 'Unknown error')}",
            processed_at=None
        )
        
        return {
            **state,
            "scoring_result": default_result
        }
    
    def process_citizen(self, citizen_id: str, citizen_profile: dict, 
                       documents: list = None, include_web_search: bool = True) -> ScoringResult:
        """
        Process a citizen's eligibility through the complete workflow.
        
        Args:
            citizen_id: ID of the citizen
            citizen_profile: Dictionary containing citizen profile data
            documents: List of document metadata
            include_web_search: Whether to include web search in the process
            
        Returns:
            ScoringResult with eligibility score and reasoning
        """
        try:
            # Initialize state
            initial_state = EligibilityState(
                citizen_id=citizen_id,
                citizen_profile=citizen_profile,
                documents=documents or [],
                pdf_context="",
                web_context="",
                scoring_result=None,
                error="",
                include_web_search=include_web_search
            )
            
            # Run the workflow
            logger.info(f"Starting eligibility workflow for citizen {citizen_id}")
            final_state = self.graph.invoke(initial_state)
            
            result = final_state.get("scoring_result")
            if result:
                logger.info(f"Eligibility workflow completed for citizen {citizen_id}")
                return result
            else:
                logger.error(f"No scoring result produced for citizen {citizen_id}")
                return ScoringResult(
                    citizen_id=citizen_id,
                    eligibility_score=0.0,
                    subsidy_amount=0.0,
                    reasoning="Workflow completed but no result produced",
                    processed_at=None
                )
                
        except Exception as e:
            logger.error(f"Error processing citizen {citizen_id}: {str(e)}")
            return ScoringResult(
                citizen_id=citizen_id,
                eligibility_score=0.0,
                subsidy_amount=0.0,
                reasoning=f"Processing error: {str(e)}",
                processed_at=None
            )
    
    def process_batch(self, citizen_profiles: list, include_web_search: bool = True) -> list:
        """
        Process multiple citizens in batch.
        
        Args:
            citizen_profiles: List of citizen profile dictionaries
            include_web_search: Whether to include web search in the process
            
        Returns:
            List of ScoringResult objects
        """
        results = []
        
        for profile in citizen_profiles:
            citizen_id = profile.get("id", "unknown")
            result = self.process_citizen(
                citizen_id=citizen_id,
                citizen_profile=profile,
                include_web_search=include_web_search
            )
            results.append(result)
        
        return results

# Create global workflow instance
eligibility_workflow = EligibilityWorkflow()
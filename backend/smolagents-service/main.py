"""
Multi-Agent Analysis Service using Smolagents Framework

This service implements a sophisticated multi-agent reasoning system for citizen eligibility analysis.
It features real-time plan review, hybrid knowledge retrieval (ChromaDB + TavilySearch), 
and comprehensive scoring mechanisms.
"""

from fastapi import FastAPI, WebSocket, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import asyncio
import json
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

# Import dual-analysis services
from services.rag_analysis_service import RagAnalysisService
from services.formula_analysis_service import FormulaAnalysisService
from services.analysis_comparator import AnalysisComparator

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Dual-Analysis Citizen Eligibility Service",
    description="""
    Advanced citizen eligibility analysis comparing RAG-based contextual reasoning 
    with transparent formula-based calculations.
    
    ## Features
    - **RAG Analysis**: Policy-aware contextual reasoning using LLM + web search
    - **Formula Analysis**: Transparent mathematical burden scoring  
    - **Comparison Analysis**: Interpretability vs flexibility insights
    
    ## Research Focus
    Demonstrates trade-offs between transparent mathematical scoring and 
    flexible contextual policy reasoning in AI governance systems.
    """,
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for active analysis sessions
active_sessions: Dict[str, Any] = {}
websocket_connections: Dict[str, WebSocket] = {}

# Data Models
class AnalysisRequest(BaseModel):
    citizen_id: str
    citizen_data: dict
    query: str
    enable_plan_review: bool = True
    planning_interval: int = 5

class AnalysisResponse(BaseModel):
    analysis_id: str
    status: str
    results: Optional[dict] = None
    score: Optional[float] = None
    plan_interactions: List[dict] = []

# Dual-Analysis Data Models
class CitizenAnalysisRequest(BaseModel):
    citizen_id: str
    citizen_data: dict

class RagAnalysisResponse(BaseModel):
    method: str = "rag"
    citizen_id: str
    result: dict
    timestamp: str
    
class FormulaAnalysisResponse(BaseModel):
    method: str = "formula"
    citizen_id: str
    result: dict
    timestamp: str

class ComparisonRequest(BaseModel):
    citizen_id: str
    rag_result: dict
    formula_result: dict

class ComparisonResponse(BaseModel):
    citizen_id: str
    comparison: dict
    timestamp: str

class PlanReviewRequest(BaseModel):
    plan_id: str
    action: str  # "approve", "modify", "cancel"
    modified_plan: Optional[str] = None
    review_notes: Optional[str] = None

class WebSocketMessage(BaseModel):
    type: str
    session_id: str
    timestamp: str
    data: dict

# Utility functions
def generate_analysis_id() -> str:
    """Generate unique analysis session ID"""
    return f"analysis_{uuid.uuid4().hex[:8]}"

def create_websocket_message(msg_type: str, session_id: str, data: dict) -> dict:
    """Create standardized WebSocket message"""
    return {
        "type": msg_type,
        "session_id": session_id,
        "timestamp": datetime.now().isoformat(),
        "data": data
    }

# Basic health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "smolagents-analysis",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# Test endpoint to verify environment setup
@app.get("/test-config")
async def test_configuration():
    """Test endpoint to verify environment configuration"""
    config_status = {
        "openai_api_key": bool(os.getenv("OPENAI_API_KEY")),
        "tavily_api_key": bool(os.getenv("TAVILY_API_KEY")),
        "mongodb_configured": bool(os.getenv("MONGO_URI")),
        "supabase_configured": bool(os.getenv("SUPABASE_URL")),
        "unstructured_api_key": bool(os.getenv("UNSTRUCTURED_API_KEY"))
    }
    
    return {
        "status": "configuration_check",
        "config_status": config_status,
        "all_configured": all(config_status.values())
    }

# Main analysis endpoint (placeholder for now)
@app.post("/analyze-citizen", response_model=AnalysisResponse)
async def analyze_citizen(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Main endpoint for citizen eligibility analysis
    This will be implemented with full smolagents integration
    """
    analysis_id = generate_analysis_id()
    
    # Create session entry
    session_data = {
        "analysis_id": analysis_id,
        "request": request,
        "status": "initialized",
        "created_at": datetime.now().isoformat(),
        "agent_results": [],
        "plan_interactions": []
    }
    
    active_sessions[analysis_id] = session_data
    
    # For now, return a placeholder response
    return AnalysisResponse(
        analysis_id=analysis_id,
        status="initialized", 
        results={"message": "Analysis service initialized - smolagents integration pending"},
        score=0.0,
        plan_interactions=[]
    )

# Plan review endpoint (placeholder for now)
@app.post("/analysis/{analysis_id}/plan-review")
async def handle_plan_review(analysis_id: str, review: PlanReviewRequest):
    """Handle plan approval, modification, or cancellation"""
    if analysis_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Analysis session not found")
    
    session = active_sessions[analysis_id]
    
    # For now, return a placeholder response
    return {
        "status": "plan_review_received",
        "analysis_id": analysis_id,
        "action": review.action,
        "message": "Plan review functionality pending smolagents integration"
    }

# WebSocket endpoint for real-time updates
@app.websocket("/ws/analysis/{analysis_id}")
async def websocket_endpoint(websocket: WebSocket, analysis_id: str):
    """Real-time updates via WebSocket"""
    await websocket.accept()
    
    # Store connection
    websocket_connections[analysis_id] = websocket
    
    try:
        # Send initial connection message
        await websocket.send_json(create_websocket_message(
            "connection_established",
            analysis_id,
            {"message": "WebSocket connection established", "analysis_id": analysis_id}
        ))
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for any message from client (heartbeat, commands, etc.)
                data = await websocket.receive_json()
                
                # Echo back for now (will implement proper handling later)
                await websocket.send_json(create_websocket_message(
                    "echo",
                    analysis_id,
                    {"received": data}
                ))
                
            except Exception as e:
                print(f"WebSocket error for {analysis_id}: {e}")
                break
                
    except Exception as e:
        print(f"WebSocket connection error: {e}")
    finally:
        # Clean up connection
        if analysis_id in websocket_connections:
            del websocket_connections[analysis_id]

# Utility endpoint to list active sessions
@app.get("/sessions")
async def list_active_sessions():
    """List all active analysis sessions"""
    return {
        "active_sessions": list(active_sessions.keys()),
        "websocket_connections": list(websocket_connections.keys()),
        "total_sessions": len(active_sessions)
    }

# Clean up endpoint for testing
@app.delete("/sessions/{analysis_id}")
async def cleanup_session(analysis_id: str):
    """Clean up a specific analysis session"""
    if analysis_id in active_sessions:
        del active_sessions[analysis_id]
    
    if analysis_id in websocket_connections:
        del websocket_connections[analysis_id]
    
    return {"status": "session_cleaned", "analysis_id": analysis_id}

# === DUAL-ANALYSIS ENDPOINTS ===

@app.post("/analyze-citizen-rag", response_model=RagAnalysisResponse, tags=["Dual Analysis"])
async def analyze_citizen_rag(request: CitizenAnalysisRequest):
    """
    # RAG-based Eligibility Analysis
    
    Performs contextual policy analysis using LLM reasoning with policy documents and web search.
    
    **Analysis Method**: Flexible contextual reasoning  
    **Response Time**: 30-60 seconds  
    **Confidence**: Variable (0.0-1.0) based on policy clarity
    
    ## Tools Used:
    - **CitizenDataValidationTool**: Input validation
    - **ChromaDBRetrieverTool**: Policy document retrieval  
    - **TavilySearchTool**: Latest Malaysian policy updates
    - **PolicyReasoningTool**: LLM-based eligibility reasoning
    
    ## Use Cases:
    - Edge case handling beyond mathematical rules
    - Policy interpretation with latest updates
    - Contextual factors not captured by formulas
    """
    try:
        # Initialize RAG analysis service
        rag_service = RagAnalysisService()
        
        # Perform RAG-based analysis
        rag_result = rag_service.analyze(request.citizen_data)
        
        # Convert dataclass to dict for response
        result_dict = {
            "score": rag_result.score,
            "confidence": rag_result.confidence,
            "eligibility_class": rag_result.eligibility_class,
            "explanation": rag_result.explanation,
            "retrieved_context": rag_result.retrieved_context,
            "reasoning_path": rag_result.reasoning_path,
            "policy_factors": rag_result.policy_factors,
            "edge_cases_identified": rag_result.edge_cases_identified,
            "web_search_summary": rag_result.web_search_summary,
            "validation_results": rag_result.validation_results
        }
        
        return RagAnalysisResponse(
            citizen_id=request.citizen_id,
            result=result_dict,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"RAG analysis failed: {str(e)}"
        )

@app.post("/analyze-citizen-formula", response_model=FormulaAnalysisResponse, tags=["Dual Analysis"])
async def analyze_citizen_formula(request: CitizenAnalysisRequest):
    """
    # Formula-based Eligibility Scoring
    
    Performs mathematical burden score calculation with complete transparency and audit trail.
    
    **Analysis Method**: Deterministic mathematical calculation  
    **Response Time**: 5-15 seconds  
    **Confidence**: Always 1.0 (mathematical certainty)
    
    ## Calculation Components:
    - **Burden Score** (55%): Equivalised income with adult equivalent scaling
    - **Documentation Score** (25%): All-or-nothing validation scoring
    - **Disability Score** (20%): Binary disability status scoring
    
    ## Features:
    - State-specific income equivalent lookup
    - Adult Equivalent household composition scaling
    - Complete mathematical audit trail
    - 100% reproducible results
    
    ## Use Cases:
    - Transparent, auditable eligibility determination
    - Baseline scoring for comparison with contextual analysis
    - Regulatory compliance requiring mathematical justification
    """
    try:
        # Initialize Formula analysis service
        formula_service = FormulaAnalysisService()
        
        # Perform formula-based analysis
        formula_result = formula_service.analyze(request.citizen_data)
        
        # Convert dataclass to dict for response
        result_dict = {
            "score": formula_result.score,
            "burden_score": formula_result.burden_score,
            "eligibility_class": formula_result.eligibility_class,
            "explanation": formula_result.explanation,
            "equivalent_income": formula_result.equivalent_income,
            "adult_equivalent": formula_result.adult_equivalent,
            "component_scores": formula_result.component_scores,
            "confidence": formula_result.confidence
        }
        
        return FormulaAnalysisResponse(
            citizen_id=request.citizen_id,
            result=result_dict,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Formula analysis failed: {str(e)}"
        )

@app.post("/compare-analyses", response_model=ComparisonResponse, tags=["Dual Analysis"])
async def compare_analyses(request: ComparisonRequest):
    """
    # Analysis Comparison & Governance Insights
    
    Compares RAG and Formula analysis results to provide governance recommendations.
    
    **Analysis Method**: Score difference and confidence assessment  
    **Response Time**: 1-3 seconds  
    **Agreement Threshold**: 5.0 points difference
    
    ## Comparison Logic:
    - **Agreement**: Score difference ≤ 5 points → ✅ Consensus
    - **Disagreement**: Score difference > 5 points → ⚠️ Review needed
    - **Low Confidence**: RAG confidence < 0.5 → Favor formula transparency
    
    ## Governance Recommendations:
    - **High Agreement**: Both methods align → Robust determination
    - **Disagreement**: Highlights interpretability vs flexibility trade-offs
    - **Manual Review**: Significant disagreement requires human oversight
    
    ## Research Value:
    Quantifies when transparent mathematical scoring agrees/disagrees with 
    contextual policy reasoning for AI governance insights.
    """
    try:
        # Initialize comparison service
        comparator = AnalysisComparator()
        
        # Perform comparison
        comparison_result = comparator.compare(
            rag_result=request.rag_result,
            formula_result=request.formula_result,
            citizen_id=request.citizen_id
        )
        
        # Convert dataclass to dict for response
        comparison_dict = {
            "agreement": comparison_result.agreement,
            "score_difference": comparison_result.score_difference,
            "rag_confidence": comparison_result.rag_confidence,
            "recommendation": comparison_result.recommendation,
            "comment": comparison_result.comment
        }
        
        return ComparisonResponse(
            citizen_id=request.citizen_id,
            comparison=comparison_dict,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Comparison analysis failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3003, reload=True)
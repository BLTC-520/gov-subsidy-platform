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

# Import tools
from tools.eligibility_score_tool import EligibilityScoreTool

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Smolagents Multi-Agent Analysis Service",
    description="Advanced citizen eligibility analysis using multi-agent reasoning",
    version="1.0.0"
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

class EligibilityScoreRequest(BaseModel):
    citizen_id: str
    citizen_data: dict

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3003, reload=True)
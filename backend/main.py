from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
import logging
from datetime import datetime
import io

# Import our services and models
from config.settings import settings
from models.schemas import ScoringRequest, ScoringResult, CitizenProfile
from services.supabase_client import supabase_service
from services.csv_export import csv_export_service
from workflows.eligibility_flow import eligibility_workflow

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI Subsidy Scoring API",
    description="Agentic RAG-powered eligibility scoring for Malaysian government subsidies",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "AI Subsidy Scoring API",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "api": "healthy",
        "database": "connected",
        "ai_service": "available",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/score/citizen/{citizen_id}")
async def score_citizen(citizen_id: str, background_tasks: BackgroundTasks):
    """
    Score a single citizen's eligibility.
    
    Args:
        citizen_id: ID of the citizen to score
        
    Returns:
        Scoring result with eligibility score and subsidy amount
    """
    try:
        logger.info(f"Starting scoring for citizen {citizen_id}")
        
        # Get citizen profile from Supabase
        citizen_profile = supabase_service.get_citizen_profile(citizen_id)
        if not citizen_profile:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        # Process through eligibility workflow
        scoring_result = eligibility_workflow.process_citizen(
            citizen_id=citizen_id,
            citizen_profile=citizen_profile,
            include_web_search=True
        )
        
        # Update score in database (background task)
        background_tasks.add_task(
            update_citizen_score_in_db,
            citizen_id,
            scoring_result
        )
        
        logger.info(f"Completed scoring for citizen {citizen_id}: {scoring_result.eligibility_score}")
        
        return {
            "citizen_id": citizen_id,
            "eligibility_score": scoring_result.eligibility_score,
            "subsidy_amount": scoring_result.subsidy_amount,
            "reasoning": scoring_result.reasoning,
            "processed_at": scoring_result.processed_at.isoformat() if scoring_result.processed_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scoring citizen {citizen_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")

@app.post("/score/batch")
async def score_batch(background_tasks: BackgroundTasks, limit: int = 50):
    """
    Score multiple citizens in batch.
    
    Args:
        limit: Maximum number of citizens to process
        
    Returns:
        List of scoring results
    """
    try:
        logger.info(f"Starting batch scoring for up to {limit} citizens")
        
        # Get all citizen profiles
        all_profiles = supabase_service.get_all_profiles()
        
        # Limit the batch size
        profiles_to_process = all_profiles[:limit]
        
        if not profiles_to_process:
            return {"message": "No citizens to process", "results": []}
        
        # Process batch through eligibility workflow
        scoring_results = eligibility_workflow.process_batch(
            citizen_profiles=profiles_to_process,
            include_web_search=True
        )
        
        # Update scores in database (background task)
        background_tasks.add_task(
            update_batch_scores_in_db,
            scoring_results
        )
        
        logger.info(f"Completed batch scoring for {len(scoring_results)} citizens")
        
        return {
            "message": f"Processed {len(scoring_results)} citizens",
            "results": [
                {
                    "citizen_id": result.citizen_id,
                    "eligibility_score": result.eligibility_score,
                    "subsidy_amount": result.subsidy_amount,
                    "processed_at": result.processed_at.isoformat() if result.processed_at else None
                }
                for result in scoring_results
            ]
        }
        
    except Exception as e:
        logger.error(f"Error in batch scoring: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch scoring error: {str(e)}")

@app.get("/export/csv")
async def export_csv():
    """
    Export all scoring results to CSV format.
    
    Returns:
        CSV file download
    """
    try:
        logger.info("Exporting scoring results to CSV")
        
        csv_content = csv_export_service.export_scoring_results()
        
        if not csv_content:
            raise HTTPException(status_code=404, detail="No scoring results found")
        
        # Create file stream
        csv_buffer = io.StringIO(csv_content)
        
        # Return CSV as downloadable file
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=scoring_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"CSV export error: {str(e)}")

@app.get("/export/eligible")
async def export_eligible_csv(min_score: float = 20.0):
    """
    Export only eligible citizens to CSV format.
    
    Args:
        min_score: Minimum eligibility score threshold
        
    Returns:
        CSV file download
    """
    try:
        logger.info(f"Exporting eligible citizens (score >= {min_score}) to CSV")
        
        csv_content = csv_export_service.export_eligible_citizens(min_score)
        
        if not csv_content:
            raise HTTPException(status_code=404, detail="No eligible citizens found")
        
        # Return CSV as downloadable file
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=eligible_citizens_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting eligible citizens CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Eligible citizens export error: {str(e)}")

@app.get("/export/statistics")
async def export_statistics_csv():
    """
    Export statistics summary to CSV format.
    
    Returns:
        CSV file download with statistics
    """
    try:
        logger.info("Exporting statistics summary to CSV")
        
        csv_content = csv_export_service.export_statistics_summary()
        
        if not csv_content:
            raise HTTPException(status_code=404, detail="No statistics available")
        
        # Return CSV as downloadable file
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=statistics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting statistics CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Statistics export error: {str(e)}")

@app.get("/documents/reload")
async def reload_documents():
    """
    Reload documents from Supabase Storage into cache.
    
    Returns:
        Status of document reload operation
    """
    try:
        logger.info("Reloading documents from Supabase Storage")
        
        # Access the PDF retriever from the workflow
        pdf_retriever = eligibility_workflow.pdf_retriever
        success = pdf_retriever.load_and_cache_documents()
        
        if success:
            doc_count = len(pdf_retriever.document_cache)
            return {
                "message": "Documents reloaded successfully",
                "document_count": doc_count,
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to reload documents")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reloading documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document reload error: {str(e)}")

@app.get("/documents/list")
async def list_documents():
    """
    List all cached documents.
    
    Returns:
        List of document information
    """
    try:
        pdf_retriever = eligibility_workflow.pdf_retriever
        
        # Ensure documents are loaded
        if not pdf_retriever.document_cache:
            pdf_retriever.load_and_cache_documents()
        
        documents = []
        for filename, doc_data in pdf_retriever.document_cache.items():
            documents.append({
                "filename": filename,
                "content_length": len(doc_data["content"]),
                "metadata": doc_data["metadata"]
            })
        
        return {
            "documents": documents,
            "total_count": len(documents),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document listing error: {str(e)}")

# Background task functions
async def update_citizen_score_in_db(citizen_id: str, scoring_result: ScoringResult):
    """Background task to update citizen score in database."""
    try:
        success = supabase_service.update_citizen_score(
            citizen_id=citizen_id,
            eligibility_score=scoring_result.eligibility_score,
            subsidy_amount=scoring_result.subsidy_amount,
            reasoning=scoring_result.reasoning
        )
        
        if success:
            logger.info(f"Updated score in database for citizen {citizen_id}")
        else:
            logger.error(f"Failed to update score in database for citizen {citizen_id}")
            
    except Exception as e:
        logger.error(f"Error updating score in database: {str(e)}")

async def update_batch_scores_in_db(scoring_results: List[ScoringResult]):
    """Background task to update batch scores in database."""
    try:
        success_count = 0
        for result in scoring_results:
            success = supabase_service.update_citizen_score(
                citizen_id=result.citizen_id,
                eligibility_score=result.eligibility_score,
                subsidy_amount=result.subsidy_amount,
                reasoning=result.reasoning
            )
            
            if success:
                success_count += 1
        
        logger.info(f"Updated {success_count}/{len(scoring_results)} scores in database")
        
    except Exception as e:
        logger.error(f"Error updating batch scores in database: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port, reload=settings.debug)
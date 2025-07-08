from services.supabase_client import supabase_service
from typing import List, Dict, Any
import logging
import io
import PyPDF2
from docx import Document as DocxDocument
from config.settings import settings

logger = logging.getLogger(__name__)

class PDFRetrieverAgent:
    def __init__(self):
        self.supabase_service = supabase_service
        self.document_cache = {}  # Simple in-memory cache
    
    def _extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes."""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"Error extracting PDF text: {str(e)}")
            return ""
    
    def _extract_text_from_docx(self, docx_bytes: bytes) -> str:
        """Extract text from DOCX bytes."""
        try:
            doc = DocxDocument(io.BytesIO(docx_bytes))
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            logger.error(f"Error extracting DOCX text: {str(e)}")
            return ""
    
    def load_and_cache_documents(self) -> bool:
        """
        Load all documents from Supabase Storage into memory cache.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            documents = self.supabase_service.get_uploaded_documents()
            
            for doc_info in documents:
                filename = doc_info["filename"]
                
                # Skip if already cached
                if filename in self.document_cache:
                    continue
                
                # Download document
                file_bytes = self.supabase_service.download_document(filename)
                if not file_bytes:
                    continue
                
                # Extract text based on file type
                text_content = ""
                if filename.lower().endswith('.pdf'):
                    text_content = self._extract_text_from_pdf(file_bytes)
                elif filename.lower().endswith('.docx'):
                    text_content = self._extract_text_from_docx(file_bytes)
                else:
                    logger.warning(f"Unsupported file type: {filename}")
                    continue
                
                # Cache the document
                self.document_cache[filename] = {
                    "content": text_content,
                    "metadata": doc_info
                }
                
                logger.info(f"Cached document: {filename}")
            
            logger.info(f"Loaded {len(self.document_cache)} documents into cache")
            return True
            
        except Exception as e:
            logger.error(f"Error loading documents: {str(e)}")
            return False
    
    def retrieve_relevant_context(self, query: str, top_k: int = 5) -> str:
        """
        Retrieve relevant context from cached documents using simple text matching.
        
        Args:
            query: Search query
            top_k: Number of top results to return
            
        Returns:
            Formatted context string
        """
        try:
            # Ensure documents are loaded
            if not self.document_cache:
                self.load_and_cache_documents()
            
            # Simple keyword matching for now
            query_keywords = query.lower().split()
            relevant_docs = []
            
            for filename, doc_data in self.document_cache.items():
                content = doc_data["content"].lower()
                
                # Count keyword matches
                match_count = 0
                for keyword in query_keywords:
                    if keyword in content:
                        match_count += content.count(keyword)
                
                if match_count > 0:
                    relevant_docs.append({
                        "filename": filename,
                        "content": doc_data["content"],
                        "metadata": doc_data["metadata"],
                        "score": match_count
                    })
            
            # Sort by relevance score
            relevant_docs.sort(key=lambda x: x["score"], reverse=True)
            relevant_docs = relevant_docs[:top_k]
            
            # Format response
            context_parts = [
                "=== GOVERNMENT DOCUMENT CONTEXT ===",
                f"Query: {query}",
                f"Found {len(relevant_docs)} relevant documents",
                ""
            ]
            
            for doc in relevant_docs:
                context_parts.append(f"Document: {doc['filename']}")
                context_parts.append(f"Relevance Score: {doc['score']}")
                # Add first 500 characters of content
                content_preview = doc["content"][:500] + "..." if len(doc["content"]) > 500 else doc["content"]
                context_parts.append(f"Content: {content_preview}")
                context_parts.append("")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return f"Error retrieving document context: {str(e)}"
    
    def get_eligibility_context(self, citizen_profile: Dict[str, Any]) -> str:
        """
        Get eligibility-specific context for a citizen profile.
        
        Args:
            citizen_profile: Dictionary containing citizen profile data
            
        Returns:
            Formatted context string specific to eligibility assessment
        """
        # Build context-specific query
        query_parts = ["Malaysian government subsidy eligibility criteria"]
        
        if citizen_profile.get("monthly_income"):
            query_parts.append(f"income threshold {citizen_profile['monthly_income']} MYR")
        
        if citizen_profile.get("household_size"):
            query_parts.append(f"household size {citizen_profile['household_size']}")
        
        if citizen_profile.get("disability_status"):
            query_parts.append("disability OKU benefits")
        
        if citizen_profile.get("state"):
            query_parts.append(f"{citizen_profile['state']} state programs")
        
        query = " ".join(query_parts)
        
        context = self.retrieve_relevant_context(query, top_k=3)
        
        # Log the context being returned for debugging
        logger.info(f"PDF Context Generated (length: {len(context)} chars)")
        logger.info(f"Context preview: {context[:500]}...")
        
        return context
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """
        List all documents in the vector store.
        
        Returns:
            List of document metadata
        """
        try:
            # TODO: Implement actual document listing
            # For now, return placeholder
            return [
                {
                    "filename": "placeholder_document.pdf",
                    "document_type": "government_policy",
                    "status": "indexed"
                }
            ]
        except Exception as e:
            logger.error(f"Error listing documents: {str(e)}")
            return []
    
    def remove_document(self, document_id: str) -> bool:
        """
        Remove a document from the vector store.
        
        Args:
            document_id: ID of the document to remove
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # TODO: Implement document removal
            logger.info(f"Document removal requested for ID: {document_id}")
            return True
        except Exception as e:
            logger.error(f"Error removing document: {str(e)}")
            return False
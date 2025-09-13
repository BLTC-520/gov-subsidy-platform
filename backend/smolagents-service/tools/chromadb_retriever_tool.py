"""
ChromaDBRetrieverTool - Semantic document retrieval using ChromaDB over MongoDB chunks.

This tool implements simplified document retrieval:
- Loads document chunks from existing MongoDB RAG_database.doc_chunks collection
- Creates ChromaDB vector index using OpenAI embeddings
- Performs semantic search
- Handles errors gracefully by returning empty results
"""

import os
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

from smolagents import Tool
from langchain.docstore.document import Document
from langchain_community.vectorstores import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata
from langchain_openai import OpenAIEmbeddings
from pymongo import MongoClient

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class ChromaDBRetrieverTool(Tool):
    """
    Simplified ChromaDB retriever tool for semantic document search.
    
    Architecture Level: ★★☆ Tool Level (LLM-guided search execution)
    
    Features:
    - Semantic search using ChromaDB + OpenAI embeddings
    - Loads documents from existing MongoDB chunk collection
    - Graceful error handling for service unavailability
    - Compatible with smolagents Tool interface
    """
    
    name = "chromadb_retriever"
    description = "Retrieves relevant documents using ChromaDB semantic search over MongoDB document chunks"
    output_type = "object"
    
    inputs = {
        "query": {
            "type": "string",
            "description": "Search query for document retrieval",
        },
        "max_results": {
            "type": "integer", 
            "description": "Maximum number of documents to return (default: 5)",
            "nullable": True
        }
    }

    def __init__(self, 
                 mongo_uri: str = None,
                 mongo_db: str = None,
                 mongo_collection: str = None,
                 persist_directory: str = "./chroma_db",
                 **kwargs):
        super().__init__(**kwargs)
        
        # Use environment variables as defaults
        self.mongo_uri = mongo_uri or os.getenv("MONGO_URI", "mongodb://localhost:27017/")
        self.mongo_db = mongo_db or os.getenv("MONGO_DB", "RAG_database")
        self.mongo_collection = mongo_collection or os.getenv("MONGO_COLLECTION", "doc_chunks")
        self.persist_directory = persist_directory
        
        logger.info(f"Initializing ChromaDBRetrieverTool with MongoDB: {self.mongo_db}.{self.mongo_collection}")
        
        try:
            # Load docs from MongoDB
            self.docs = self._load_docs_from_mongo()
            logger.info(f"Loaded {len(self.docs)} documents from MongoDB")
            
            if not self.docs:
                logger.warning("No documents found in MongoDB. Retriever will return empty results.")
                self.vector_store = None
                return
            
            # Initialize ChromaDB with OpenAI embeddings
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                raise ValueError("OPENAI_API_KEY not found in environment variables")
            
            embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                api_key=openai_api_key
            )
            
            # Initialize Chroma vector store with persistence logic
            if os.path.exists(self.persist_directory) and os.listdir(self.persist_directory):
                logger.info("Loading existing ChromaDB...")
                self.vector_store = Chroma(persist_directory=self.persist_directory, embedding_function=embeddings)
            elif self.docs:
                logger.info("Building new ChromaDB from MongoDB documents...")
                filtered_docs = filter_complex_metadata(self.docs)
                self.vector_store = Chroma.from_documents(
                    filtered_docs,
                    embedding=embeddings,
                    persist_directory=self.persist_directory,
                )
                logger.info("ChromaDB created and persisted successfully")
            else:
                logger.warning("No docs available for ChromaDB creation")
                self.vector_store = None
                
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDBRetrieverTool: {str(e)}")
            self.docs = []
            self.vector_store = None

    def _load_docs_from_mongo(self) -> List[Document]:
        """
        Fetch document chunks from MongoDB and convert to LangChain Documents.
        Based on reference implementation from backend/learnFromHere/retriever.py lines 118-161
        """
        try:
            client = MongoClient(self.mongo_uri)
            collection = client[self.mongo_db][self.mongo_collection]
            
            docs = []
            for record in collection.find():
                # Ensure we have text content
                text_content = record.get("text", "")
                if not text_content:
                    continue
                    
                # Build metadata from MongoDB document
                metadata = {
                    "chunk_id": record.get("chunk_id"),
                    "source_file": record.get("source_file"),
                    "chunk_index": record.get("chunk_index"),
                    "element_type": record.get("element_type"),
                }
                
                # Add simple metadata values only (Chroma doesn't accept nested dicts)
                if "metadata" in record:
                    for key, value in record["metadata"].items():
                        # Only add simple types that Chroma can handle
                        if isinstance(value, (str, int, float, bool, type(None))):
                            metadata[key] = value
                        elif key == "page_number" and isinstance(value, (int, float)):
                            metadata[key] = value
                
                # Filter out None values and ensure all metadata is Chroma-compatible
                metadata = {k: v for k, v in metadata.items() if v is not None}
                
                docs.append(Document(
                    page_content=text_content,
                    metadata=metadata
                ))
            
            client.close()
            return docs
            
        except Exception as e:
            logger.error(f"Failed to load documents from MongoDB: {str(e)}")
            return []

    def forward(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Perform semantic search using ChromaDB.
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            
        Returns:
            Dict with "documents", "query", "total_found" keys, or error information
        """
        assert isinstance(query, str), "Your search query must be a string"
        
        # Check if retriever is properly initialized
        if not self.docs:
            return {
                "documents": [], 
                "query": query,
                "total_found": 0,
                "error": "No documents available. Please ensure MongoDB contains document chunks."
            }
        
        if not self.vector_store:
            return {
                "documents": [], 
                "query": query,
                "total_found": 0,
                "error": "ChromaDB not properly initialized. Check MongoDB connection and OpenAI API key."
            }
        
        try:
            logger.info(f"Performing semantic search for query: '{query}' (max_results: {max_results})")
            
            # Perform semantic similarity search
            results = self.vector_store.similarity_search(query, k=max_results)
            
            if not results:
                return {
                    "documents": [],
                    "query": query,
                    "total_found": 0,
                    "message": f"No relevant documents found for query: '{query}'"
                }
            
            # Format results for agent consumption
            formatted_documents = []
            for doc in results:
                formatted_doc = {
                    "content": doc.page_content.strip(),
                    "metadata": doc.metadata,
                    "chunk_id": doc.metadata.get("chunk_id"),
                    "source_file": doc.metadata.get("source_file"),
                    "page_number": doc.metadata.get("page_number")
                }
                formatted_documents.append(formatted_doc)
            
            logger.info(f"Retrieved {len(formatted_documents)} documents for query: '{query}'")
            
            return {
                "documents": formatted_documents,
                "query": query,
                "total_found": len(formatted_documents),
                "search_type": "semantic"
            }
            
        except Exception as e:
            logger.error(f"Error during ChromaDB retrieval: {str(e)}")
            return {
                "documents": [],
                "query": query,
                "total_found": 0,
                "error": f"Retrieval error: {str(e)}"
            }

    def __call__(self, query: str, **kwargs) -> str:
        """
        Backward compatibility method for smolagents Tool interface.
        Returns a formatted string representation of the results.
        """
        result = self.forward(query, **kwargs)
        
        if result.get("error"):
            return f"❌ Error: {result['error']}"
        
        if not result["documents"]:
            return f"No relevant documents found for query: '{query}'"
        
        # Format results as readable string
        output = f"Found {result['total_found']} documents for '{query}':\n\n"
        
        for i, doc in enumerate(result["documents"], 1):
            output += f"===== Document {i} =====\n"
            if doc.get("source_file"):
                output += f"Source: {doc['source_file']}\n"
            if doc.get("chunk_id"):
                output += f"Chunk ID: {doc['chunk_id']}\n"
            if doc.get("page_number") is not None:
                output += f"Page: {doc['page_number']}\n"
            output += f"\nContent:\n{doc['content']}\n\n"
        
        return output


def create_chromadb_retriever_tool(**kwargs) -> ChromaDBRetrieverTool:
    """Factory function to create a ChromaDBRetrieverTool instance with environment defaults."""
    return ChromaDBRetrieverTool(**kwargs)
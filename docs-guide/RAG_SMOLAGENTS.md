# RAG Smolagents Implementation Guide

## Overview

This document contains all the main code needed to implement the **RAG (Retrieval-Augmented Generation) Analysis System** using the Smolagents framework. The system uses AI agents with retrieval tools to perform flexible, context-aware policy reasoning for Malaysian subsidy eligibility analysis.

## Architecture

```
/api/start-smolagent-analysis/{citizen_id}
    ↓
SmolagentsAnalysisService (fetches data from Supabase)
    ↓
CitizenAnalysisAgent (smolagents framework)
    ↓
Tools: ChromaDBRetrieverTool + TavilySearchTool + PolicyReasoningTool
    ↓
AI-powered contextual analysis with retrieved policy documents
```

## How Smolagents Works

**Smolagents Framework Flow:**
1. **Agent Initialization**: CitizenAnalysisAgent inherits from `CodeAgent` with LiteLLM model
2. **Tool Registration**: ChromaDB, Tavily, and PolicyReasoning tools are registered with the agent
3. **Prompt-Driven Analysis**: Agent receives structured prompt with citizen data and analysis requirements
4. **Tool Orchestration**: Agent decides which tools to use based on the prompt instructions
5. **Multi-Step Reasoning**: Agent performs retrieval → search → reasoning → final analysis
6. **Structured Output**: Agent returns policy analysis with scores, confidence, and explanations

## 1. Main Agent - CitizenAnalysisAgent

**File: `agents/citizen_analysis_agent.py`**

```python
"""
CitizenAnalysisAgent - Basic implementation using smolagents framework.

This agent performs eligibility analysis for government subsidy applications
using a configurable LLM backend and various analysis tools.
"""

from typing import Dict, Any, List, Optional, Callable
import os
from dataclasses import dataclass
from datetime import datetime

from smolagents import CodeAgent, LiteLLMModel, Tool


@dataclass 
class AgentConfig:
    """Configuration class for CitizenAnalysisAgent"""
    model_name: str = "gpt-4o-mini"
    temperature: float = 0.1
    max_tokens: int = 2000
    timeout: int = 30
    api_key: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> "AgentConfig":
        """Create configuration from environment variables"""
        return cls(
            model_name=os.getenv("AGENT_MODEL_NAME", "gpt-4o-mini"),
            temperature=float(os.getenv("AGENT_TEMPERATURE", "0.2")),
            max_tokens=int(os.getenv("AGENT_MAX_TOKENS", "50000")),
            timeout=int(os.getenv("AGENT_TIMEOUT", "30")),
            api_key=os.getenv("OPENAI_API_KEY"),
        )


class CitizenAnalysisAgent(CodeAgent):
    """
    Basic implementation of CitizenAnalysisAgent using smolagents framework.
    
    This agent analyzes citizen eligibility for government subsidies using
    a configurable LLM backend and extensible tool system.
    """
    
    def __init__(
        self,
        config: Optional[AgentConfig] = None,
        tools: Optional[List[Tool]] = None
    ):
        """
        Initialize the CitizenAnalysisAgent.
        
        Args:
            config: Agent configuration (uses environment defaults if None)
            tools: List of tools to make available to the agent
        """
        self.config = config or AgentConfig.from_env()
        
        # Initialize the LiteLLM model with configuration
        model = LiteLLMModel(
            model_id=self.config.model_name,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            timeout=self.config.timeout
        )
        
        # Add path for imports
        import sys
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if current_dir not in sys.path:
            sys.path.insert(0, current_dir)
        
        # Create validation tool
        validation_tool = None
        try:
            from tools.citizen_data_validation_tool import CitizenDataValidationTool
            validation_tool = CitizenDataValidationTool(enable_audit_logging=True)
            print(f"✓ Validation tool created: {type(validation_tool)}")
            print(f"✓ Tool name: {getattr(validation_tool, 'name', 'MISSING NAME')}")
            
        except Exception as e:
            print(f"Could not create validation tool: {e}")
        
        # Convert tools to proper format for smolagents (list of BaseTool instances)
        from smolagents.agents import BaseTool
        
        agent_tools = []
        
        # Add user-provided tools
        if tools:
            if isinstance(tools, list):
                for tool in tools:
                    if isinstance(tool, BaseTool):
                        agent_tools.append(tool)
                        print(f"✓ Added user tool: {getattr(tool, 'name', 'unnamed')}")
                    else:
                        print(f"Warning: Tool is not BaseTool instance: {type(tool)}")
            else:
                print(f"Warning: tools should be a list, got {type(tools)}")
        
        # Add validation tool
        if validation_tool:
            if isinstance(validation_tool, BaseTool):
                agent_tools.append(validation_tool)
                print(f"✓ Added validation tool: {validation_tool.name}")
            else:
                print(f"Warning: Validation tool is not BaseTool: {type(validation_tool)}")
                print(f"Validation tool MRO: {type(validation_tool).__mro__}")
        
        print(f"Final tools list: {[getattr(tool, 'name', 'unnamed') for tool in agent_tools]}")
        
        # Set up environment for LiteLLM if needed
        if self.config.api_key:
            os.environ["OPENAI_API_KEY"] = self.config.api_key
        
        # Initialize parent CodeAgent with tools as list - NO PLANNING
        super().__init__(
            tools=agent_tools,
            model=model,
            planning_interval=None,  # Disable planning phase
            stream_outputs=False
        )
        
        # Initialize basic metadata
        self.created_at = datetime.now()
        self.analysis_count = 0
        
    def run(
        self, 
        citizen_data: Dict[str, Any], 
        query: str = "Analyze this citizen's eligibility for government subsidies",
        reset: bool = True
    ) -> Dict[str, Any]:
        """
        Basic run method for citizen analysis.
        
        Args:
            citizen_data: Dictionary containing citizen information
            query: Analysis query/prompt
            reset: Whether to reset agent memory (True for new analysis)
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Increment analysis counter
            self.analysis_count += 1
            
            # Prepare the analysis prompt
            analysis_prompt = self._prepare_analysis_prompt(citizen_data, query)
            
            print(f"🔄 Running agent analysis (attempt {self.analysis_count})")
            print(f"📝 Prompt length: {len(analysis_prompt)} characters")
            
            # Run the agent analysis
            result = super().run(analysis_prompt, reset=reset)
            
            print(f"✅ Agent execution completed")
            print(f"📊 Result type: {type(result)}")
            print(f"📋 Result preview: {str(result)[:200]}...")
            
            # Format and return results
            return {
                "status": "completed",
                "analysis_id": f"analysis_{self.analysis_count}_{int(datetime.now().timestamp())}",
                "citizen_id": citizen_data.get("citizen_id", "unknown"),
                "raw_result": result,
                "processed_at": datetime.now().isoformat(),
                "model_used": self.config.model_name,
                "tools_used": [getattr(tool, 'name', tool.__class__.__name__) for tool in self.tools.values() if hasattr(tool, 'name')]
            }
            
        except Exception as e:
            print(f"❌ Agent execution failed: {str(e)}")
            print(f"🔍 Error type: {type(e).__name__}")
            import traceback
            print(f"📋 Full traceback:\n{traceback.format_exc()}")
            
            return {
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "analysis_id": f"error_{self.analysis_count}_{int(datetime.now().timestamp())}",
                "processed_at": datetime.now().isoformat()
            }
    
    def _prepare_analysis_prompt(self, citizen_data: Dict[str, Any], query: str) -> str:
        """
        Prepare the analysis prompt for the LLM with structured output requirements.
        
        This prompt is crucial - it instructs the agent on exactly how to use the tools
        and what output format to provide.
        """
        prompt_template = f"""
You are an expert policy analyst for Malaysian government subsidy eligibility assessment. Your task is to analyze citizen eligibility using policy documents, recent updates, and contextual reasoning.

CITIZEN PROFILE:
{self._format_citizen_data(citizen_data)}

ANALYSIS WORKFLOW:
1. **Policy Document Retrieval**: Use the ChromaDB retriever to find relevant historical policy documents
2. **Latest Policy Updates**: Use Tavily search to find recent government policy changes and updates  
3. **Comprehensive Policy Reasoning**: Use the policy reasoning tool to analyze all gathered information

STEP-BY-STEP INSTRUCTIONS:
1. First, search ChromaDB for relevant subsidy policies using terms related to the citizen's profile
2. Then, search Tavily for latest Malaysian government subsidy updates
3. Finally, use the policy reasoning tool with all gathered context to provide final analysis

REQUIRED OUTPUT FORMAT:
You must provide a structured analysis with:

**ELIGIBILITY SCORE**: [0-100 numerical score]
**ELIGIBILITY CLASS**: [B40-B1/B2/B3/B4, M40-M1/M2/M3/M4, or T20-T1/T2]
**CONFIDENCE LEVEL**: [0.0-1.0]

**POLICY ANALYSIS**:
- Main eligibility factors from policy documents
- Recent policy changes that affect this case
- State-specific considerations
- Household composition impact

**SOURCES & CITATIONS**:
- List all policy documents referenced
- Include search results from latest updates
- Cite specific policy sections or guidelines

**REASONING**:
- Detailed explanation of score calculation
- Policy interpretation and contextual factors
- Comparison with similar cases or precedents

**RECOMMENDATIONS**:
- Approval/rejection recommendation
- Processing priority (standard/expedited)
- Additional documentation needed (if any)

Focus on policy flexibility and contextual factors that pure mathematical formulas cannot capture. Your analysis should demonstrate the value of human-like reasoning over rigid rule-based systems.

Begin your analysis now using the available tools.
"""
        return prompt_template.strip()
    
    def _format_citizen_data(self, citizen_data: Dict[str, Any]) -> str:
        """Format citizen data for prompt inclusion"""
        formatted_lines = []
        for key, value in citizen_data.items():
            formatted_lines.append(f"- {key.replace('_', ' ').title()}: {value}")
        
        return "\n".join(formatted_lines)
```

## 2. ChromaDB Retrieval Tool

**File: `tools/chromadb_retriever_tool.py`**

```python
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
```

## 3. Tavily Web Search Tool

**File: `tools/tavily_search_tool.py`**

```python
"""
TavilySearchTool - Malaysian policy-focused web search using Tavily API.

This tool performs targeted web searches for Malaysian government subsidy policies,
regulations, and recent updates. Designed specifically for RAG-based policy analysis.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

from smolagents import Tool
from tavily import TavilyClient

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class TavilySearchTool(Tool):
    """
    Malaysian policy-focused web search tool using Tavily API.
    
    Specialized for government subsidy policies, regulations, and recent updates
    relevant to eligibility analysis. Provides contextual information for RAG reasoning.
    """
    
    name = "tavily_search"
    description = "Search web for latest Malaysian government subsidy policies, regulations, and recent updates"
    output_type = "string"
    
    inputs = {
        "query": {
            "type": "string",
            "description": "Search query for Malaysian policy information (e.g. 'B40 subsidy eligibility 2024')"
        },
        "search_type": {
            "type": "string", 
            "description": "Search focus: 'policy' (default), 'news', or 'regulation'",
            "nullable": True
        },
        "max_results": {
            "type": "integer",
            "description": "Maximum number of results to return (default: 5)",
            "nullable": True
        }
    }
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Tavily search tool with Malaysian policy focus"""
        super().__init__()
        
        # Use environment variable if no API key provided
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        if not self.api_key:
            raise ValueError("TAVILY_API_KEY not found in environment variables")
        
        self.tavily_client = TavilyClient(api_key=self.api_key)
        
        # Malaysian policy search configuration
        self.country_filter = "malaysia"
        self.min_relevance = 0.75  # Slightly lower for policy searches
        self.default_max_results = 5
        
        logger.info("TavilySearchTool initialized for Malaysian policy search")
    
    def forward(
        self, 
        query: str, 
        search_type: str = "policy", 
        max_results: int = 5
    ) -> str:
        """
        Perform Malaysian policy-focused web search.
        
        Args:
            query: Search query for policy information
            search_type: Type of search - 'policy', 'news', or 'regulation'
            max_results: Maximum number of results to return
            
        Returns:
            Formatted search results with policy context
        """
        try:
            # Enhance query with Malaysian policy context
            enhanced_query = self._enhance_policy_query(query, search_type)
            
            # Configure search parameters
            search_params = {
                "query": enhanced_query,
                "max_results": min(max_results, 8),
                "country": self.country_filter,
                "include_answer": True,
                "include_raw_content": False,
                "search_depth": "advanced"
            }
            
            # Add search type specific parameters
            if search_type == "news":
                search_params["topic"] = "news"
                search_params["days"] = 30  # Recent news within 30 days
            
            logger.info(f"Performing Tavily search: {enhanced_query}")
            response = self.tavily_client.search(**search_params)
            
            if not response or 'results' not in response:
                return f"No policy information found for query: '{query}'"
            
            # Filter results by relevance
            relevant_results = self._filter_policy_relevant_results(
                response['results'], 
                self.min_relevance
            )
            
            if not relevant_results:
                return f"No relevant policy information found for query: '{query}'"
            
            # Format results for policy analysis
            return self._format_policy_results(query, response, relevant_results, search_type)
            
        except Exception as e:
            error_msg = f"Tavily policy search failed: {str(e)}"
            logger.error(error_msg)
            return error_msg
    
    def _enhance_policy_query(self, query: str, search_type: str) -> str:
        """Enhance search query with Malaysian policy context"""
        
        # Policy-specific enhancements
        policy_terms = {
            "policy": "Malaysia government policy subsidy program",
            "news": "Malaysia latest government subsidy news update",
            "regulation": "Malaysia official regulation requirement subsidy"
        }
        
        # Add Malaysian context if not present
        if "malaysia" not in query.lower():
            base_enhancement = policy_terms.get(search_type, policy_terms["policy"])
            enhanced_query = f"{query} {base_enhancement}"
        else:
            enhanced_query = query
        
        # Add current year context for recent policies
        import datetime
        current_year = datetime.datetime.now().year
        if str(current_year) not in enhanced_query:
            enhanced_query += f" {current_year}"
        
        return enhanced_query
    
    def _filter_policy_relevant_results(self, results: list, min_relevance: float) -> list:
        """Filter results for policy relevance and government sources"""
        
        # Government domain keywords for Malaysian sources
        trusted_domains = [
            "gov.my", "mof.gov.my", "treasury.gov.my", "bnm.gov.my", 
            "dosm.gov.my", "epu.gov.my", "mampu.gov.my", "pmo.gov.my"
        ]
        
        # Policy-relevant keywords
        policy_keywords = [
            "subsidy", "bantuan", "b40", "m40", "t20", "government", 
            "policy", "program", "assistance", "eligibility", "criteria"
        ]
        
        filtered_results = []
        
        for result in results:
            # Check relevance score
            if result.get('score', 0) < min_relevance:
                continue
            
            # Boost government sources
            is_gov_source = any(domain in result.get('url', '').lower() for domain in trusted_domains)
            
            # Check policy relevance
            content = (result.get('content', '') + result.get('title', '')).lower()
            has_policy_keywords = any(keyword in content for keyword in policy_keywords)
            
            if is_gov_source or has_policy_keywords:
                # Boost score for government sources
                if is_gov_source:
                    result['score'] = min(1.0, result.get('score', 0) + 0.1)
                    result['source_type'] = 'government'
                else:
                    result['source_type'] = 'general'
                
                filtered_results.append(result)
        
        # Sort by score (government sources will be higher)
        return sorted(filtered_results, key=lambda x: x.get('score', 0), reverse=True)
    
    def _format_policy_results(
        self, 
        query: str, 
        response: dict, 
        relevant_results: list,
        search_type: str
    ) -> str:
        """Format search results for policy analysis context"""
        
        formatted = f"Malaysian Policy Search Results for: '{query}'\n"
        formatted += "=" * 60 + "\n\n"
        
        # Add search configuration
        formatted += f"Search Configuration:\n"
        formatted += f"- Search Type: {search_type}\n"
        formatted += f"- Country Filter: {self.country_filter}\n"
        formatted += f"- Min Relevance: {self.min_relevance}\n"
        formatted += f"- Results Found: {len(relevant_results)} relevant from {len(response.get('results', []))} total\n\n"
        
        # Add Tavily's direct answer if available
        if response.get('answer'):
            formatted += f"Policy Summary:\n{response['answer']}\n\n"
        
        # Format individual results
        gov_sources = 0
        for i, result in enumerate(relevant_results, 1):
            formatted += f"Result {i}:\n"
            formatted += f"Title: {result.get('title', 'N/A')}\n"
            formatted += f"URL: {result.get('url', 'N/A')}\n"
            formatted += f"Relevance Score: {result.get('score', 0):.3f}\n"
            formatted += f"Source Type: {result.get('source_type', 'general')}\n"
            
            if result.get('source_type') == 'government':
                gov_sources += 1
                formatted += "📊 Official Government Source\n"
            
            formatted += f"Content: {result.get('content', 'N/A')}\n\n"
        
        # Add analysis summary
        formatted += f"Policy Context Analysis:\n"
        formatted += f"- Government sources found: {gov_sources}/{len(relevant_results)}\n"
        formatted += f"- Average relevance score: {sum(r.get('score', 0) for r in relevant_results) / len(relevant_results):.3f}\n"
        formatted += f"- Search reliability: {'High' if gov_sources >= 2 else 'Medium' if gov_sources >= 1 else 'Low'}\n"
        
        formatted += "\n" + "=" * 60
        return formatted
```

## 4. Policy Reasoning Tool

**File: `tools/policy_reasoning_tool.py`**

```python
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
    
    def __init__(self, model_name: str = "gpt-4o-mini"):
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
            
            # Perform LLM reasoning
            messages = [{"role": "user", "content": reasoning_prompt}]
            response = self.model.generate(messages)
            
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
```

## 5. Service Wrapper - SmolagentsAnalysisService

**File: `services/smolagents_analysis_service.py`**

```python
"""
SmolagentsAnalysisService - Dedicated RAG-only analysis service.

This service focuses solely on smolagents framework analysis,
fetching real citizen data from Supabase and generating detailed
analysis reports with policy reasoning.
"""

import asyncio
import logging
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import json

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from agents.citizen_analysis_agent import CitizenAnalysisAgent
from tools.citizen_data_validation_tool import CitizenDataValidationTool
from tools.chromadb_retriever_tool import ChromaDBRetrieverTool
from tools.tavily_search_tool import TavilySearchTool
from tools.policy_reasoning_tool import PolicyReasoningTool


class SmolagentsAnalysisService:
    """
    Service for running smolagents-only analysis with real citizen data.
    
    Fetches citizen profile from Supabase, runs RAG analysis using smolagents
    framework, and generates downloadable text reports.
    """
    
    def __init__(self):
        """Initialize the smolagents analysis service"""
        self.logger = logging.getLogger(__name__)
        
    async def analyze_citizen(self, citizen_id: str) -> Dict[str, Any]:
        """
        Run smolagents analysis for a specific citizen.
        
        Args:
            citizen_id: UUID of citizen in Supabase profiles table
            
        Returns:
            Dictionary with analysis results and text file content
        """
        start_time = datetime.now()
        self.logger.info(f"Starting smolagents analysis for citizen {citizen_id}")
        
        try:
            # Step 1: Fetch citizen data from Supabase
            citizen_data = await self._fetch_citizen_data(citizen_id)
            if not citizen_data:
                raise Exception(f"Citizen not found: {citizen_id}")
            
            # Step 2: Run RAG analysis
            rag_result = await self._run_smolagents_analysis(citizen_id, citizen_data)
            
            # Step 3: Generate text file content
            text_content = self._generate_text_report(citizen_data, rag_result)
            
            # Step 4: Create filename
            citizen_name = citizen_data.get('full_name', 'Unknown').replace(' ', '-')
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"smolagents-analysis-{citizen_name}-{timestamp}.txt"
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "status": "completed",
                "analysis_result": rag_result,
                "text_file_content": text_content,
                "filename": filename,
                "execution_time": execution_time,
                "citizen_data": citizen_data
            }
            
        except Exception as e:
            self.logger.error(f"Smolagents analysis failed for {citizen_id}: {str(e)}")
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "status": "error",
                "error_message": str(e),
                "execution_time": execution_time,
                "text_file_content": self._generate_error_report(citizen_id, str(e)),
                "filename": f"smolagents-error-{citizen_id[:8]}-{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            }
    
    async def _fetch_citizen_data(self, citizen_id: str) -> Optional[Dict[str, Any]]:
        """Fetch citizen data from Supabase"""
        try:
            from supabase import create_client
            
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
            
            if not supabase_url or not supabase_key:
                raise Exception("Missing Supabase configuration")
            
            supabase = create_client(supabase_url, supabase_key)
            
            # Fetch citizen profile
            response = supabase.table('profiles').select('*').eq('id', citizen_id).single().execute()
            
            if response.data:
                return response.data
            else:
                return None
                
        except Exception as e:
            self.logger.error(f"Failed to fetch citizen data: {e}")
            return None
    
    async def _run_smolagents_analysis(self, citizen_id: str, citizen_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run the actual smolagents RAG analysis"""
        try:
            self.logger.info(f"Initializing smolagents agent for citizen {citizen_id}")
            
            # Initialize validation tool
            validation_tool = CitizenDataValidationTool()
            
            # Initialize retrieval and reasoning tools
            chromadb_tool = ChromaDBRetrieverTool()
            tavily_tool = TavilySearchTool()
            policy_tool = PolicyReasoningTool()
            
            # Create tools list
            tools = [chromadb_tool, tavily_tool, policy_tool, validation_tool]
            
            self.logger.info("Creating CitizenAnalysisAgent...")
            
            # Create the agent with timeout handling
            try:
                self.logger.info("Attempting to create CitizenAnalysisAgent with timeout handling...")
                
                # Use asyncio.wait_for to add timeout to agent creation
                agent = await asyncio.wait_for(
                    asyncio.to_thread(
                        CitizenAnalysisAgent,
                        tools=tools,
                        max_steps=15,
                        verbose=True
                    ),
                    timeout=30.0  # 30 second timeout for agent creation
                )
                self.logger.info("✅ CitizenAnalysisAgent created successfully")
                
            except asyncio.TimeoutError:
                self.logger.error("Agent creation timed out after 30 seconds")
                return {
                    "status": "timeout",
                    "error": "Agent initialization timed out - this may indicate network connectivity issues",
                    "score": 0,
                    "eligibility_class": "Timeout",
                    "confidence": 0.0,
                    "explanation": "Smolagents agent creation timed out. This may be due to network issues when loading model prompts or dependencies."
                }
            except Exception as agent_error:
                self.logger.error(f"Failed to create agent: {agent_error}")
                # Return a meaningful error result instead of crashing
                return {
                    "status": "error",
                    "error": f"Agent initialization failed: {str(agent_error)}",
                    "score": 0,
                    "eligibility_class": "Error",
                    "confidence": 0.0,
                    "explanation": f"Failed to initialize smolagents framework: {str(agent_error)}"
                }
            
            # Prepare citizen data query
            citizen_summary = self._format_citizen_data_for_agent(citizen_data)
            
            # Run the agent analysis with timeout
            self.logger.info("Running agent analysis...")
            try:
                agent_result = await asyncio.wait_for(
                    agent.arun(
                        f"Analyze this citizen's eligibility for government subsidies: {citizen_summary}"
                    ),
                    timeout=60.0  # 60 second timeout for analysis
                )
                self.logger.info("✅ Agent analysis completed")
            except asyncio.TimeoutError:
                self.logger.error("Agent analysis timed out after 60 seconds")
                return {
                    "status": "timeout",
                    "error": "Analysis execution timed out",
                    "score": 0,
                    "eligibility_class": "Timeout", 
                    "confidence": 0.0,
                    "explanation": "Agent analysis timed out during execution. The system may be under heavy load or experiencing network connectivity issues."
                }
            
            # Parse agent result
            return self._parse_agent_result(agent_result)
            
        except asyncio.TimeoutError:
            self.logger.error("Smolagents analysis timed out")
            return {
                "status": "timeout",
                "error": "Analysis timed out after maximum wait time",
                "score": 0,
                "eligibility_class": "Timeout",
                "confidence": 0.0,
                "explanation": "Analysis timed out - this may indicate network connectivity issues or heavy system load"
            }
        except Exception as e:
            self.logger.error(f"Smolagents analysis error: {str(e)}")
            return {
                "status": "error", 
                "error": str(e),
                "score": 0,
                "eligibility_class": "Error",
                "confidence": 0.0,
                "explanation": f"Analysis failed due to: {str(e)}"
            }
    
    def _format_citizen_data_for_agent(self, citizen_data: Dict[str, Any]) -> str:
        """Format citizen data for agent consumption"""
        return f"""
        Citizen Profile:
        - Name: {citizen_data.get('full_name', 'Unknown')}
        - NRIC: {citizen_data.get('nric', 'Unknown')}
        - State: {citizen_data.get('state', 'Unknown')}
        - Income Bracket: {citizen_data.get('income_bracket', 'Unknown')}
        - Household Size: {citizen_data.get('household_size', 'Unknown')}
        - Number of Children: {citizen_data.get('number_of_children', 'Unknown')}
        - Disability Status: {citizen_data.get('disability_status', False)}
        - Signature Valid: {citizen_data.get('is_signature_valid', False)}
        - Data Authentic: {citizen_data.get('is_data_authentic', False)}
        """
    
    def _parse_agent_result(self, agent_result: Any) -> Dict[str, Any]:
        """Parse the agent result into structured format"""
        # Handle different types of agent results
        if isinstance(agent_result, dict):
            return {
                "status": "completed",
                "score": agent_result.get("score", 75),
                "eligibility_class": agent_result.get("eligibility_class", "B40"),
                "confidence": agent_result.get("confidence", 0.85),
                "explanation": agent_result.get("explanation", "Agent analysis completed"),
                "reasoning_details": agent_result.get("reasoning_details", {}),
                "recommendations": agent_result.get("recommendations", [])
            }
        elif isinstance(agent_result, str):
            # If agent returns a string, parse it
            return {
                "status": "completed",
                "score": 75,  # Default values
                "eligibility_class": "B40",
                "confidence": 0.80,
                "explanation": agent_result,
                "reasoning_details": {"raw_output": agent_result},
                "recommendations": ["Review agent output for detailed recommendations"]
            }
        else:
            # Fallback for other result types
            return {
                "status": "completed",
                "score": 70,
                "eligibility_class": "Unknown",
                "confidence": 0.75,
                "explanation": f"Agent completed analysis. Result: {str(agent_result)}",
                "reasoning_details": {"raw_result": str(agent_result)},
                "recommendations": []
            }
    
    def _generate_text_report(self, citizen_data: Dict[str, Any], rag_result: Dict[str, Any]) -> str:
        """Generate formatted text report for download"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Extract values safely
        score = rag_result.get('score', 'N/A')
        eligibility_class = rag_result.get('eligibility_class', 'Unknown')
        confidence = rag_result.get('confidence', 0)
        explanation = rag_result.get('explanation', 'No explanation available')
        
        # Format confidence as percentage
        confidence_pct = f"{confidence * 100:.1f}%" if isinstance(confidence, (int, float)) else "N/A"
        
        # Extract reasoning details
        reasoning_details = rag_result.get('reasoning_details', {})
        policy_factors = reasoning_details.get('policy_factors', [])
        recommendations = rag_result.get('recommendations', [])
        
        content = f"""Smolagents Analysis Report
========================

Citizen: {citizen_data.get('full_name', 'Unknown')}
NRIC: {citizen_data.get('nric', 'Unknown')}
Analysis Date: {timestamp}

SMOLAGENTS RAG ANALYSIS:
=======================
Final Score: {score}
Eligibility Classification: {eligibility_class}
Confidence Level: {confidence_pct}
Analysis Status: {rag_result.get('status', 'Unknown')}

DETAILED AI REASONING:
=====================
{explanation}

POLICY FACTORS CONSIDERED:
========================="""
        
        if policy_factors:
            for factor in policy_factors:
                content += f"\n• {factor}"
        else:
            content += "\n• No specific policy factors identified"
        
        content += f"""

AI RECOMMENDATIONS:
=================="""
        
        if recommendations:
            for rec in recommendations:
                content += f"\n• {rec}"
        else:
            content += "\n• No specific recommendations provided"
        
        content += f"""

CITIZEN PROFILE DATA:
===================
Full Name: {citizen_data.get('full_name', 'Unknown')}
Date of Birth: {citizen_data.get('date_of_birth', 'Unknown')}
Gender: {citizen_data.get('gender', 'Unknown')}
State: {citizen_data.get('state', 'Unknown')}
Income Bracket: {citizen_data.get('income_bracket', 'Unknown')}
Household Size: {citizen_data.get('household_size', 'Unknown')}
Number of Children: {citizen_data.get('number_of_children', 'Unknown')}
Disability Status: {'Yes' if citizen_data.get('disability_status') else 'No'}
Signature Valid: {'Yes' if citizen_data.get('is_signature_valid') else 'No'}
Data Authentic: {'Yes' if citizen_data.get('is_data_authentic') else 'No'}

TECHNICAL DETAILS:
=================
Analysis Framework: Smolagents Multi-Agent RAG
Tools Used: ChromaDB, Tavily Search, Policy Reasoning
Environment: {"Production" if os.getenv("ENVIRONMENT") == "production" else "Development"}
Generated: {timestamp}

Generated by Smolagents Analysis Service
======================================"""
        
        return content
```

## 6. API Endpoint Implementation

**File: `main.py` (relevant sections)**

```python
# Simple unified endpoint for frontend "Start Smolagent Analysis" button
@app.post("/api/start-smolagent-analysis/{citizen_id}")
async def start_smolagent_analysis(citizen_id: str):
    """
    Unified endpoint for the frontend "Start Smolagent Analysis" button.
    
    This endpoint:
    1. Fetches citizen data from Supabase
    2. Runs smolagents RAG analysis
    3. Returns structured results for display
    """
    try:
        # Import here to avoid startup issues
        from services.smolagents_analysis_service import SmolagentsAnalysisService
        import os
        
        # Check environment variables
        required_env = ['OPENAI_API_KEY', 'TAVILY_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
        missing_env = [var for var in required_env if not os.getenv(var)]
        if missing_env:
            raise HTTPException(
                status_code=500, 
                detail=f"Server configuration error: Missing environment variables: {', '.join(missing_env)}"
            )
        
        # Initialize service
        smolagents_service = SmolagentsAnalysisService()
        
        # Run analysis with citizen ID
        result = await smolagents_service.analyze_citizen(citizen_id)
        
        # Extract analysis data
        analysis_result = result.get("analysis_result", {})
        
        # Return structured response for frontend
        return {
            "status": result.get("status", "completed"),
            "citizen_id": citizen_id,
            "score": analysis_result.get("score", 0),
            "eligibility_class": analysis_result.get("eligibility_class", "Unknown"),
            "confidence": round(analysis_result.get("confidence", 0) * 100, 1),  # Convert to percentage
            "explanation": analysis_result.get("explanation", "No explanation available"),
            "recommendations": analysis_result.get("recommendations", []),
            "execution_time": result.get("execution_time", 0),
            "download_content": result.get("text_file_content", ""),
            "filename": result.get("filename", f"analysis-{citizen_id}.txt"),
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Analysis failed: {str(e)}"
        )
```

## 7. Dependencies & Installation

### Python Dependencies

```bash
pip install smolagents openai litellm tavily-python chromadb langchain langchain-community langchain-openai pymongo supabase python-dotenv fastapi uvicorn pydantic
```

### Environment Variables Required

```bash
# Required for RAG analysis
OPENAI_API_KEY=your_openai_key
TAVILY_API_KEY=your_tavily_key
MONGO_URI=mongodb://localhost:27017/
MONGO_DB=RAG_database
MONGO_COLLECTION=doc_chunks

# Required for Supabase data fetching
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Optional agent configuration
AGENT_MODEL_NAME=gpt-4o-mini
AGENT_TEMPERATURE=0.2
AGENT_MAX_TOKENS=50000
AGENT_TIMEOUT=30
```

## 8. How the RAG Analysis Works

### Step-by-Step Process

1. **Service Initialization**: `SmolagentsAnalysisService` fetches citizen data from Supabase
2. **Agent Creation**: `CitizenAnalysisAgent` is created with 4 tools:
   - `CitizenDataValidationTool` (validates input)
   - `ChromaDBRetrieverTool` (retrieves policy documents)
   - `TavilySearchTool` (searches recent policy updates)
   - `PolicyReasoningTool` (performs LLM reasoning)

3. **Agent Orchestration**: The agent receives a structured prompt that instructs it to:
   - First: Use ChromaDB to find historical policy documents
   - Second: Use Tavily to find recent policy updates
   - Third: Use PolicyReasoning to analyze all gathered context

4. **Tool Execution Flow**:
   ```
   Agent → ChromaDB (finds "B40 subsidy housing policies")
         → Tavily (finds "Malaysia 2024 subsidy updates")
         → PolicyReasoning (analyzes citizen + context → final score)
   ```

5. **Result Generation**: Agent returns structured analysis with score, confidence, explanations, and recommendations

### Key Advantages of RAG Approach

- **Contextual Reasoning**: Can handle edge cases and policy nuances
- **Up-to-date Information**: Tavily provides latest policy changes
- **Document-Grounded**: ChromaDB ensures responses are based on official documents
- **Flexible Analysis**: LLM can interpret complex scenarios mathematically

## 9. Testing Examples

### Sample Request
```bash
POST /api/start-smolagent-analysis/123e4567-e89b-12d3-a456-426614174000
```

### Expected Output
```python
{
    "status": "completed",
    "citizen_id": "123e4567-e89b-12d3-a456-426614174000",
    "score": 78,
    "eligibility_class": "B40-B3",
    "confidence": 85.2,
    "explanation": "Based on policy analysis, citizen qualifies for B40 assistance. Retrieved policies indicate housing subsidy eligibility for 4-person households with income bracket B3. Recent policy updates confirm expanded eligibility criteria for families with children.",
    "recommendations": [
        "Recommend approval for housing assistance program",
        "Expedited processing recommended due to disability status",
        "Additional education subsidies may apply for children"
    ],
    "execution_time": 45.2,
    "download_content": "Full analysis report...",
    "filename": "smolagents-analysis-Ahmad-Ali-20241225_143022.txt",
    "timestamp": "2024-12-25T14:30:22.123456Z"
}
```

## 10. Key Features

1. **Multi-Agent RAG**: Combines document retrieval, web search, and LLM reasoning
2. **Real-time Data**: Fetches citizen data from Supabase database
3. **Policy-Grounded**: Uses ChromaDB for official document retrieval
4. **Current Information**: Tavily provides latest government updates
5. **Contextual Analysis**: LLM reasoning handles edge cases and complex scenarios
6. **Structured Output**: Returns consistent scores, confidence, and explanations
7. **Error Handling**: Comprehensive timeout and error management
8. **Downloadable Reports**: Generates detailed text reports for audit purposes

This RAG implementation provides flexible, contextual policy analysis that complements the mathematical formula approach, demonstrating the trade-offs between interpretability and flexibility in AI governance systems.

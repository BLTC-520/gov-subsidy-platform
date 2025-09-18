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
    
    def get_search_config(self) -> Dict[str, Any]:
        """Get current search configuration"""
        return {
            "country_filter": self.country_filter,
            "min_relevance": self.min_relevance,
            "max_results": self.default_max_results,
            "focus": "malaysian_government_policies",
            "trusted_domains": [
                "gov.my", "mof.gov.my", "treasury.gov.my", "bnm.gov.my"
            ]
        }
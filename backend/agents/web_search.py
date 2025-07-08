from langchain.agents import Agent
from langchain.tools import Tool
from ddgs import DDGS
from typing import List, Dict, Any
import logging
from config.settings import settings

logger = logging.getLogger(__name__)

class WebSearchAgent:
    def __init__(self):
        self.ddgs = DDGS()
        self.max_results = settings.duckduckgo_max_results
        self.region = settings.duckduckgo_region
    
    def search_malaysian_subsidy_info(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for Malaysian subsidy information using DuckDuckGo.
        
        Args:
            query: Search query string
            
        Returns:
            List of search results with title, snippet, and URL
        """
        try:
            # Add Malaysian context to search query
            enhanced_query = f"{query} Malaysia subsidy government assistance"
            
            results = self.ddgs.text(
                keywords=enhanced_query,
                region=self.region,
                max_results=self.max_results,
                backend="api"
            )
            
            processed_results = []
            for result in results:
                processed_results.append({
                    "title": result.get("title", ""),
                    "snippet": result.get("body", ""),
                    "url": result.get("href", ""),
                    "source": "duckduckgo"
                })
            
            logger.info(f"Found {len(processed_results)} search results for query: {query}")
            return processed_results
            
        except Exception as e:
            logger.error(f"Error during web search: {str(e)}")
            return []
    
    def search_income_thresholds(self) -> List[Dict[str, Any]]:
        """Search for current Malaysian income thresholds and poverty line data."""
        queries = [
            "Malaysia household income B40 M40 T20 2024 classification RM",
            "Malaysia absolute poverty line threshold 2024 Department Statistics",
            "Bantuan Keluarga Malaysia BKM eligibility income criteria 2024",
            "Sumbangan Tunai Rahmah STR income threshold Malaysia 2024",
            "Malaysia median household income 2024 DOSM statistics"
        ]
        
        all_results = []
        for query in queries:
            results = self.search_malaysian_subsidy_info(query)
            all_results.extend(results)
        
        return all_results
    
    def search_state_specific_programs(self, state: str) -> List[Dict[str, Any]]:
        """Search for state-specific subsidy programs."""
        if not state:
            return []
        
        query = f"{state} state government subsidy program assistance"
        return self.search_malaysian_subsidy_info(query)
    
    def search_disability_benefits(self) -> List[Dict[str, Any]]:
        """Search for disability-related subsidy information."""
        query = "Malaysia OKU disability subsidy benefits assistance"
        return self.search_malaysian_subsidy_info(query)
    
    def get_comprehensive_context(self, citizen_profile: Dict[str, Any]) -> str:
        """
        Get comprehensive web search context for a citizen profile.
        
        Args:
            citizen_profile: Dictionary containing citizen profile data
            
        Returns:
            Formatted string with web search context
        """
        context_parts = []
        
        # General income threshold search
        income_results = self.search_income_thresholds()
        if income_results:
            context_parts.append("=== INCOME THRESHOLD INFORMATION ===")
            for result in income_results[:3]:  # Top 3 results
                context_parts.append(f"Source: {result['title']}")
                context_parts.append(f"Content: {result['snippet']}")
                context_parts.append(f"URL: {result['url']}")
                context_parts.append("")
        
        # State-specific search
        state = citizen_profile.get("state")
        if state:
            state_results = self.search_state_specific_programs(state)
            if state_results:
                context_parts.append(f"=== {state.upper()} STATE PROGRAMS ===")
                for result in state_results[:2]:  # Top 2 results
                    context_parts.append(f"Source: {result['title']}")
                    context_parts.append(f"Content: {result['snippet']}")
                    context_parts.append("")
        
        # Disability benefits search
        if citizen_profile.get("disability_status"):
            disability_results = self.search_disability_benefits()
            if disability_results:
                context_parts.append("=== DISABILITY BENEFITS INFORMATION ===")
                for result in disability_results[:2]:  # Top 2 results
                    context_parts.append(f"Source: {result['title']}")
                    context_parts.append(f"Content: {result['snippet']}")
                    context_parts.append("")
        
        return "\n".join(context_parts) if context_parts else "No relevant web search results found."

# Create tool for LangGraph integration
def create_web_search_tool():
    """Create a web search tool for LangGraph agents."""
    agent = WebSearchAgent()
    
    def search_tool(query: str) -> str:
        """Web search tool for LangGraph agents."""
        results = agent.search_malaysian_subsidy_info(query)
        if not results:
            return "No search results found."
        
        formatted_results = []
        for result in results[:5]:  # Top 5 results
            formatted_results.append(f"Title: {result['title']}")
            formatted_results.append(f"Content: {result['snippet']}")
            formatted_results.append(f"URL: {result['url']}")
            formatted_results.append("---")
        
        return "\n".join(formatted_results)
    
    return Tool(
        name="web_search",
        description="Search for Malaysian subsidy and government assistance information",
        func=search_tool
    )
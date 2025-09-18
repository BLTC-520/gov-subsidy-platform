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
            max_tokens=int(os.getenv("AGENT_MAX_TOKENS", "8000")),  # Reduced from 50000 to 8000
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
        tools: Optional[List[Tool]] = None,
        step_callbacks: Optional[List[Callable]] = None
    ):
        """
        Initialize the CitizenAnalysisAgent.
        
        Args:
            config: Agent configuration (uses environment defaults if None)
            tools: List of tools to make available to the agent
            step_callbacks: List of callback functions for step monitoring
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
        
        # Initialize parent CodeAgent with tools as list
        super().__init__(
            tools=agent_tools,
            model=model,
            planning_interval=5,
            stream_outputs=False
        )
        
        # Debug the result
        print(f"After init - tools type: {type(self.tools)}")
        if hasattr(self, 'tools'):
            if isinstance(self.tools, dict):
                print(f"Tools dict keys: {list(self.tools.keys())}")
                for key, value in self.tools.items():
                    print(f"  {key}: {type(value)}")
            elif isinstance(self.tools, list):
                print(f"Tools list length: {len(self.tools)}")
                for i, tool in enumerate(self.tools):
                    print(f"  Tool {i}: {type(tool)} - {getattr(tool, 'name', 'no name')}")
            else:
                print(f"Tools content: {self.tools}")
        
        # Store step callbacks for future plan review implementation
        self.step_callbacks = step_callbacks or []
        
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
            
            # Run the agent analysis
            result = super().run(analysis_prompt, reset=reset)
            
            # Format and return results
            return {
                "status": "completed",
                "analysis_id": f"analysis_{self.analysis_count}_{int(datetime.now().timestamp())}",
                "citizen_id": citizen_data.get("citizen_id", "unknown"),
                "raw_result": result,
                "processed_at": datetime.now().isoformat(),
                "model_used": self.config.model_name,
                "tools_used": [tool.__class__.__name__ for tool in self.tools]
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "analysis_id": f"error_{self.analysis_count}_{int(datetime.now().timestamp())}",
                "processed_at": datetime.now().isoformat()
            }
    
    def _prepare_analysis_prompt(self, citizen_data: Dict[str, Any], query: str) -> str:
        """
        Prepare the analysis prompt for the LLM.
        
        Args:
            citizen_data: Citizen information dictionary
            query: Analysis query
            
        Returns:
            Formatted prompt string
        """
        # Basic prompt template - will be enhanced in later phases
        prompt_template = f"""
You are an expert analyst for government subsidy eligibility assessment.

CITIZEN DATA:
{self._format_citizen_data(citizen_data)}

ANALYSIS REQUEST:
{query}

Please analyze the citizen's eligibility based on the provided data. Consider:
1. Income levels and financial need
2. Demographic factors
3. Geographic location
4. Family composition
5. Any special circumstances

Provide a comprehensive analysis with reasoning and recommendations.
"""
        return prompt_template.strip()
    
    def _format_citizen_data(self, citizen_data: Dict[str, Any]) -> str:
        """
        Format citizen data for prompt inclusion.
        
        Args:
            citizen_data: Raw citizen data dictionary
            
        Returns:
            Formatted string representation
        """
        formatted_lines = []
        for key, value in citizen_data.items():
            formatted_lines.append(f"- {key.replace('_', ' ').title()}: {value}")
        
        return "\n".join(formatted_lines)
    
    def get_agent_info(self) -> Dict[str, Any]:
        """
        Get information about the agent's current state.
        
        Returns:
            Dictionary with agent metadata and statistics
        """
        return {
            "agent_type": "CitizenAnalysisAgent",
            "model_name": self.config.model_name,
            "created_at": self.created_at.isoformat(),
            "analysis_count": self.analysis_count,
            "tools_count": len(self.tools),
            "tool_names": [tool.__class__.__name__ for tool in self.tools],
            "config": {
                "temperature": self.config.temperature,
                "max_tokens": self.config.max_tokens,
                "timeout": self.config.timeout
            }
        }
    
    def test_configuration(self) -> Dict[str, Any]:
        """
        Test the agent configuration and model connectivity.
        
        Returns:
            Dictionary with test results
        """
        try:
            # Test basic LLM connectivity using proper LiteLLMModel message format
            test_messages = [
                {"role": "user", "content": [{"type": "text", "text": "Hello, please respond with 'Configuration test successful'"}]}
            ]
            
            test_response = self.model(test_messages)
            
            return {
                "status": "success",
                "message": "Agent configuration test successful",
                "model_response": str(test_response),
                "model_name": self.config.model_name,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": "Agent configuration test failed",
                "error": str(e),
                "error_type": type(e).__name__,
                "timestamp": datetime.now().isoformat()
            }
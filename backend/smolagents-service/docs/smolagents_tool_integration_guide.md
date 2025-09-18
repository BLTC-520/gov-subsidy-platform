# smolagents Tool Integration Guide

## Overview
This guide documents the correct way to integrate custom tools with smolagents CodeAgent, based on solving real integration issues encountered during Phase 2.2 development.

## The Problem: Tool String Conversion
When tools are passed incorrectly to smolagents CodeAgent, they get converted to strings instead of remaining as functional tool objects.

### Symptoms:
```bash
Agent tools: 2
Tool 0: str - no name
Tool 1: str - no name
```

### Root Cause:
Tools not being recognized as proper `BaseTool` instances by smolagents internal validation.

## The Solution: Proper Tool Integration Pattern

### 1. Tool Class Implementation
Your custom tool MUST:

```python
from smolagents import Tool

class CustomTool(Tool):
    # Class attributes (NOT properties)
    name = "tool_name"                    # String literal
    description = "Tool description"      # String literal  
    output_type = "object"               # Must be in AUTHORIZED_TYPES
    
    inputs = {
        "param1": {
            "type": "object", 
            "description": "Parameter description"
        },
        "param2": {
            "type": "string",
            "description": "Another parameter",
            "nullable": True  # For optional parameters
        }
    }
    
    def __init__(self, **kwargs):
        super().__init__()  # ⚠️ CRITICAL: Must call super().__init__()
        # Your initialization code here
    
    def forward(self, param1, param2=None):
        # Your tool logic here
        return {"result": "success"}
```

### 2. Agent Integration Pattern

```python
from smolagents import CodeAgent, LiteLLMModel
from smolagents.agents import BaseTool

class CustomAgent(CodeAgent):
    def __init__(self, tools=None, **kwargs):
        # Step 1: Create your custom tools
        custom_tools = []
        
        try:
            # Import and create tool
            from path.to.your_tool import CustomTool
            tool = CustomTool()
            
            # Step 2: Validate tool is BaseTool instance
            if isinstance(tool, BaseTool):
                custom_tools.append(tool)
                print(f"✓ Added tool: {tool.name}")
            else:
                print(f"⚠️ Tool is not BaseTool: {type(tool)}")
                
        except Exception as e:
            print(f"Could not create tool: {e}")
        
        # Step 3: Combine with user-provided tools
        agent_tools = []
        if tools:
            for tool in tools:
                if isinstance(tool, BaseTool):
                    agent_tools.append(tool)
        
        agent_tools.extend(custom_tools)
        
        # Step 4: Initialize parent with tools as LIST
        super().__init__(
            tools=agent_tools,  # List of BaseTool instances
            model=LiteLLMModel(...),
            **kwargs
        )
```

## Key Requirements Checklist

### ✅ Tool Class Requirements:
- [ ] Inherits from `smolagents.Tool`
- [ ] Has `name` as class attribute (string)
- [ ] Has `description` as class attribute (string) 
- [ ] Has `output_type` as class attribute (valid type)
- [ ] Has `inputs` as class attribute (dict with proper schema)
- [ ] Calls `super().__init__()` in constructor
- [ ] Implements `forward()` method

### ✅ Integration Requirements:
- [ ] Import `BaseTool` from `smolagents.agents`
- [ ] Validate tool with `isinstance(tool, BaseTool)`
- [ ] Pass tools as **list** to CodeAgent (not dict)
- [ ] Handle import errors gracefully

## Common Pitfalls and Solutions

### Pitfall 1: Missing super().__init__()
```python
# ❌ WRONG
def __init__(self):
    self.my_attr = "value"

# ✅ CORRECT  
def __init__(self):
    super().__init__()  # Must be first!
    self.my_attr = "value"
```

### Pitfall 2: Properties instead of class attributes
```python
# ❌ WRONG
@property
def name(self):
    return "tool_name"

# ✅ CORRECT
name = "tool_name"
```

### Pitfall 3: Invalid output_type
```python
# Check valid types
from smolagents.tools import AUTHORIZED_TYPES
print(AUTHORIZED_TYPES)
# ['string', 'boolean', 'integer', 'number', 'image', 'audio', 'array', 'object', 'any', 'null']

# ❌ WRONG
output_type = "dict"

# ✅ CORRECT
output_type = "object"
```

### Pitfall 4: Wrong tool format in agent
```python
# ❌ WRONG - Passing dict
super().__init__(tools={"tool_name": tool})

# ❌ WRONG - Passing strings
super().__init__(tools=["tool_name"])

# ✅ CORRECT - Passing list of BaseTool instances
super().__init__(tools=[tool_instance])
```

## Debugging Tool Integration Issues

### Debug Script Template:
```python
def debug_tool_integration():
    """Debug tool integration step by step"""
    
    # Step 1: Test tool creation
    try:
        from your_module import YourTool
        tool = YourTool()
        print(f"✓ Tool created: {type(tool)}")
        print(f"✓ Tool name: {getattr(tool, 'name', 'MISSING')}")
    except Exception as e:
        print(f"❌ Tool creation failed: {e}")
        return
    
    # Step 2: Test BaseTool inheritance
    from smolagents.agents import BaseTool
    if isinstance(tool, BaseTool):
        print("✓ Tool is BaseTool instance")
    else:
        print(f"❌ Tool is not BaseTool: {type(tool).__mro__}")
        return
    
    # Step 3: Test agent integration
    from smolagents import CodeAgent, LiteLLMModel
    try:
        agent = CodeAgent(
            tools=[tool],
            model=LiteLLMModel(model_id="gpt-4o-mini")
        )
        print(f"✓ Agent created with tools: {type(agent.tools)}")
        
        if isinstance(agent.tools, dict):
            print(f"✓ Tools dict keys: {list(agent.tools.keys())}")
            for key, value in agent.tools.items():
                print(f"  {key}: {type(value)}")
                
    except Exception as e:
        print(f"❌ Agent integration failed: {e}")

# Run the debug
debug_tool_integration()
```

## Working Example: CitizenDataValidationTool

This is the complete working example from Phase 2.2:

### Tool Implementation:
```python
from smolagents import Tool
from smolagents.agents import BaseTool

class CitizenDataValidationTool(Tool):
    name = "citizen_data_validator"
    description = "Validates citizen data format, completeness, and eligibility"
    output_type = "object"
    
    inputs = {
        "citizen_data": {
            "type": "object", 
            "description": "Citizen data for validation"
        },
        "validation_type": {
            "type": "string", 
            "description": "Type of validation to perform",
            "nullable": True
        }
    }
    
    def __init__(self, enable_audit_logging=True):
        super().__init__()  # Essential!
        self.enable_audit_logging = enable_audit_logging
    
    def forward(self, citizen_data, validation_type="all"):
        # Tool implementation here
        return {
            "overall_valid": True,
            "confidence_score": 0.95,
            "validation_details": {...}
        }
```

### Agent Integration:
```python
from smolagents import CodeAgent, LiteLLMModel  
from smolagents.agents import BaseTool

class CitizenAnalysisAgent(CodeAgent):
    def __init__(self, tools=None, **kwargs):
        # Create validation tool
        validation_tool = None
        try:
            from tools.citizen_data_validation_tool import CitizenDataValidationTool
            validation_tool = CitizenDataValidationTool()
            print(f"✓ Tool created: {validation_tool.name}")
        except Exception as e:
            print(f"Tool creation failed: {e}")
        
        # Prepare agent tools list
        agent_tools = []
        
        # Add user tools
        if tools:
            for tool in tools:
                if isinstance(tool, BaseTool):
                    agent_tools.append(tool)
        
        # Add validation tool
        if validation_tool and isinstance(validation_tool, BaseTool):
            agent_tools.append(validation_tool)
            print(f"✓ Added validation tool: {validation_tool.name}")
        
        # Initialize parent
        super().__init__(
            tools=agent_tools,
            model=LiteLLMModel(model_id="gpt-4o-mini"),
            **kwargs
        )
```

### Verification Results:
```bash
✓ Tool created: citizen_data_validator  
✓ Added validation tool: citizen_data_validator
After init - tools type: <class 'dict'>
Tools dict keys: ['citizen_data_validator', 'final_answer']
  citizen_data_validator: <class 'tools.citizen_data_validation_tool.CitizenDataValidationTool'>
  final_answer: <class 'smolagents.default_tools.FinalAnswerTool'>
```

## Environment Setup Notes

### Required Imports:
```python
from smolagents import Tool, CodeAgent, LiteLLMModel
from smolagents.agents import BaseTool
```

### Virtual Environment:
Always activate the virtual environment before testing:
```bash
source venv/bin/activate
python your_test.py
```

## Summary of Best Practices

1. **Always inherit from `smolagents.Tool`**
2. **Always call `super().__init__()` first in constructor**
3. **Use class attributes, not properties, for tool metadata**
4. **Validate tools with `isinstance(tool, BaseTool)`**
5. **Pass tools as list to CodeAgent constructor**
6. **Handle import and creation errors gracefully**
7. **Use proper output_type from AUTHORIZED_TYPES**
8. **Set nullable=True for optional parameters**
9. **Test tool creation and integration separately**
10. **Use debug scripts to identify issues step by step**

---

**This guide was created based on solving real integration issues in Phase 2.2. Following these patterns will ensure smooth tool integration with smolagents.**
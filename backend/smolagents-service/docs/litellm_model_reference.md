# LiteLLMModel Configuration Reference

This document serves as the definitive reference for configuring LiteLLMModel in all agents within this project.

## Basic Usage Pattern

```python
from smolagents import LiteLLMModel

# Standard message format for LiteLLMModel
messages = [
  {"role": "user", "content": [{"type": "text", "text": "Hello, how are you?"}]}
]

# Model initialization with configuration
model = LiteLLMModel(
    model_id="anthropic/claude-3-5-sonnet-latest", 
    temperature=0.2, 
    max_tokens=10, 
    requests_per_minute=60
)

# Usage
response = model(messages)
```

## Constructor Parameters

### Required Parameters
- `model_id` (str) — The model identifier to use on the server (e.g. "gpt-3.5-turbo", "anthropic/claude-3-5-sonnet-latest")

### Optional Parameters
- `api_base` (str, optional) — The base URL of the provider API to call the model
- `api_key` (str, optional) — The API key to use for authentication
- `custom_role_conversions` (dict[str, str], optional) — Custom role conversion mapping to convert message roles in others. Useful for specific models that do not support specific message roles like "system"
- `flatten_messages_as_text` (bool, optional) — Whether to flatten messages as text. Defaults to True for models that start with "ollama", "groq", "cerebras"
- `**kwargs` — Additional keyword arguments to pass to the OpenAI API

### Common Configuration Parameters (via kwargs)
- `temperature` (float) — Controls randomness (0.0 to 2.0)
- `max_tokens` (int) — Maximum tokens in response
- `requests_per_minute` (int) — Rate limiting
- `top_p` (float) — Nucleus sampling parameter
- `frequency_penalty` (float) — Penalize frequent tokens
- `presence_penalty` (float) — Penalize repeated topics

## Message Format Requirements

**IMPORTANT**: LiteLLMModel requires messages in this specific format:

```python
messages = [
    {
        "role": "system", 
        "content": [{"type": "text", "text": "You are a helpful assistant"}]
    },
    {
        "role": "user", 
        "content": [{"type": "text", "text": "Your user message here"}]
    }
]
```

**NOT** the simplified format:
```python
# ❌ WRONG - This format is NOT supported by LiteLLMModel
messages = [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Your user message here"}
]
```

## Standard Configuration Patterns for This Project

### Default Development Configuration
```python
model = LiteLLMModel(
    model_id="gpt-4o-mini",
    temperature=0.1,
    max_tokens=2000,
    requests_per_minute=60
)
```

### Production Configuration
```python
model = LiteLLMModel(
    model_id=os.getenv("AGENT_MODEL_NAME", "gpt-4o-mini"),
    temperature=float(os.getenv("AGENT_TEMPERATURE", "0.1")),
    max_tokens=int(os.getenv("AGENT_MAX_TOKENS", "2000")),
    requests_per_minute=int(os.getenv("AGENT_RATE_LIMIT", "60")),
    api_key=os.getenv("OPENAI_API_KEY")
)
```

### Available Model IDs
- `"gpt-4o-mini"` - OpenAI GPT-4o Mini (default for development)
- `"gpt-4o"` - OpenAI GPT-4o
- `"gpt-3.5-turbo"` - OpenAI GPT-3.5 Turbo
- `"anthropic/claude-3-5-sonnet-latest"` - Anthropic Claude 3.5 Sonnet
- `"anthropic/claude-3-haiku-20240307"` - Anthropic Claude 3 Haiku

## Environment Variables

Always use these environment variable names for consistency:

```bash
AGENT_MODEL_NAME=gpt-4o-mini
AGENT_TEMPERATURE=0.1
AGENT_MAX_TOKENS=2000
AGENT_RATE_LIMIT=60
AGENT_TIMEOUT=30
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1  # if needed
```

## Best Practices

1. **Always use environment-based configuration** for production deployments
2. **Set reasonable rate limits** to avoid API quota issues
3. **Use low temperature (0.1-0.3)** for analytical tasks
4. **Set appropriate max_tokens** based on expected output length
5. **Always include error handling** for API failures
6. **Test configuration** before deployment

## Error Handling Pattern

```python
try:
    model = LiteLLMModel(
        model_id=config.model_name,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        api_key=config.api_key
    )
    
    response = model(messages)
    return {"status": "success", "response": response}
    
except Exception as e:
    return {
        "status": "error", 
        "error": str(e),
        "error_type": type(e).__name__
    }
```

## Testing Configuration

```python
def test_model_configuration(model: LiteLLMModel) -> dict:
    """Test if model configuration is working"""
    test_messages = [
        {"role": "user", "content": [{"type": "text", "text": "Hello, respond with 'Test successful'"}]}
    ]
    
    try:
        response = model(test_messages)
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "error": str(e)}
```

---

**Note**: Always refer to this document when implementing any new agent that uses LiteLLMModel to ensure consistency across the project.
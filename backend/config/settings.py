from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Google Gemini API
    google_api_key: str
    
    # Supabase Configuration
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str
    
    # Document Processing Configuration
    document_cache_size: int = 100
    
    # FastAPI Configuration
    port: int = 8000
    host: str = "0.0.0.0"
    debug: bool = True
    
    # DuckDuckGo Search Configuration
    duckduckgo_max_results: int = 10
    duckduckgo_region: str = "my-ms"
    
    # Malaysian Subsidy Scoring Configuration
    base_income_threshold: float = 3000.0
    family_size_multiplier: float = 500.0
    disability_bonus: float = 1000.0
    state_adjustment_factor: float = 0.1
    
    # Malaysian Government API
    malaysian_api_token: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
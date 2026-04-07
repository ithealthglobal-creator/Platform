from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    google_api_key: str
    supabase_url: str
    supabase_service_role_key: str
    supabase_db_url: str
    environment: str = "local"
    max_delegation_depth: int = 4
    max_tool_calls_per_run: int = 50
    max_tokens_per_turn: int = 32000
    recursion_limit: int = 25

    class Config:
        env_file = ".env"

settings = Settings()

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    timestamp: Optional[datetime] = None


class AIChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural language question about attendance, metrics, or policies")
    conversation_history: Optional[List[ChatMessage]] = Field(default_factory=list)


class AIChatResponse(BaseModel):
    answer: str
    sources: List[str] = Field(default_factory=list)
    intent: Optional[str] = None
    query_data: Optional[Dict[str, Any]] = None
    success: bool = True


class AIIndexResponse(BaseModel):
    success: bool
    documents_indexed: int
    message: str

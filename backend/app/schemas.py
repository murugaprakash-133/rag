from datetime import datetime
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    filename: str
    upload_time: str | datetime
    total_pages: int
    total_chunks: int


class AskRequest(BaseModel):
    document_id: str
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list[dict]


class IndexResponse(BaseModel):
    message: str
    document_id: str
    total_pages: int
    total_chunks: int


class InfoResponse(BaseModel):
    indexed: bool
    total_pages: int
    total_chunks: int


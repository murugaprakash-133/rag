from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import get_settings
from .rag_service import RagService
from .schemas import AskRequest, AskResponse, IndexResponse, InfoResponse, DocumentResponse


settings = get_settings()
service = RagService(settings=settings, data_dir=Path("storage"))

app = FastAPI(title="PDF RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/info", response_model=InfoResponse)
def info() -> dict:
    return service.info()


@app.get("/api/documents", response_model=list[DocumentResponse])
def list_documents() -> list[dict]:
    return service.list_documents()


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str) -> dict:
    deleted = service.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document deleted successfully."}


@app.post("/api/index-pdf", response_model=IndexResponse)
async def index_pdf(file: UploadFile = File(...)) -> dict:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()
    try:
        return service.index_pdf(content, file_name=file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/ask", response_model=AskResponse)
def ask(req: AskRequest) -> dict:
    try:
        return service.ask(req.document_id, req.question)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/ask-stream")
def ask_stream(req: AskRequest) -> StreamingResponse:
    try:
        generator = service.ask_stream(req.document_id, req.question)
        return StreamingResponse(generator, media_type="text/event-stream")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


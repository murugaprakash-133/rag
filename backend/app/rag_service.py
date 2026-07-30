from __future__ import annotations

import io
import json
import os
import uuid
from pathlib import Path

import faiss
import numpy as np
import PyPDF2
from openai import OpenAI

from .config import Settings
from . import database


class RagService:
    def __init__(self, settings: Settings, data_dir: Path) -> None:
        self.settings = settings
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        # Initialize SQLite database schema
        database.init_db(self.settings.db_path)

    def _client(self) -> OpenAI:
        if not self.settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is missing. Configure it in your environment.")

        kwargs = {"api_key": self.settings.openai_api_key}
        if self.settings.openai_base_url:
            kwargs["base_url"] = self.settings.openai_base_url
        return OpenAI(**kwargs)

    def _extract_text(self, pdf_bytes: bytes) -> tuple[str, list[dict], int]:
        reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        page_records: list[dict] = []
        full_text_parts: list[str] = []
        cursor = 0

        for page_idx, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            if not text:
                continue
            start = cursor
            full_text_parts.append(text + "\n")
            cursor += len(text) + 1
            page_records.append({"page": page_idx, "start": start, "end": cursor})

        full_text = "".join(full_text_parts)
        return full_text, page_records, len(reader.pages)

    def _chunk_text(self, text: str, pages: list[dict]) -> tuple[list[str], list[dict]]:
        size = self.settings.chunk_size
        overlap = self.settings.chunk_overlap
        step = max(size - overlap, 1)

        chunks: list[str] = []
        metadata: list[dict] = []

        for start in range(0, len(text), step):
            end = min(start + size, len(text))
            chunk = text[start:end].strip()
            if not chunk:
                continue

            midpoint = (start + end) // 2
            page_number = 1
            for record in pages:
                if record["start"] <= midpoint <= record["end"]:
                    page_number = record["page"]
                    break

            chunks.append(chunk)
            metadata.append({"start": start, "end": end, "page": page_number})

            if end >= len(text):
                break

        return chunks, metadata

    def _embed_texts(self, texts: list[str]) -> np.ndarray:
        client = self._client()
        vectors = []

        for text in texts:
            response = client.embeddings.create(
                model=self.settings.embedding_model,
                input=text,
            )
            vectors.append(response.data[0].embedding)

        arr = np.array(vectors, dtype="float32")
        # Normalize for cosine similarity over inner product index.
        faiss.normalize_L2(arr)
        return arr

    def index_pdf(self, pdf_bytes: bytes, file_name: str | None = None) -> dict:
        text, pages, total_pages = self._extract_text(pdf_bytes)
        if not text.strip():
            raise ValueError("No readable text found in the PDF.")

        chunks, metadata = self._chunk_text(text, pages)
        if not chunks:
            raise ValueError("No text chunks were produced from the PDF.")

        embeddings = self._embed_texts(chunks)

        # Generate unique document ID
        doc_id = str(uuid.uuid4())

        # Write FAISS index specifically for this document
        index = faiss.IndexFlatIP(embeddings.shape[1])
        index.add(embeddings)
        index_path = self.data_dir / f"{doc_id}.index"
        faiss.write_index(index, str(index_path))

        # Insert chunks and metadata into SQLite
        db_chunks = []
        for faiss_id, chunk in enumerate(chunks):
            meta = metadata[faiss_id]
            db_chunks.append({
                "text": chunk,
                "page_number": meta["page"],
                "start_char": meta["start"],
                "end_char": meta["end"],
                "faiss_id": faiss_id,
            })

        database.add_document(
            db_path=self.settings.db_path,
            doc_id=doc_id,
            filename=file_name or "uploaded.pdf",
            total_pages=total_pages,
            total_chunks=len(chunks),
            chunks=db_chunks,
        )

        return {
            "message": "Index created successfully.",
            "document_id": doc_id,
            "total_pages": total_pages,
            "total_chunks": len(chunks),
        }

    def list_documents(self) -> list[dict]:
        return database.get_documents(self.settings.db_path)

    def delete_document(self, doc_id: str) -> bool:
        db_path = self.settings.db_path
        deleted = database.delete_document(db_path, doc_id)
        if deleted:
            index_path = self.data_dir / f"{doc_id}.index"
            if index_path.exists():
                try:
                    index_path.unlink()
                except Exception:
                    pass
        return deleted

    def info(self) -> dict:
        docs = self.list_documents()
        total_pages = sum(d["total_pages"] for d in docs)
        total_chunks = sum(d["total_chunks"] for d in docs)
        return {
            "indexed": len(docs) > 0,
            "total_pages": total_pages,
            "total_chunks": total_chunks,
        }

    def ask(self, document_id: str, question: str) -> dict:
        index_path = self.data_dir / f"{document_id}.index"
        if not index_path.exists():
            raise FileNotFoundError("Index not found. The document may have been deleted.")

        if not question.strip():
            raise ValueError("Question cannot be empty.")

        index = faiss.read_index(str(index_path))
        db_path = self.settings.db_path

        query_vector = self._embed_texts([question])
        total_chunks = index.ntotal
        k = min(self.settings.top_k, total_chunks)
        if k == 0:
            raise ValueError("Document has no text chunks indexed.")

        scores, indices = index.search(query_vector, k)

        faiss_ids = [int(idx) for idx in indices[0] if idx >= 0]
        chunks_meta = database.get_chunks_by_faiss_ids(db_path, document_id, faiss_ids)

        selected = []
        for rank, item in enumerate(chunks_meta):
            score = 0.0
            try:
                idx_pos = list(indices[0]).index(item["faiss_id"])
                score = round(float(scores[0][idx_pos]), 6)
            except ValueError:
                pass
            selected.append({
                "source_id": item["faiss_id"],
                "rank": rank + 1,
                "score": score,
                "page": item["page_number"],
                "start": item["start"],
                "end": item["end"],
                "text": item["text"],
            })

        context = "\n\n".join(
            [f"[Page {item['page']}] {item['text']}" for item in selected]
        )

        client = self._client()
        filename = "document"
        with database.get_db_connection(db_path) as conn:
            row = conn.execute("SELECT filename, total_pages FROM documents WHERE id = ?", (document_id,)).fetchone()
            if row:
                filename = row["filename"]
                total_pages = row["total_pages"]
            else:
                total_pages = 1

        completion = client.chat.completions.create(
            model=self.settings.chat_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You answer questions only from the provided context. "
                        "If the context is insufficient, say so clearly. "
                        f"The document '{filename}' has {total_pages} pages. Mention page numbers when useful."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {question}",
                },
            ],
            temperature=0.2,
        )

        answer = completion.choices[0].message.content or "No answer generated."
        return {"answer": answer, "sources": selected}

    def ask_stream(self, document_id: str, question: str):
        index_path = self.data_dir / f"{document_id}.index"
        if not index_path.exists():
            raise FileNotFoundError("Index not found. The document may have been deleted.")

        if not question.strip():
            raise ValueError("Question cannot be empty.")

        index = faiss.read_index(str(index_path))
        db_path = self.settings.db_path

        query_vector = self._embed_texts([question])
        total_chunks = index.ntotal
        k = min(self.settings.top_k, total_chunks)
        if k == 0:
            raise ValueError("Document has no text chunks indexed.")

        scores, indices = index.search(query_vector, k)

        faiss_ids = [int(idx) for idx in indices[0] if idx >= 0]
        chunks_meta = database.get_chunks_by_faiss_ids(db_path, document_id, faiss_ids)

        selected = []
        for rank, item in enumerate(chunks_meta):
            score = 0.0
            try:
                idx_pos = list(indices[0]).index(item["faiss_id"])
                score = round(float(scores[0][idx_pos]), 6)
            except ValueError:
                pass
            selected.append({
                "source_id": item["faiss_id"],
                "rank": rank + 1,
                "score": score,
                "page": item["page_number"],
                "start": item["start"],
                "end": item["end"],
                "text": item["text"],
            })

        # Yield sources metadata first
        yield f"data: {json.dumps({'sources': selected})}\n\n"

        context = "\n\n".join(
            [f"[Page {item['page']}] {item['text']}" for item in selected]
        )

        client = self._client()
        filename = "document"
        with database.get_db_connection(db_path) as conn:
            row = conn.execute("SELECT filename, total_pages FROM documents WHERE id = ?", (document_id,)).fetchone()
            if row:
                filename = row["filename"]
                total_pages = row["total_pages"]
            else:
                total_pages = 1

        completion_stream = client.chat.completions.create(
            model=self.settings.chat_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You answer questions only from the provided context. "
                        "If the context is insufficient, say so clearly. "
                        f"The document '{filename}' has {total_pages} pages. Mention page numbers when useful."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {question}",
                },
            ],
            temperature=0.2,
            stream=True,
        )

        for chunk in completion_stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                yield f"data: {json.dumps({'text': token})}\n\n"

        yield "data: [DONE]\n\n"


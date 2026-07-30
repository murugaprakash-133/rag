import sqlite3
from pathlib import Path


def get_db_connection(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with get_db_connection(db_path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_pages INTEGER NOT NULL,
                total_chunks INTEGER NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                text TEXT NOT NULL,
                page_number INTEGER NOT NULL,
                start_char INTEGER NOT NULL,
                end_char INTEGER NOT NULL,
                faiss_id INTEGER NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            );
        """)
        # Indexes for fast querying
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_doc_faiss ON chunks(document_id, faiss_id);")
        conn.commit()


def add_document(
    db_path: Path,
    doc_id: str,
    filename: str,
    total_pages: int,
    total_chunks: int,
    chunks: list[dict],
) -> None:
    with get_db_connection(db_path) as conn:
        conn.execute(
            "INSERT INTO documents (id, filename, total_pages, total_chunks) VALUES (?, ?, ?, ?)",
            (doc_id, filename, total_pages, total_chunks),
        )
        # chunks is a list of dicts: {"text": str, "page_number": int, "start_char": int, "end_char": int, "faiss_id": int}
        conn.executemany(
            """
            INSERT INTO chunks (document_id, text, page_number, start_char, end_char, faiss_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    doc_id,
                    c["text"],
                    c["page_number"],
                    c["start_char"],
                    c["end_char"],
                    c["faiss_id"],
                )
                for c in chunks
            ],
        )
        conn.commit()


def get_documents(db_path: Path) -> list[dict]:
    with get_db_connection(db_path) as conn:
        cursor = conn.execute(
            "SELECT id, filename, upload_time, total_pages, total_chunks FROM documents ORDER BY upload_time DESC"
        )
        return [dict(row) for row in cursor.fetchall()]


def delete_document(db_path: Path, doc_id: str) -> bool:
    with get_db_connection(db_path) as conn:
        cursor = conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_chunks_by_faiss_ids(db_path: Path, doc_id: str, faiss_ids: list[int]) -> list[dict]:
    if not faiss_ids:
        return []
    
    # We want to preserve the order of faiss_ids in the output, or query them efficiently
    placeholders = ",".join(["?"] * len(faiss_ids))
    query = f"""
        SELECT text, page_number, start_char as start, end_char as end, faiss_id
        FROM chunks
        WHERE document_id = ? AND faiss_id IN ({placeholders})
    """
    params = [doc_id] + list(faiss_ids)
    
    with get_db_connection(db_path) as conn:
        cursor = conn.execute(query, params)
        rows = [dict(row) for row in cursor.fetchall()]
        
        # Sort rows to match the input faiss_ids ordering
        id_to_row = {row["faiss_id"]: row for row in rows}
        sorted_rows = []
        for fid in faiss_ids:
            if fid in id_to_row:
                sorted_rows.append(id_to_row[fid])
        return sorted_rows

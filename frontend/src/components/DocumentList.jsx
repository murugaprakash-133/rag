import React from "react";

export default function DocumentList({ documents, selectedDocId, onSelectDoc, onDeleteDoc }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="document-list-container">
      <h3>Indexed Documents</h3>
      {documents.length === 0 ? (
        <div className="empty-documents">
          <p>No documents uploaded yet. Upload a PDF to get started.</p>
        </div>
      ) : (
        <ul className="doc-list">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className={`doc-item ${selectedDocId === doc.id ? "active" : ""}`}
              onClick={() => onSelectDoc(doc)}
            >
              <div className="doc-info">
                <span className="doc-name" title={doc.filename}>
                  {doc.filename}
                </span>
                <span className="doc-meta">
                  {doc.total_pages} pages • {doc.total_chunks} chunks
                </span>
                <span className="doc-time">{formatDate(doc.upload_time)}</span>
              </div>
              <button
                className="delete-doc-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete "${doc.filename}"?`)) {
                    onDeleteDoc(doc.id);
                  }
                }}
                title="Delete document"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="trash-icon"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

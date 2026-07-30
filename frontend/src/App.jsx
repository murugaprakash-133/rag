import { useEffect, useState } from "react";
import DocumentList from "./components/DocumentList";
import UploadZone from "./components/UploadZone";
import ChatArea from "./components/ChatArea";
import SourceViewer from "./components/SourceViewer";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8000";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [highlightPage, setHighlightPage] = useState(null);
  const [error, setError] = useState("");

  // Fetch all documents
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        // If documents exist and none is selected, select the first one by default
        if (data.length > 0 && !selectedDoc) {
          setSelectedDoc(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load documents", err);
      setError("Failed to connect to backend service.");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Handle PDF indexing/uploading
  const handleUpload = async (file) => {
    setError("");
    setIsIndexing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/index-pdf`, {
        method: "POST",
        body: formData,
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.detail || "Failed to parse and index PDF.");
      }

      // Re-fetch document list
      await fetchDocuments();

      // Find the newly created document and select it
      const newDoc = {
        id: payload.document_id,
        filename: file.name,
        total_pages: payload.total_pages,
        total_chunks: payload.total_chunks,
      };
      setSelectedDoc(newDoc);
      
      // Clear conversation when a new document is uploaded
      setMessages([]);
      setSources([]);
      setHighlightPage(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  // Select document
  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc);
    setMessages([]);
    setSources([]);
    setHighlightPage(null);
    setError("");
  };

  // Delete document
  const handleDeleteDoc = async (docId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove from list
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
          setMessages([]);
          setSources([]);
          setHighlightPage(null);
        }
      } else {
        const payload = await res.json();
        setError(payload.detail || "Failed to delete document.");
      }
    } catch (err) {
      setError("Error deleting document. Please try again.");
    }
  };

  // Submit question using Server-Sent Events (SSE) streaming
  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || !selectedDoc) return;

    setError("");
    setHighlightPage(null);
    
    // Add user message immediately
    const userQ = question;
    setMessages((prev) => [...prev, { role: "user", content: userQ }]);
    setQuestion("");
    setIsAsking(true);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ask-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: selectedDoc.id,
          question: userQ,
        }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.detail || "Error generating response.");
      }

      // Add assistant placeholder bubble
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setIsTyping(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Save the last partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            if (dataStr === "[DONE]") {
              setIsAsking(false);
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              if (data.sources) {
                setSources(data.sources);
              } else if (data.text) {
                // Update final message content token by token
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === "assistant") {
                    last.content += data.text;
                  }
                  return copy;
                });
              }
            } catch (err) {
              console.error("SSE parsing error", err);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setIsAsking(false);
      setIsTyping(false);
      // Remove placeholder message if error occurred
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[copy.length - 1]?.content === "") {
          copy.pop();
        }
        return copy;
      });
    }
  };

  const handlePageClick = (pageNum) => {
    setHighlightPage(pageNum);
  };

  const handleClearHighlight = () => {
    setHighlightPage(null);
  };

  return (
    <div className="app-shell">
      {/* Background decoration elements */}
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">📚</span>
          <span className="brand-name">DocuMind RAG</span>
        </div>
        <UploadZone onUpload={handleUpload} isIndexing={isIndexing} />
        <DocumentList
          documents={documents}
          selectedDocId={selectedDoc?.id}
          onSelectDoc={handleSelectDoc}
          onDeleteDoc={handleDeleteDoc}
        />
        {error && <div className="error-banner">{error}</div>}
      </aside>

      <main className="main-content">
        <ChatArea
          messages={messages}
          question={question}
          setQuestion={setQuestion}
          onSubmit={handleAskQuestion}
          isAsking={isAsking}
          isTyping={isTyping}
          selectedDoc={selectedDoc}
          onPageClick={handlePageClick}
        />
      </main>

      <aside className="sources-aside">
        <SourceViewer
          sources={sources}
          highlightPage={highlightPage}
          onClose={handleClearHighlight}
        />
      </aside>
    </div>
  );
}

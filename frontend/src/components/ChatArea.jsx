import React, { useEffect, useRef } from "react";

export default function ChatArea({
  messages,
  question,
  setQuestion,
  onSubmit,
  isAsking,
  isTyping,
  selectedDoc,
  onPageClick,
}) {
  const messagesEndRef = useRef(null);
  const viewportRef = useRef(null);

  const scrollToBottom = () => {
    if (viewportRef.current) {
      // Set scrollTop directly to match scrollHeight instantly for smooth streaming follow-up
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking, isTyping]);

  const renderMessageText = (text) => {
    if (!text) return "";
    
    // Split text by [Page X] matches
    const parts = text.split(/(\[Page \d+\])/gi);
    return parts.map((part, index) => {
      const match = part.match(/\[Page (\d+)\]/i);
      if (match) {
        const pageNum = parseInt(match[1], 10);
        return (
          <button
            key={index}
            type="button"
            className="citation-tag"
            onClick={() => onPageClick(pageNum)}
            title={`Jump to sources for Page ${pageNum}`}
          >
            Page {pageNum}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Smart Assistant</h2>
        {selectedDoc ? (
          <div className="active-doc-badge">
            <span className="dot online"></span>
            <span className="doc-name">{selectedDoc.filename}</span>
          </div>
        ) : (
          <div className="active-doc-badge">
            <span className="dot offline"></span>
            <span className="doc-name text-muted">No document selected</span>
          </div>
        )}
      </div>

      <div ref={viewportRef} className="messages-viewport">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="bot-avatar-large">🤖</div>
            <h3>Ask me anything!</h3>
            {selectedDoc ? (
              <p>
                Ask questions grounded in the contents of <strong>{selectedDoc.filename}</strong>. 
                Answers will cite specific pages.
              </p>
            ) : (
              <p>Please upload a PDF or select an indexed document from the sidebar to begin.</p>
            )}
            
            {selectedDoc && (
              <div className="suggested-queries">
                <button onClick={() => setQuestion("What is the main summary of this document?")}>
                  "What is the main summary of this document?"
                </button>
                <button onClick={() => setQuestion("What are the key findings or takeaways?")}>
                  "What are the key findings or takeaways?"
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="message-list">
            {messages.map((msg, index) => {
              if (msg.role === "assistant" && !msg.content) {
                return null; // Suppress rendering empty bubbles before stream starts
              }
              return (
                <div key={index} className={`message-bubble ${msg.role}`}>
                  <div className="msg-avatar">{msg.role === "user" ? "👤" : "🤖"}</div>
                  <div className="msg-body">
                    <div className="msg-meta">{msg.role === "user" ? "You" : "Assistant"}</div>
                    <div className="msg-text">
                      {msg.role === "assistant" ? renderMessageText(msg.content) : msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="message-bubble assistant typing">
                <div className="msg-avatar">🤖</div>
                <div className="msg-body">
                  <div className="msg-meta">Assistant</div>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="chat-input-bar">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            selectedDoc
              ? `Ask a question about "${selectedDoc.filename}"...`
              : "Select a document to begin asking questions..."
          }
          disabled={!selectedDoc || isAsking}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!selectedDoc || !question.trim() || isAsking}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="send-icon"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
}

import React, { useState, useRef } from "react";

export default function UploadZone({ onUpload, isIndexing }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setFileName(file.name);
        onUpload(file);
      } else {
        alert("Only PDF files are supported.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      onUpload(file);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="upload-container">
      <h2>Upload Document</h2>
      <div
        className={`upload-zone ${isDragActive ? "drag-active" : ""} ${isIndexing ? "indexing" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="file-input-hidden"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={isIndexing}
        />
        
        <div className="upload-content">
          {isIndexing ? (
            <div className="loader-container">
              <div className="spinner"></div>
              <p className="indexing-text">Analyzing & indexing document...</p>
              <p className="subtext">Running PDF text extraction, semantic chunking, and embedding generation</p>
            </div>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="upload-icon"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p className="main-instruction">
                Drag and drop your PDF here, or <span>browse</span>
              </p>
              <p className="upload-hint">Supports text-based PDF documents up to 50MB</p>
              {fileName && <p className="selected-filename">Selected: {fileName}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

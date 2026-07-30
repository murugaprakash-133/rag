import React from "react";

export default function SourceViewer({ sources, highlightPage, onClose }) {
  // Filter sources if a specific page is highlighted/selected
  const displayedSources = highlightPage
    ? sources.filter((s) => s.page === highlightPage)
    : sources;

  return (
    <div className={`source-viewer-panel ${sources.length > 0 ? "visible" : ""}`}>
      <div className="source-viewer-header">
        <div>
          <h3>Reference Sources</h3>
          {highlightPage && (
            <div className="filter-badge">
              Filtered by Page {highlightPage}
              <button className="clear-filter" onClick={onClose}>
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="source-viewer-content">
        {sources.length === 0 ? (
          <div className="empty-sources">
            <p>No query sources retrieved yet. Submit a question to inspect retrieved PDF segments.</p>
          </div>
        ) : displayedSources.length === 0 ? (
          <div className="empty-sources">
            <p>No source chunks matched Page {highlightPage}.</p>
            <button className="cta secondary" onClick={onClose}>
              Show All Pages
            </button>
          </div>
        ) : (
          <div className="source-cards-list">
            {displayedSources.map((item, index) => (
              <article key={index} className="source-viewer-card">
                <div className="source-card-head">
                  <span className="source-rank">Rank #{item.rank}</span>
                  <span className="source-page-tag">Page {item.page}</span>
                  <span className="source-score" title="Cosine Similarity Score">
                    Score: {item.score}
                  </span>
                </div>
                <div className="source-card-body">
                  <p>{item.text}</p>
                </div>
                <div className="source-card-footer">
                  <span>Character offset: {item.start} - {item.end}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

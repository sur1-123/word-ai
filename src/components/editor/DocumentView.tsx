/**
 * Document View Component
 * Word AI Editor - Display document structure and content
 * Author: srd19933311042
 */

import { useState } from "react";

interface DocumentViewProps {
  documentPath: string;
  content: string;
  metadata?: {
    pageCount: number;
    wordCount: number;
    paragraphCount: number;
  };
}

const DocumentView: React.FC<DocumentViewProps> = ({
  documentPath,
  content,
  metadata,
}) => {
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  return (
    <div className="document-view">
      {/* Document Header */}
      <div className="doc-header">
        <div className="doc-path">{documentPath}</div>
        <div className="doc-meta">
          {metadata && (
            <>
              <span>{metadata.pageCount} pages</span>
              <span> • </span>
              <span>{metadata.wordCount} words</span>
              <span> • </span>
              <span>{metadata.paragraphCount} paragraphs</span>
            </>
          )}
        </div>
        <div className="view-toggle">
          <button
            className={viewMode === "edit" ? "active" : ""}
            onClick={() => setViewMode("edit")}
          >
            Edit
          </button>
          <button
            className={viewMode === "preview" ? "active" : ""}
            onClick={() => setViewMode("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="doc-content">
        {viewMode === "edit" ? (
          <div className="edit-mode">
            <textarea
              value={content}
              readOnly
              className="document-textarea"
              placeholder="Document content will appear here..."
            />
          </div>
        ) : (
          <div className="preview-mode">
            <div className="document-preview">
              {/* Render content with Word-like styling */}
              <div
                dangerouslySetInnerHTML={{
                  __html: content.replace(/\n/g, "<br/>"),
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentView;

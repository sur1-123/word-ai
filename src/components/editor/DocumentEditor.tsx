/**
 * Document Editor Component
 * Word AI Editor - Main document editing interface
 * Integrates Monaco Editor with document view controls
 * Author: srd19933311042
 */

import { useState } from "react";
import { MonacoEditor } from "./editor/MonacoEditor";

interface DocumentEditorProps {
  initialContent?: string;
  documentPath?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  initialContent = "",
  documentPath = "",
  onSave,
  readOnly = false,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">(readOnly ? "preview" : "edit");

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsDirty(newContent !== initialContent);
  };

  const handleSave = () => {
    if (onSave && content) {
      onSave(content);
      setIsDirty(false);
    }
  };

  const handleModeToggle = () => {
    setMode((prev) => (prev === "edit" ? "preview" : "edit"));
  };

  const toolbarButtons = [
    { icon: "💾", label: "Save", shortcut: "Ctrl+S", action: handleSave, disabled: !isDirty || mode === "preview" },
    { icon: "👁", label: "Undo", shortcut: "Ctrl+Z", action: () => console.log("Undo"), disabled: mode === "preview" },
    { icon: "🔄", label: "Redo", shortcut: "Ctrl+Shift+Z", action: () => console.log("Redo"), disabled: mode === "preview" },
  ];

  return (
    <div className="document-editor-container">
      {/* Toolbar */}
      <div className="editor-toolbar">
        {toolbarButtons.map((btn, index) => (
          <>
            <button
              key={index}
              className={`toolbar-button ${btn.disabled ? "disabled" : ""}`}
              onClick={btn.action}
              disabled={btn.disabled}
              title={`${btn.label} (${btn.shortcut})`}
            >
              <span className="button-icon">{btn.icon}</span>
              <span className="button-label">{btn.label}</span>
            </button>
            {index < toolbarButtons.length - 1 && <div className="toolbar-separator" />}
          </>
        ))}
        <div className="toolbar-spacer" />
        <div className="mode-toggle">
          <button
            className={mode === "edit" ? "active" : ""}
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          <button
            className={mode === "preview" ? "active" : ""}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Document Path */}
      {documentPath && (
        <div className="document-path-bar">
          <span className="path-label">📄 {documentPath}</span>
          {isDirty && <span className="dirty-indicator">● Unsaved</span>}
        </div>
      )}

      {/* Editor or Preview */}
      {mode === "edit" ? (
        <MonacoEditor
          content={content}
          onChange={handleContentChange}
          readOnly={readOnly}
          height="calc(100vh - 140px)"
        />
      ) : (
        <div className="preview-container">
          <div
            className="preview-content"
            dangerouslySetInnerHTML={{
              __html: content.replace(/\n/g, "<br/>"),
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;

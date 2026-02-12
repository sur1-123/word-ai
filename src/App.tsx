/**
 * Word AI Editor - Main Application Component
 * Integrates document editing with auto-save and dirty state management
 * Author: srd19933311042
 */

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DocumentEditor } from "./components/editor";
import { useDocument } from "./hooks/useDocument";

function App() {
  const [pythonStatus, setPythonStatus] = useState<{ running: boolean }>({
    running: false,
  });

  const {
    state,
    loadDocument,
    saveDocument,
    markDirty,
    startAutoSave,
    stopAutoSave,
    shouldShowUnsavedWarning,
    getDocumentState,
  } = useDocument();

  // Initialize Python service on mount
  useEffect(() => {
    invoke("python_service_start")
      .then(() => setPythonStatus({ running: true }))
      .catch((err) => console.error("Failed to start Python service:", err));

    // Start auto-save when a document is loaded
    if (state.path) {
      startAutoSave();
    }

    return () => {
      invoke("python_service_stop").catch((err) =>
        console.error("Failed to stop Python service:", err)
      );
      stopAutoSave();
    };
  }, []);

  const handleOpenDocument = async () => {
    const result = await invoke<string>("file_open_dialog");
    if (result) {
      await loadDocument(result);
    }
  };

  const handleEditorChange = (value: string) => {
    setDocumentContent(value);
    markDirty();
  };

  const handleSave = () => {
    saveDocument();
  };

  const handleClose = () => {
    if (shouldShowUnsavedWarning()) {
      if (confirm("You have unsaved changes. Do you want to close without saving?")) {
        stopAutoSave();
        // Allow close
      } else {
        return false;
      }
    }
    stopAutoSave();
    setDocumentPath("");
    setDocumentContent("");
  };

  // Prevent accidental close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldShowUnsavedWarning()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldShowUnsavedWarning]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Word AI Editor</h1>
        <div className="header-actions">
          <button onClick={handleOpenDocument}>📂 Open Document</button>
          <div className="status-indicators">
            <span className={`status-badge python-${pythonStatus.running ? "running" : "stopped"}`}>
              Python: {pythonStatus.running ? "Running" : "Stopped"}
            </span>
            {state.path && (
              <span className="status-badge info">
                📄 {state.path.split("\\").pop()}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {state.path ? (
          <>
            {shouldShowUnsavedWarning() && (
              <div className="unsaved-warning">
                <span>⚠️ You have unsaved changes</span>
                <button className="save-now-btn" onClick={handleSave}>
                  Save Now (Ctrl+S)
                </button>
              </div>
            )}
            <DocumentEditor
              key={state.path}
              initialContent={state.content}
              documentPath={state.path}
              onSave={handleSave}
              readOnly={false}
            />
          </>
        ) : (
          <div className="welcome-screen">
            <div className="welcome-content">
              <h1>📝 Word AI Editor</h1>
              <p className="welcome-subtitle">AI-Powered Document Editing</p>
              <div className="welcome-features">
                <div className="feature-item">
                  <span className="feature-icon">✨</span>
                  <span>Smart Formatting</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔄</span>
                  <span>Version Control</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">⚡</span>
                  <span>Large File Support</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🤖</span>
                  <span>MCP Integration</span>
                </div>
              </div>
              <div className="welcome-actions">
                <button
                  className="welcome-cta"
                  onClick={handleOpenDocument}
                >
                  Open a Document to Start
                </button>
                {!pythonStatus.running && (
                  <div className="python-warning">
                    ⚠️ Python service not running
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-info">
          <span className="version">v0.1.0-dev</span>
          <span>•</span>
          <span className="author">srd19933311042</span>
          <span>•</span>
          <span className="shortcuts">Ctrl+O: Open • Ctrl+S: Save</span>
          {state.isDirty && <span> • Unsaved</span>}
        </div>
      </footer>
    </div>
  );
}

export default App;

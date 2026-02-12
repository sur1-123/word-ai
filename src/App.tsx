import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [documentPath, setDocumentPath] = useState<string>("");
  const [documentContent, setDocumentContent] = useState<string>("");
  const [pythonStatus, setPythonStatus] = useState<{ running: boolean }>({
    running: false,
  });

  // Initialize Python service on mount
  useEffect(() => {
    invoke("python_service_start")
      .then(() => setPythonStatus({ running: true }))
      .catch((err) => console.error("Failed to start Python service:", err));

    return () => {
      invoke("python_service_stop").catch((err) =>
        console.error("Failed to stop Python service:", err)
      );
    };
  }, []);

  const handleOpenDocument = async () => {
    try {
      const result = await invoke<string>("file_open_dialog");
      if (result) {
        setDocumentPath(result);
        // Load document content
        const content = await invoke<string>("document_read", { path: result });
        setDocumentContent(content);
      }
    } catch (err) {
      console.error("Failed to open document:", err);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Word AI Editor</h1>
        <div className="header-actions">
          <button onClick={handleOpenDocument}>Open Document</button>
          <span className="status-indicator">
            Python Service: {pythonStatus.running ? "Running" : "Stopped"}
          </span>
        </div>
      </header>

      <main className="app-main">
        {documentPath ? (
          <div className="document-view">
            <div className="document-meta">Path: {documentPath}</div>
            <div className="document-content">{documentContent}</div>
          </div>
        ) : (
          <div className="welcome-screen">
            <h2>Welcome to Word AI Editor</h2>
            <p>Open a document to start editing</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <span>v0.1.0</span>
        <span>Press Ctrl+O to open a document</span>
      </footer>
    </div>
  );
}

export default App;

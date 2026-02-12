/**
 * Monaco Editor Component
 * Word AI Editor - Document editing with Monaco Editor
 * Author: srd19933311042
 */

import { useRef, useEffect, useState } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import * as Monaco from "monaco-editor/monaco";

interface MonacoEditorProps {
  content?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: string;
  height?: string;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  content = "",
  onChange,
  readOnly = false,
  language = "markdown", // Use markdown for Word-like editing
  height = "100%",
}) => {
  const editorRef = useRef<OnMount>(null);
  const [editor, setEditor] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (monacoEditor) => {
    editorRef.current = monacoEditor;
    setEditor(monacoEditor);

    // Configure editor options
    monacoEditor.updateOptions({
      wordWrap: "on",
      lineNumbers: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      readOnly: readOnly,
      automaticLayout: true,
    });

    // Set initial content
    if (content) {
      monacoEditor.setValue(content);
    }
  };

  const handleEditorChange: OnChange = (newValue) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="monaco-editor-wrapper" style={{ height }}>
      <Editor
        height={height}
        language={language}
        theme="vs-light"
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        loading={<div className="editor-loading">Loading editor...</div>}
        options={{
          fontSize: 14,
          lineHeight: 21,
          padding: { top: 16, bottom: 16 },
          fontFamily: "Consolas, 'Courier New', monospace",
          smoothScrolling: true,
          cursorBlinking: true,
          cursorSmoothCaretAnimation: "on",
        }}
      />
    </div>
  );
};

export default MonacoEditor;

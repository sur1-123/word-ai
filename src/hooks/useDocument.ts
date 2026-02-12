/**
 * useDocument Hook
 * Word AI Editor - Custom hook for document state management
 * Author: srd19933311042
 */

import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface DocumentMetadata {
  pageCount: number;
  wordCount: number;
  paragraphCount: number;
}

interface DocumentState {
  path: string | null;
  content: string;
  metadata: DocumentMetadata | null;
  isDirty: boolean;
  isModified: boolean;
  lastSaveTime: number | null;
}

export function useDocument() {
  const [state, setState] = useState<DocumentState>({
    path: null,
    content: "",
    metadata: null,
    isDirty: false,
    isModified: false,
    lastSaveTime: null,
  });

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_SAVE_INTERVAL = 60000; // 1 minute in ms

  // Load document
  const loadDocument = useCallback(async (path: string) => {
    try {
      const content = await invoke<string>("document_read", { path });
      const metadata = await invoke<DocumentMetadata>("document_info", { path });

      setState({
        path,
        content,
        metadata,
        isDirty: false,
        isModified: false,
        lastSaveTime: Date.now(),
      });

      return { success: true, content };
    } catch (error) {
      console.error("Failed to load document:", error);
      return { success: false, error };
    }
  };

  // Save document
  const saveDocument = useCallback(async (content?: string) => {
    const contentToSave = content ?? state.content;

    if (!state.path) {
      return { success: false, error: "No document path" };
    }

    try {
      await invoke("document_write", {
        path: state.path,
        content: contentToSave,
      });

      setState((prev) => ({
        ...prev,
        isDirty: false,
        isModified: false,
        lastSaveTime: Date.now(),
      }));

      return { success: true };
    } catch (error) {
      console.error("Failed to save document:", error);
      return { success: false, error };
    }
  };

  // Start auto-save timer
  const startAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setInterval(() => {
      if (state.isDirty && state.path) {
        saveDocument();
      }
    }, AUTO_SAVE_INTERVAL);
  }, []);

  // Stop auto-save timer
  const stopAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // Mark document as dirty
  const markDirty = useCallback(() => {
    setState((prev) => ({ ...prev, isDirty: true, isModified: true }));
  }, []);

  // Get document state
  const getDocumentState = () => state;

  // Check if should show unsaved warning
  const shouldShowUnsavedWarning = () => {
    if (!state.isDirty || !state.path) return false;

    const timeSinceLastSave = state.lastSaveTime
      ? Date.now() - state.lastSaveTime
      : 0;

    return timeSinceLastSave > 5000; // 5 seconds
  };

  return {
    state,
    loadDocument,
    saveDocument,
    markDirty,
    startAutoSave,
    stopAutoSave,
    shouldShowUnsavedWarning,
    getDocumentState,
  };
}

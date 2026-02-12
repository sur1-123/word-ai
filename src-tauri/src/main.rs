// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Document operations
            document_read,
            document_write,
            document_info,
            // File operations
            file_open_dialog,
            file_save_dialog,
            // Python service control
            python_service_start,
            python_service_stop,
            python_service_status,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            println!("Word AI Editor started successfully!");
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Document operations
#[tauri::command]
async fn document_read(path: String) -> Result<String, String> {
    // TODO: Implement document reading via Python service
    Ok(format!("Document read: {}", path))
}

#[tauri::command]
async fn document_write(path: String, content: String) -> Result<(), String> {
    // TODO: Implement document writing via Python service
    Ok(())
}

#[tauri::command]
async fn document_info(path: String) -> Result<DocumentMetadata, String> {
    // TODO: Return document metadata (pages, words, paragraphs)
    Ok(DocumentMetadata {
        page_count: 0,
        word_count: 0,
        paragraph_count: 0,
    })
}

// File operations
#[tauri::command]
async fn file_open_dialog() -> Result<Option<String>, String> {
    // TODO: Open native file dialog
    Ok(None)
}

#[tauri::command]
async fn file_save_dialog(default_filename: String) -> Result<Option<String>, String> {
    // TODO: Open native save dialog
    Ok(None)
}

// Python service control
#[tauri::command]
async fn python_service_start() -> Result<ServiceStatus, String> {
    // TODO: Start Python subprocess
    Ok(ServiceStatus {
        running: false,
        pid: None,
    })
}

#[tauri::command]
async fn python_service_stop() -> Result<(), String> {
    // TODO: Stop Python subprocess
    Ok(())
}

#[tauri::command]
async fn python_service_status() -> Result<ServiceStatus, String> {
    // TODO: Return Python service status
    Ok(ServiceStatus {
        running: false,
        pid: None,
    })
}

// Type definitions
#[derive(serde::Serialize)]
struct DocumentMetadata {
    page_count: u32,
    word_count: u32,
    paragraph_count: u32,
}

#[derive(serde::Serialize)]
struct ServiceStatus {
    running: bool,
    pid: Option<u32>,
}

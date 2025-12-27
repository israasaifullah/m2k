use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::channel;
use std::thread;
use tauri::{AppHandle, Emitter};
use crate::{db, parser};

pub fn start_watcher(app: AppHandle, project_path: String) -> Result<(), String> {
    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    thread::spawn(move || {
        let (tx, rx) = channel();

        let mut watcher: RecommendedWatcher =
            Watcher::new(tx, Config::default()).expect("Failed to create watcher");

        let folders = ["backlog", "in-progress", "inprogress", "done", "epics"];
        for folder in folders {
            let folder_path = Path::new(&project_path).join(folder);
            if folder_path.exists() {
                let _ = watcher.watch(&folder_path, RecursiveMode::NonRecursive);
            }
        }

        loop {
            match rx.recv() {
                Ok(Ok(event)) => {
                    if should_emit_event(&event) {
                        // Handle incremental sync
                        handle_md_file_change(&event, &project_path, &app);

                        let _ = app.emit("file-change", event.paths);
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("Watch error: {:?}", e);
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

fn should_emit_event(event: &Event) -> bool {
    use notify::EventKind::*;
    matches!(
        event.kind,
        Create(_) | Modify(_) | Remove(_) | Access(_)
    ) && event
        .paths
        .iter()
        .any(|p| p.extension().map_or(false, |ext| ext == "md"))
}

fn handle_md_file_change(event: &Event, project_path: &str, app: &AppHandle) {
    use notify::EventKind::*;

    for path in &event.paths {
        if !path.extension().map_or(false, |ext| ext == "md") {
            continue;
        }

        let file_path_str = path.to_string_lossy().to_string();

        // Check if file is in epics folder or ticket folders
        let is_epic = path.to_str().map_or(false, |s| s.contains("/epics/"));
        let is_ticket = path.to_str().map_or(false, |s| {
            s.contains("/backlog/") || s.contains("/inprogress/") || s.contains("/done/")
        });

        match event.kind {
            Remove(_) => {
                // Handle file deletion
                if is_epic {
                    if let Some(filename) = path.file_stem().and_then(|s| s.to_str()) {
                        let _ = db::delete_epic(filename);
                    }
                } else if is_ticket {
                    if let Some(filename) = path.file_stem().and_then(|s| s.to_str()) {
                        let _ = db::delete_ticket(filename);
                    }
                }
                let _ = app.emit("md-synced", serde_json::json!({
                    "file_path": file_path_str,
                    "status": "deleted"
                }));
            }
            Create(_) | Modify(_) => {
                // Handle file create/modify
                if is_epic {
                    if let Some(epic) = parser::parse_epic_file(path) {
                        let result = db::upsert_epic(&epic, &file_path_str);
                        let status = if result.is_ok() { "synced" } else { "error" };
                        let _ = app.emit("md-synced", serde_json::json!({
                            "file_path": file_path_str,
                            "status": status
                        }));
                    }
                } else if is_ticket {
                    // Determine status from folder
                    let folder = if path.to_str().map_or(false, |s| s.contains("/backlog/")) {
                        "backlog"
                    } else if path.to_str().map_or(false, |s| s.contains("/inprogress/")) {
                        "inprogress"
                    } else {
                        "done"
                    };

                    if let Some(ticket) = parser::parse_ticket_file(path, folder) {
                        let result = db::upsert_ticket(&ticket);
                        let status = if result.is_ok() { "synced" } else { "error" };
                        let _ = app.emit("md-synced", serde_json::json!({
                            "file_path": file_path_str,
                            "status": status
                        }));
                    }
                }
            }
            _ => {}
        }
    }
}

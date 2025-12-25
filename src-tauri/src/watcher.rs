use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::channel;
use std::thread;
use tauri::{AppHandle, Emitter};

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

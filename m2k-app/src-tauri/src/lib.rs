mod parser;
mod watcher;

use parser::{Epic, Ticket};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub project_path: Option<String>,
    pub theme: String,
}

fn get_config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("m2k-app").join("config.json"))
}

#[tauri::command]
fn load_config() -> Result<AppConfig, String> {
    let config_path = get_config_path().ok_or("Could not determine config directory")?;

    if !config_path.exists() {
        return Ok(AppConfig {
            project_path: None,
            theme: "light".to_string(),
        });
    }

    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

#[tauri::command]
fn save_config(config: AppConfig) -> Result<(), String> {
    let config_path = get_config_path().ok_or("Could not determine config directory")?;

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content).map_err(|e| format!("Failed to write config: {}", e))
}

#[tauri::command]
fn parse_tickets(path: String) -> Result<Vec<Ticket>, String> {
    parser::parse_tickets(&path)
}

#[tauri::command]
fn parse_epics(path: String) -> Result<Vec<Epic>, String> {
    parser::parse_epics(&path)
}

#[tauri::command]
fn start_watcher(app: AppHandle, path: String) -> Result<(), String> {
    watcher::start_watcher(app, path)
}

#[tauri::command]
fn save_markdown_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn get_next_epic_id(project_path: String) -> Result<u32, String> {
    let epics = parser::parse_epics(&project_path)?;
    let max_id = epics
        .iter()
        .filter_map(|e| {
            e.id.strip_prefix("EPIC-")
                .and_then(|s| s.parse::<u32>().ok())
        })
        .max()
        .unwrap_or(0);
    Ok(max_id + 1)
}

#[tauri::command]
fn get_next_ticket_id(project_path: String) -> Result<u32, String> {
    let tickets = parser::parse_tickets(&project_path)?;
    let max_id = tickets
        .iter()
        .filter_map(|t| {
            t.id.strip_prefix("T-")
                .and_then(|s| s.parse::<u32>().ok())
        })
        .max()
        .unwrap_or(0);
    Ok(max_id + 1)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            parse_tickets,
            parse_epics,
            start_watcher,
            save_markdown_file,
            get_next_epic_id,
            get_next_ticket_id
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod claude;
mod parser;
mod watcher;

use claude::GeneratedEpic;
use keyring::Entry;
use parser::{Epic, Ticket};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

const KEYRING_SERVICE: &str = "m2k-app";
const KEYRING_USER: &str = "anthropic-api-key";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    #[serde(default)]
    pub project_path: Option<String>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub sidebar_collapsed: bool,
    #[serde(default = "default_editor_mode")]
    pub default_editor_mode: String,
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_editor_mode() -> String {
    "kanban".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            project_path: None,
            theme: default_theme(),
            sidebar_collapsed: false,
            default_editor_mode: default_editor_mode(),
        }
    }
}

fn get_config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("m2k-app").join("config.json"))
}

#[tauri::command]
fn load_config() -> Result<AppConfig, String> {
    let config_path = get_config_path().ok_or("Could not determine config directory")?;

    if !config_path.exists() {
        return Ok(AppConfig::default());
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
fn save_api_key(api_key: String) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    entry
        .set_password(&api_key)
        .map_err(|e| format!("Failed to save API key: {}", e))
}

#[tauri::command]
fn load_api_key() -> Result<Option<String>, String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to load API key: {}", e)),
    }
}

#[tauri::command]
fn delete_api_key() -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete API key: {}", e)),
    }
}

#[tauri::command]
fn has_api_key() -> Result<bool, String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(format!("Failed to check API key: {}", e)),
    }
}

#[tauri::command]
async fn validate_api_key(api_key: String) -> Result<bool, String> {
    claude::validate_api_key(&api_key).await
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
fn read_markdown_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
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

#[tauri::command]
async fn generate_epic(
    project_path: String,
    requirements: String,
) -> Result<GeneratedEpic, String> {
    let next_epic_id = get_next_epic_id(project_path.clone())?;
    let next_ticket_id = get_next_ticket_id(project_path)?;
    claude::generate_epic_and_tickets(requirements, next_epic_id, next_ticket_id).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            save_api_key,
            load_api_key,
            delete_api_key,
            has_api_key,
            validate_api_key,
            parse_tickets,
            parse_epics,
            start_watcher,
            save_markdown_file,
            read_markdown_file,
            get_next_epic_id,
            get_next_ticket_id,
            generate_epic
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

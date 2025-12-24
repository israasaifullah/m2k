mod claude;
mod claude_cli;
mod parser;
mod watcher;

use claude::GeneratedEpic;
use claude_cli::ClaudeCliResult;
use keyring::Entry;
use parser::{Epic, Ticket};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::Mutex;

// Global state for managing Claude CLI execution
static CLAUDE_CLI_STOP_FLAG: std::sync::OnceLock<Arc<AtomicBool>> = std::sync::OnceLock::new();
static CLAUDE_CLI_RUNNING: std::sync::OnceLock<Arc<Mutex<bool>>> = std::sync::OnceLock::new();

fn get_stop_flag() -> Arc<AtomicBool> {
    CLAUDE_CLI_STOP_FLAG
        .get_or_init(|| Arc::new(AtomicBool::new(false)))
        .clone()
}

fn get_running_flag() -> Arc<Mutex<bool>> {
    CLAUDE_CLI_RUNNING
        .get_or_init(|| Arc::new(Mutex::new(false)))
        .clone()
}

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
    // log the path
    log::info!("Saving markdown file to: {}", path);
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
fn check_claude_cli() -> Result<bool, String> {
    claude_cli::check_claude_code_installed()
}

#[tauri::command]
fn get_claude_cli_version() -> Result<Option<String>, String> {
    claude_cli::get_claude_code_version()
}

#[tauri::command]
async fn start_claude_cli(
    app: AppHandle,
    prompt: String,
    working_dir: String,
) -> Result<ClaudeCliResult, String> {
    let running = get_running_flag();
    let mut is_running = running.lock().await;

    if *is_running {
        return Err("Claude Code is already running".to_string());
    }

    *is_running = true;
    let stop_flag = get_stop_flag();
    stop_flag.store(false, Ordering::Relaxed);

    drop(is_running); // Release lock before long operation

    let result = claude_cli::execute_claude_code(app, prompt, working_dir, stop_flag).await;

    // Reset running state
    let mut is_running = running.lock().await;
    *is_running = false;

    result
}

#[tauri::command]
async fn stop_claude_cli() -> Result<(), String> {
    let stop_flag = get_stop_flag();
    stop_flag.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
async fn is_claude_cli_running() -> Result<bool, String> {
    let running = get_running_flag();
    let is_running = running.lock().await;
    Ok(*is_running)
}

#[tauri::command]
fn move_ticket_to_status(
    project_path: String,
    ticket_id: String,
    new_status: String,
) -> Result<(), String> {
    let project_dir = PathBuf::from(&project_path).join(".m2k");

    // Find the current ticket file
    let folders = ["backlog", "inprogress", "done"];
    let mut source_path: Option<PathBuf> = None;

    for folder in &folders {
        let path = project_dir.join(folder).join(format!("{}.md", ticket_id));
        if path.exists() {
            source_path = Some(path);
            break;
        }
    }

    let source = source_path.ok_or(format!("Ticket {} not found", ticket_id))?;

    // Determine target folder
    let target_folder = match new_status.as_str() {
        "backlog" => "backlog",
        "in_progress" => "inprogress",
        "done" => "done",
        _ => return Err(format!("Invalid status: {}", new_status)),
    };

    let target = project_dir
        .join(target_folder)
        .join(format!("{}.md", ticket_id));

    // Move the file
    if source != target {
        fs::rename(&source, &target).map_err(|e| format!("Failed to move ticket: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn update_epic_ticket_status(
    project_path: String,
    epic_id: String,
    ticket_id: String,
    new_status: String,
) -> Result<(), String> {
    let epics_dir = PathBuf::from(&project_path)
        .join(".m2k")
        .join("epics");

    // Find the epic file
    let entries = fs::read_dir(&epics_dir)
        .map_err(|e| format!("Failed to read epics directory: {}", e))?;

    let mut epic_path: Option<PathBuf> = None;
    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with(&epic_id) && name.ends_with(".md") {
                epic_path = Some(path);
                break;
            }
        }
    }

    let epic_file = epic_path.ok_or(format!("Epic {} not found", epic_id))?;

    // Read and update the epic content
    let content = fs::read_to_string(&epic_file)
        .map_err(|e| format!("Failed to read epic file: {}", e))?;

    // Update the ticket status in the markdown table
    let updated = content
        .lines()
        .map(|line| {
            if line.contains(&ticket_id) && line.starts_with('|') {
                // Parse the table row and update status
                let parts: Vec<&str> = line.split('|').collect();
                if parts.len() >= 4 {
                    format!(
                        "| {} | {} | {} |",
                        parts[1].trim(),
                        parts[2].trim(),
                        new_status
                    )
                } else {
                    line.to_string()
                }
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    fs::write(&epic_file, updated).map_err(|e| format!("Failed to write epic file: {}", e))?;

    Ok(())
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
            generate_epic,
            check_claude_cli,
            get_claude_cli_version,
            start_claude_cli,
            stop_claude_cli,
            is_claude_cli_running,
            move_ticket_to_status,
            update_epic_ticket_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

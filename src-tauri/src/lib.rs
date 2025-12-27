mod db;
mod parser;
mod pty;
mod watcher;
use db::Project;
use keyring::Entry;
use parser::{Epic, Ticket};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
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
fn delete_markdown_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
}

#[tauri::command]
fn read_image_as_base64(path: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read image: {}", e))?;
    let base64_str = general_purpose::STANDARD.encode(&bytes);

    // Determine MIME type from extension
    let ext = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime_type = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    };

    Ok(format!("data:{};base64,{}", mime_type, base64_str))
}

#[tauri::command]
fn get_next_epic_id(project_path: String) -> Result<i64, String> {
    let next = db::get_and_increment_epic_counter(&project_path)?;
    // Increment stats
    db::increment_epic_stats(&project_path)?;
    Ok(next)
}

#[tauri::command]
fn get_next_ticket_id(project_path: String) -> Result<i64, String> {
    let next = db::get_and_increment_ticket_counter(&project_path)?;
    // New tickets start in backlog
    db::increment_ticket_stats(&project_path, "backlog")?;
    Ok(next)
}

#[tauri::command]
fn init_project_counters(project_path: String) -> Result<(), String> {
    // Scan existing files to determine initial counters
    let epics = parser::parse_epics(&project_path)?;
    let tickets = parser::parse_tickets(&project_path)?;

    let max_epic_id = epics
        .iter()
        .filter_map(|e| {
            e.id.strip_prefix("EPIC-")
                .and_then(|s| s.parse::<i64>().ok())
        })
        .max()
        .unwrap_or(0);

    let max_ticket_id = tickets
        .iter()
        .filter_map(|t| {
            t.id.strip_prefix("T-")
                .and_then(|s| s.parse::<i64>().ok())
        })
        .max()
        .unwrap_or(0);

    db::init_project_settings(&project_path, max_epic_id, max_ticket_id)?;

    // Also sync stats
    sync_stats_from_files(project_path)
}

#[tauri::command]
fn sync_stats_from_files(project_path: String) -> Result<(), String> {
    let tickets = parser::parse_tickets(&project_path)?;
    let epics = parser::parse_epics(&project_path)?;

    // Count tickets by status
    let backlog = tickets.iter().filter(|t| t.status == "backlog").count() as i64;
    let inprogress = tickets.iter().filter(|t| t.status == "in_progress").count() as i64;
    let done = tickets.iter().filter(|t| t.status == "done").count() as i64;

    // Calculate completed epics (all tickets done)
    let completed = epics.iter().filter(|epic| {
        let epic_tickets: Vec<_> = tickets.iter()
            .filter(|t| t.epic == epic.id)
            .collect();
        !epic_tickets.is_empty() && epic_tickets.iter().all(|t| t.status == "done")
    }).count() as i64;

    // Update all stats in DB
    db::with_connection(|conn| {
        conn.execute(
            "UPDATE project_settings
             SET total_epics = ?1, completed_epics = ?2,
                 total_tickets = ?3, backlog_tickets = ?4,
                 inprogress_tickets = ?5, done_tickets = ?6,
                 updated_at = datetime('now')
             WHERE project_path = ?7",
            rusqlite::params![
                epics.len() as i64, completed, tickets.len() as i64,
                backlog, inprogress, done, &project_path
            ],
        )?;
        Ok(())
    }).map_err(|e| format!("Failed to sync stats: {}", e))
}

#[tauri::command]
fn get_project_settings(project_path: String) -> Result<Option<db::ProjectSettings>, String> {
    db::get_project_settings(&project_path)
}

#[tauri::command]
fn update_project_counters(project_path: String, epic_counter: i64, ticket_counter: i64) -> Result<(), String> {
    db::update_project_counters(&project_path, epic_counter, ticket_counter)
}



#[tauri::command]
fn move_ticket_to_status(
    project_path: String,
    ticket_id: String,
    new_status: String,
) -> Result<(), String> {
    // Normalize path - if it already ends with .m2k, use as-is, otherwise append
    let project_dir = if project_path.ends_with(".m2k") || project_path.ends_with(".m2k/") {
        PathBuf::from(&project_path)
    } else {
        PathBuf::from(&project_path).join(".m2k")
    };

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
    // Normalize path - if it already ends with .m2k, use as-is, otherwise append
    let base_dir = if project_path.ends_with(".m2k") || project_path.ends_with(".m2k/") {
        PathBuf::from(&project_path)
    } else {
        PathBuf::from(&project_path).join(".m2k")
    };
    let epics_dir = base_dir.join("epics");

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
fn spawn_pty(app: AppHandle, working_dir: String, cols: u16, rows: u16) -> Result<u32, String> {
    pty::spawn_pty(app, working_dir, cols, rows)
}

#[tauri::command]
fn write_pty(pty_id: u32, data: String) -> Result<(), String> {
    pty::write_pty(pty_id, data)
}

#[tauri::command]
fn resize_pty(pty_id: u32, cols: u16, rows: u16) -> Result<(), String> {
    pty::resize_pty(pty_id, cols, rows)
}

#[tauri::command]
fn kill_pty(pty_id: u32) -> Result<(), String> {
    pty::kill_pty(pty_id)
}

// Project Registry Commands
#[tauri::command]
fn init_project_db() -> Result<(), String> {
    db::init_database()
}

#[tauri::command]
fn add_project(name: String, path: String) -> Result<Project, String> {
    db::add_project(&name, &path)
}

#[tauri::command]
fn get_all_projects() -> Result<Vec<Project>, String> {
    db::get_all_projects()
}

#[tauri::command]
fn get_project_by_path(path: String) -> Result<Option<Project>, String> {
    db::get_project_by_path(&path)
}

#[tauri::command]
fn update_project_last_accessed(id: i64) -> Result<(), String> {
    db::update_last_accessed(id)
}

#[tauri::command]
fn rename_project(id: i64, new_name: String) -> Result<(), String> {
    db::rename_project(id, &new_name)
}

#[tauri::command]
fn remove_project(id: i64) -> Result<(), String> {
    db::remove_project(id)
}

#[tauri::command]
fn set_app_state_value(key: String, value: String) -> Result<(), String> {
    db::set_app_state(&key, &value)
}

#[tauri::command]
fn get_app_state_value(key: String) -> Result<Option<String>, String> {
    db::get_app_state(&key)
}

#[tauri::command]
fn project_path_exists(path: String) -> Result<bool, String> {
    db::project_path_exists(&path)
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
fn init_m2k_folder(project_path: String) -> Result<String, String> {
    let m2k_path = PathBuf::from(&project_path).join(".m2k");

    // Create .m2k folder and subfolders
    let folders = ["backlog", "inprogress", "done", "epics", "resources"];

    for folder in folders {
        let folder_path = m2k_path.join(folder);
        fs::create_dir_all(&folder_path)
            .map_err(|e| format!("Failed to create {}: {}", folder, e))?;
    }

    // Create WORKFLOW.md if it doesn't exist
    let workflow_path = m2k_path.join("WORKFLOW.md");
    if !workflow_path.exists() {
        let workflow_content = r#"# M2K Workflow

## Folder Structure
- **backlog/**: Tickets waiting to be worked on
- **inprogress/**: Tickets currently being worked on
- **done/**: Completed tickets
- **epics/**: Epic definitions
- **resources/**: Project resources and documentation

## Ticket Lifecycle
1. Create ticket in backlog/
2. Move to inprogress/ when starting work
3. Move to done/ when completed
"#;
        fs::write(&workflow_path, workflow_content)
            .map_err(|e| format!("Failed to create WORKFLOW.md: {}", e))?;
    }

    Ok(m2k_path.to_string_lossy().to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileNode {
    name: String,
    path: String,
    is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<FileNode>>,
}

fn build_tree(path: &Path) -> Result<FileNode, String> {
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;

    let name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let path_str = path.to_string_lossy().to_string();

    if metadata.is_dir() {
        let mut children = Vec::new();

        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(child) = build_tree(&entry.path()) {
                    children.push(child);
                }
            }
        }

        // Sort: directories first, then files, both alphabetically
        children.sort_by(|a, b| {
            match (a.is_directory, b.is_directory) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.cmp(&b.name),
            }
        });

        Ok(FileNode {
            name,
            path: path_str,
            is_directory: true,
            children: Some(children),
        })
    } else {
        Ok(FileNode {
            name,
            path: path_str,
            is_directory: false,
            children: None,
        })
    }
}

#[tauri::command]
fn read_directory_tree(path: String) -> Result<FileNode, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    build_tree(path)
}

// File CRUD operations
#[tauri::command]
fn create_file(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    if file_path.exists() {
        return Err("File already exists".to_string());
    }

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::write(file_path, content)
        .map_err(|e| format!("Failed to create file: {}", e))
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn update_file(path: String, content: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err("File does not exist".to_string());
    }

    fs::write(&path, content)
        .map_err(|e| format!("Failed to update file: {}", e))
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err("File does not exist".to_string());
    }

    if file_path.is_dir() {
        return Err("Cannot delete directory with delete_file, use delete_folder instead".to_string());
    }

    fs::remove_file(file_path)
        .map_err(|e| format!("Failed to delete file: {}", e))
}

#[tauri::command]
fn create_folder(path: String) -> Result<(), String> {
    let folder_path = Path::new(&path);

    if folder_path.exists() {
        return Err("Folder already exists".to_string());
    }

    fs::create_dir_all(folder_path)
        .map_err(|e| format!("Failed to create folder: {}", e))
}

#[tauri::command]
fn delete_folder(path: String) -> Result<(), String> {
    let folder_path = Path::new(&path);

    if !folder_path.exists() {
        return Err("Folder does not exist".to_string());
    }

    if !folder_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    fs::remove_dir_all(folder_path)
        .map_err(|e| format!("Failed to delete folder: {}", e))
}

#[tauri::command]
fn rename_file_or_folder(old_path: String, new_path: String) -> Result<(), String> {
    let old = Path::new(&old_path);
    let new = Path::new(&new_path);

    if !old.exists() {
        return Err("Source path does not exist".to_string());
    }

    if new.exists() {
        return Err("Destination path already exists".to_string());
    }

    fs::rename(old, new)
        .map_err(|e| format!("Failed to rename: {}", e))
}

fn extract_project_name(project_path: &str) -> String {
    Path::new(project_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("project")
        .to_string()
}

fn sanitize_folder_name(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

fn generate_unique_project_folder(base_path: &Path, project_name: &str) -> PathBuf {
    let sanitized = sanitize_folder_name(project_name);
    let mut candidate = base_path.join(&sanitized);

    if !candidate.exists() {
        return candidate;
    }

    let mut counter = 1;
    loop {
        candidate = base_path.join(format!("{}-{}", sanitized, counter));
        if !candidate.exists() {
            break;
        }
        counter += 1;
    }

    candidate
}

fn validate_backup_path(backup_path: &Path, project_path: &Path) -> Result<(), String> {
    if !backup_path.exists() {
        return Err("Backup path does not exist".to_string());
    }

    if !backup_path.is_dir() {
        return Err("Backup path is not a directory".to_string());
    }

    let backup_canonical = backup_path.canonicalize()
        .map_err(|e| format!("Failed to resolve backup path: {}", e))?;
    let project_canonical = project_path.canonicalize()
        .map_err(|e| format!("Failed to resolve project path: {}", e))?;

    if backup_canonical.starts_with(&project_canonical) {
        return Err("Cannot backup to a location inside the project".to_string());
    }

    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    if !dst.exists() {
        fs::create_dir_all(dst)
            .map_err(|e| format!("Failed to create destination directory: {}", e))?;
    }

    for entry in fs::read_dir(src).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let file_name = entry.file_name();
        let dest_path = dst.join(&file_name);

        if path.is_dir() {
            copy_dir_recursive(&path, &dest_path)?;
        } else {
            fs::copy(&path, &dest_path)
                .map_err(|e| format!("Failed to copy file {}: {}", path.display(), e))?;
        }
    }

    Ok(())
}

#[tauri::command]
fn get_project_name(project_path: String) -> Result<String, String> {
    Ok(extract_project_name(&project_path))
}

#[tauri::command]
fn set_m2k_backup_path(project_path: String, backup_path: String) -> Result<(), String> {
    let backup_dir = Path::new(&backup_path);
    let project_dir = Path::new(&project_path);

    validate_backup_path(backup_dir, project_dir)?;

    db::set_backup_path(&project_path, &backup_path)
}

#[tauri::command]
fn get_m2k_backup_path(project_path: String) -> Result<Option<String>, String> {
    db::get_backup_path(&project_path)
}

#[tauri::command]
fn sync_m2k_backup(project_path: String) -> Result<String, String> {
    let backup_base = db::get_backup_path(&project_path)?
        .ok_or("No backup path configured for this project")?;

    let backup_base_path = Path::new(&backup_base);
    let project_dir = Path::new(&project_path);

    validate_backup_path(backup_base_path, project_dir)?;

    let m2k_source = project_dir.join(".m2k");
    if !m2k_source.exists() {
        return Err("No .m2k folder found in project".to_string());
    }

    let project_name = extract_project_name(&project_path);
    let project_backup_folder = generate_unique_project_folder(backup_base_path, &project_name);
    let m2k_destination = project_backup_folder.join(".m2k");

    if m2k_destination.exists() {
        fs::remove_dir_all(&m2k_destination)
            .map_err(|e| format!("Failed to remove existing backup: {}", e))?;
    }

    copy_dir_recursive(&m2k_source, &m2k_destination)?;

    Ok(m2k_destination.to_string_lossy().to_string())
}

#[tauri::command]
fn upload_resource(
    project_path: String,
    source_path: String,
    filename: Option<String>,
    destination_folder: Option<String>,
) -> Result<String, String> {
    let base_dir = if project_path.ends_with(".m2k") || project_path.ends_with(".m2k/") {
        PathBuf::from(&project_path)
    } else {
        PathBuf::from(&project_path).join(".m2k")
    };

    let resources_dir = base_dir.join("resources");

    fs::create_dir_all(&resources_dir)
        .map_err(|e| format!("Failed to create resources directory: {}", e))?;

    let source = Path::new(&source_path);
    if !source.exists() {
        return Err("Source file does not exist".to_string());
    }

    let file_name = filename.unwrap_or_else(|| {
        source
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string()
    });

    // Determine target directory
    let target_dir = if let Some(dest) = destination_folder {
        // Upload to specific folder
        resources_dir.join(dest)
    } else {
        // Auto-organize by file type
        let ext = Path::new(&file_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        let subfolder = match ext.as_str() {
            "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" | "bmp" | "ico" => "images",
            "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" => "documents",
            "fig" | "sketch" | "xd" | "psd" | "ai" => "designs",
            "md" | "markdown" | "txt" => "text",
            "mp4" | "mov" | "avi" | "mkv" | "webm" => "videos",
            "mp3" | "wav" | "ogg" | "m4a" => "audio",
            "zip" | "tar" | "gz" | "rar" | "7z" => "archives",
            _ => "other",
        };

        resources_dir.join(subfolder)
    };

    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create target directory: {}", e))?;

    let mut dest_path = target_dir.join(&file_name);

    // Handle duplicates: append (1), (2), etc.
    if dest_path.exists() {
        let stem = Path::new(&file_name)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy();
        let ext_str = Path::new(&file_name)
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();

        let mut counter = 1;
        loop {
            let new_name = format!("{} ({}){}", stem, counter, ext_str);
            dest_path = target_dir.join(&new_name);
            if !dest_path.exists() {
                break;
            }
            counter += 1;
        }
    }

    fs::copy(source, &dest_path)
        .map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            // Initialize database on startup
            if let Err(e) = db::init_database() {
                log::error!("Failed to initialize database: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            save_api_key,
            load_api_key,
            delete_api_key,
            has_api_key,
            parse_tickets,
            parse_epics,
            start_watcher,
            save_markdown_file,
            read_markdown_file,
            delete_markdown_file,
            read_image_as_base64,
            get_next_epic_id,
            get_next_ticket_id,
            init_project_counters,
            sync_stats_from_files,
            get_project_settings,
            update_project_counters,
            move_ticket_to_status,
            update_epic_ticket_status,
            spawn_pty,
            write_pty,
            resize_pty,
            kill_pty,
            init_project_db,
            add_project,
            get_all_projects,
            get_project_by_path,
            update_project_last_accessed,
            rename_project,
            remove_project,
            set_app_state_value,
            get_app_state_value,
            project_path_exists,
            path_exists,
            init_m2k_folder,
            read_directory_tree,
            create_file,
            read_file,
            update_file,
            delete_file,
            create_folder,
            delete_folder,
            rename_file_or_folder,
            upload_resource,
            get_project_name,
            set_m2k_backup_path,
            get_m2k_backup_path,
            sync_m2k_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

lazy_static::lazy_static! {
    static ref DB_CONNECTION: Mutex<Option<Connection>> = Mutex::new(None);
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub last_accessed: String,
}

fn get_db_path() -> Option<PathBuf> {
    dirs::data_dir().map(|p| p.join("m2k-app").join("projects.db"))
}

pub fn init_database() -> Result<(), String> {
    let db_path = get_db_path().ok_or("Could not determine data directory")?;

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Create projects table with indexes
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_accessed TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    ).map_err(|e| format!("Failed to create projects table: {}", e))?;

    // Create indexes
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path)",
        [],
    ).map_err(|e| format!("Failed to create path index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)",
        [],
    ).map_err(|e| format!("Failed to create name index: {}", e))?;

    // Create app_state table for persisting active project and sidebar state
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create app_state table: {}", e))?;

    // Create project_settings table for counters and per-project settings
    conn.execute(
        "CREATE TABLE IF NOT EXISTS project_settings (
            project_path TEXT PRIMARY KEY,
            epic_counter INTEGER NOT NULL DEFAULT 0,
            ticket_counter INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    ).map_err(|e| format!("Failed to create project_settings table: {}", e))?;

    let mut db_conn = DB_CONNECTION.lock().map_err(|e| e.to_string())?;
    *db_conn = Some(conn);

    Ok(())
}

fn with_connection<T, F>(f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> SqliteResult<T>,
{
    let db_conn = DB_CONNECTION.lock().map_err(|e| e.to_string())?;
    let conn = db_conn.as_ref().ok_or("Database not initialized")?;
    f(conn).map_err(|e| format!("Database error: {}", e))
}

pub fn add_project(name: &str, path: &str) -> Result<Project, String> {
    with_connection(|conn| {
        conn.execute(
            "INSERT INTO projects (name, path) VALUES (?1, ?2)",
            [name, path],
        )?;

        let id = conn.last_insert_rowid();
        let mut stmt = conn.prepare("SELECT id, name, path, created_at, last_accessed FROM projects WHERE id = ?1")?;
        stmt.query_row([id], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                created_at: row.get(3)?,
                last_accessed: row.get(4)?,
            })
        })
    })
}

pub fn get_all_projects() -> Result<Vec<Project>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, path, created_at, last_accessed FROM projects ORDER BY last_accessed DESC"
        )?;

        let projects = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                created_at: row.get(3)?,
                last_accessed: row.get(4)?,
            })
        })?;

        projects.collect()
    })
}

pub fn get_project_by_path(path: &str) -> Result<Option<Project>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, path, created_at, last_accessed FROM projects WHERE path = ?1"
        )?;

        match stmt.query_row([path], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                created_at: row.get(3)?,
                last_accessed: row.get(4)?,
            })
        }) {
            Ok(project) => Ok(Some(project)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    })
}

pub fn update_last_accessed(id: i64) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "UPDATE projects SET last_accessed = datetime('now') WHERE id = ?1",
            [id],
        )?;
        Ok(())
    })
}

pub fn rename_project(id: i64, new_name: &str) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "UPDATE projects SET name = ?1 WHERE id = ?2",
            rusqlite::params![new_name, id],
        )?;
        Ok(())
    })
}

pub fn remove_project(id: i64) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
        Ok(())
    })
}

pub fn set_app_state(key: &str, value: &str) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "INSERT OR REPLACE INTO app_state (key, value) VALUES (?1, ?2)",
            [key, value],
        )?;
        Ok(())
    })
}

pub fn get_app_state(key: &str) -> Result<Option<String>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare("SELECT value FROM app_state WHERE key = ?1")?;
        match stmt.query_row([key], |row| row.get::<_, String>(0)) {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    })
}

pub fn project_path_exists(path: &str) -> Result<bool, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare("SELECT 1 FROM projects WHERE path = ?1")?;
        match stmt.query_row([path], |_| Ok(())) {
            Ok(_) => Ok(true),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
            Err(e) => Err(e),
        }
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectSettings {
    pub project_path: String,
    pub epic_counter: i64,
    pub ticket_counter: i64,
}

pub fn init_project_settings(project_path: &str, epic_count: i64, ticket_count: i64) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "INSERT OR IGNORE INTO project_settings (project_path, epic_counter, ticket_counter)
             VALUES (?1, ?2, ?3)",
            rusqlite::params![project_path, epic_count, ticket_count],
        )?;
        Ok(())
    })
}

pub fn get_project_settings(project_path: &str) -> Result<Option<ProjectSettings>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT project_path, epic_counter, ticket_counter FROM project_settings WHERE project_path = ?1"
        )?;

        match stmt.query_row([project_path], |row| {
            Ok(ProjectSettings {
                project_path: row.get(0)?,
                epic_counter: row.get(1)?,
                ticket_counter: row.get(2)?,
            })
        }) {
            Ok(settings) => Ok(Some(settings)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    })
}

pub fn get_and_increment_epic_counter(project_path: &str) -> Result<i64, String> {
    with_connection(|conn| {
        // Get current counter
        let current: i64 = conn.query_row(
            "SELECT epic_counter FROM project_settings WHERE project_path = ?1",
            [project_path],
            |row| row.get(0),
        )?;

        let next = current + 1;

        // Increment counter
        conn.execute(
            "UPDATE project_settings SET epic_counter = ?1, updated_at = datetime('now') WHERE project_path = ?2",
            rusqlite::params![next, project_path],
        )?;

        Ok(next)
    })
}

pub fn get_and_increment_ticket_counter(project_path: &str) -> Result<i64, String> {
    with_connection(|conn| {
        // Get current counter
        let current: i64 = conn.query_row(
            "SELECT ticket_counter FROM project_settings WHERE project_path = ?1",
            [project_path],
            |row| row.get(0),
        )?;

        let next = current + 1;

        // Increment counter
        conn.execute(
            "UPDATE project_settings SET ticket_counter = ?1, updated_at = datetime('now') WHERE project_path = ?2",
            rusqlite::params![next, project_path],
        )?;

        Ok(next)
    })
}

pub fn update_project_counters(project_path: &str, epic_counter: i64, ticket_counter: i64) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "UPDATE project_settings SET epic_counter = ?1, ticket_counter = ?2, updated_at = datetime('now') WHERE project_path = ?3",
            rusqlite::params![epic_counter, ticket_counter, project_path],
        )?;
        Ok(())
    })
}

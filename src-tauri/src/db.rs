use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use crate::parser::{Epic, Ticket};

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
            total_epics INTEGER NOT NULL DEFAULT 0,
            completed_epics INTEGER NOT NULL DEFAULT 0,
            total_tickets INTEGER NOT NULL DEFAULT 0,
            backlog_tickets INTEGER NOT NULL DEFAULT 0,
            inprogress_tickets INTEGER NOT NULL DEFAULT 0,
            done_tickets INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    ).map_err(|e| format!("Failed to create project_settings table: {}", e))?;

    // Create epics table for MD snapshots
    conn.execute(
        "CREATE TABLE IF NOT EXISTS epics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            epic_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            scope TEXT,
            file_path TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    ).map_err(|e| format!("Failed to create epics table: {}", e))?;

    // Create tickets table for MD snapshots
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT NOT NULL UNIQUE,
            epic_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            file_path TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (epic_id) REFERENCES epics(epic_id)
        )",
        [],
    ).map_err(|e| format!("Failed to create tickets table: {}", e))?;

    // Create indexes for epics and tickets
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_epics_epic_id ON epics(epic_id)",
        [],
    ).map_err(|e| format!("Failed to create epics epic_id index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id)",
        [],
    ).map_err(|e| format!("Failed to create tickets ticket_id index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_tickets_epic_id ON tickets(epic_id)",
        [],
    ).map_err(|e| format!("Failed to create tickets epic_id index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)",
        [],
    ).map_err(|e| format!("Failed to create tickets status index: {}", e))?;

    // Migrate existing tables: add stats columns if missing
    let migrations = [
        "ALTER TABLE project_settings ADD COLUMN total_epics INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE project_settings ADD COLUMN completed_epics INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE project_settings ADD COLUMN total_tickets INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE project_settings ADD COLUMN backlog_tickets INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE project_settings ADD COLUMN inprogress_tickets INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE project_settings ADD COLUMN done_tickets INTEGER NOT NULL DEFAULT 0",
    ];

    for migration in &migrations {
        let _ = conn.execute(migration, []);
    }

    let mut db_conn = DB_CONNECTION.lock().map_err(|e| e.to_string())?;
    *db_conn = Some(conn);

    Ok(())
}

pub fn with_connection<T, F>(f: F) -> Result<T, String>
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
            "SELECT id, name, path, created_at, last_accessed FROM projects"
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
    pub total_epics: i64,
    pub completed_epics: i64,
    pub total_tickets: i64,
    pub backlog_tickets: i64,
    pub inprogress_tickets: i64,
    pub done_tickets: i64,
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
            "SELECT project_path, epic_counter, ticket_counter, total_epics, completed_epics,
                    total_tickets, backlog_tickets, inprogress_tickets, done_tickets
             FROM project_settings WHERE project_path = ?1"
        )?;

        match stmt.query_row([project_path], |row| {
            Ok(ProjectSettings {
                project_path: row.get(0)?,
                epic_counter: row.get(1)?,
                ticket_counter: row.get(2)?,
                total_epics: row.get(3)?,
                completed_epics: row.get(4)?,
                total_tickets: row.get(5)?,
                backlog_tickets: row.get(6)?,
                inprogress_tickets: row.get(7)?,
                done_tickets: row.get(8)?,
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

pub fn increment_epic_stats(project_path: &str) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "UPDATE project_settings
             SET total_epics = total_epics + 1,
                 updated_at = datetime('now')
             WHERE project_path = ?1",
            [project_path],
        )?;
        Ok(())
    })
}

pub fn increment_ticket_stats(project_path: &str, status: &str) -> Result<(), String> {
    let status_col = match status {
        "backlog" => "backlog_tickets",
        "in_progress" => "inprogress_tickets",
        "done" => "done_tickets",
        _ => return Err(format!("Invalid status: {}", status)),
    };

    with_connection(|conn| {
        conn.execute(
            &format!(
                "UPDATE project_settings
                 SET total_tickets = total_tickets + 1,
                     {} = {} + 1,
                     updated_at = datetime('now')
                 WHERE project_path = ?1",
                status_col, status_col
            ),
            [project_path],
        )?;
        Ok(())
    })
}

pub fn update_ticket_status_stats(
    project_path: &str,
    old_status: &str,
    new_status: &str,
) -> Result<(), String> {
    if old_status == new_status {
        return Ok(());
    }

    let old_col = match old_status {
        "backlog" => "backlog_tickets",
        "in_progress" => "inprogress_tickets",
        "done" => "done_tickets",
        _ => return Err(format!("Invalid old_status: {}", old_status)),
    };

    let new_col = match new_status {
        "backlog" => "backlog_tickets",
        "in_progress" => "inprogress_tickets",
        "done" => "done_tickets",
        _ => return Err(format!("Invalid new_status: {}", new_status)),
    };

    with_connection(|conn| {
        conn.execute(
            &format!(
                "UPDATE project_settings
                 SET {} = {} - 1,
                     {} = {} + 1,
                     updated_at = datetime('now')
                 WHERE project_path = ?1",
                old_col, old_col, new_col, new_col
            ),
            [project_path],
        )?;
        Ok(())
    })
}

pub fn update_epic_completion_stats(
    project_path: &str,
    completed_delta: i64,
) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "UPDATE project_settings
             SET completed_epics = completed_epics + ?1,
                 updated_at = datetime('now')
             WHERE project_path = ?2",
            rusqlite::params![completed_delta, project_path],
        )?;
        Ok(())
    })
}

// Backup path management
pub fn set_backup_path(project_path: &str, backup_path: &str) -> Result<(), String> {
    set_app_state(&format!("backup_path:{}", project_path), backup_path)
}

pub fn get_backup_path(project_path: &str) -> Result<Option<String>, String> {
    get_app_state(&format!("backup_path:{}", project_path))
}

// Epic and Ticket snapshot CRUD operations
pub fn upsert_epic(epic: &Epic, file_path: &str) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "INSERT OR REPLACE INTO epics (epic_id, title, scope, file_path, updated_at)
             VALUES (?1, ?2, ?3, ?4, datetime('now'))",
            rusqlite::params![epic.id, epic.title, epic.scope, file_path],
        )?;
        Ok(())
    })
}

pub fn upsert_ticket(ticket: &Ticket) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "INSERT OR REPLACE INTO tickets
             (ticket_id, epic_id, title, description, status, file_path, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))",
            rusqlite::params![
                ticket.id,
                if ticket.epic.is_empty() { None } else { Some(&ticket.epic) },
                ticket.title,
                ticket.description,
                ticket.status,
                ticket.file_path
            ],
        )?;
        Ok(())
    })
}

pub fn get_all_epics_snapshot(project_path: &str) -> Result<Vec<Epic>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT epic_id, title, scope FROM epics WHERE file_path LIKE ?1"
        )?;

        let pattern = format!("{}%", project_path);
        let epics = stmt.query_map([pattern], |row| {
            Ok(Epic {
                id: row.get(0)?,
                title: row.get(1)?,
                scope: row.get(2)?,
                tickets: Vec::new(),
            })
        })?;

        epics.collect()
    })
}

pub fn get_all_tickets_snapshot(project_path: &str) -> Result<Vec<Ticket>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT ticket_id, epic_id, title, description, status, file_path
             FROM tickets WHERE file_path LIKE ?1"
        )?;

        let pattern = format!("{}%", project_path);
        let tickets = stmt.query_map([pattern], |row| {
            Ok(Ticket {
                id: row.get(0)?,
                epic: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                title: row.get(2)?,
                description: row.get(3)?,
                status: row.get(4)?,
                file_path: row.get(5)?,
                criteria: Vec::new(),
            })
        })?;

        tickets.collect()
    })
}

pub fn get_tickets_by_epic(epic_id: &str) -> Result<Vec<Ticket>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT ticket_id, epic_id, title, description, status, file_path
             FROM tickets WHERE epic_id = ?1"
        )?;

        let tickets = stmt.query_map([epic_id], |row| {
            Ok(Ticket {
                id: row.get(0)?,
                epic: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                title: row.get(2)?,
                description: row.get(3)?,
                status: row.get(4)?,
                file_path: row.get(5)?,
                criteria: Vec::new(),
            })
        })?;

        tickets.collect()
    })
}

pub fn delete_epic(epic_id: &str) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute("DELETE FROM epics WHERE epic_id = ?1", [epic_id])?;
        Ok(())
    })
}

pub fn delete_ticket(ticket_id: &str) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute("DELETE FROM tickets WHERE ticket_id = ?1", [ticket_id])?;
        Ok(())
    })
}

pub fn sync_md_snapshots(project_path: &str) -> Result<(), String> {
    use crate::parser::{parse_epics, parse_tickets};

    // Parse all MD files
    let m2k_path = std::path::Path::new(project_path).join(".m2k");
    let epics = parse_epics(m2k_path.to_str().ok_or("Invalid path")?)?;
    let tickets = parse_tickets(m2k_path.to_str().ok_or("Invalid path")?)?;

    with_connection(|conn| {
        // Start transaction for atomicity
        conn.execute("BEGIN TRANSACTION", [])?;

        // Delete existing snapshots for this project
        let delete_result = (|| {
            conn.execute(
                "DELETE FROM epics WHERE file_path LIKE ?1",
                [format!("{}%", project_path)]
            )?;
            conn.execute(
                "DELETE FROM tickets WHERE file_path LIKE ?1",
                [format!("{}%", project_path)]
            )?;
            Ok::<(), rusqlite::Error>(())
        })();

        if let Err(e) = delete_result {
            let _ = conn.execute("ROLLBACK", []);
            return Err(e);
        }

        // Bulk insert epics
        for epic in &epics {
            let insert_result = conn.execute(
                "INSERT INTO epics (epic_id, title, scope, file_path, updated_at)
                 VALUES (?1, ?2, ?3, ?4, datetime('now'))",
                rusqlite::params![
                    epic.id,
                    epic.title,
                    epic.scope,
                    m2k_path.to_str().unwrap_or("")
                ],
            );

            if let Err(e) = insert_result {
                let _ = conn.execute("ROLLBACK", []);
                return Err(e);
            }
        }

        // Bulk insert tickets
        for ticket in &tickets {
            let insert_result = conn.execute(
                "INSERT INTO tickets
                 (ticket_id, epic_id, title, description, status, file_path, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))",
                rusqlite::params![
                    ticket.id,
                    if ticket.epic.is_empty() { None } else { Some(&ticket.epic) },
                    ticket.title,
                    ticket.description,
                    ticket.status,
                    ticket.file_path
                ],
            );

            if let Err(e) = insert_result {
                let _ = conn.execute("ROLLBACK", []);
                return Err(e);
            }
        }

        // Commit transaction
        conn.execute("COMMIT", [])?;
        Ok(())
    })
}

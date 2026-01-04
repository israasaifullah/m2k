use crate::db::with_connection;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Queued,
    Running,
    Completed,
    Failed,
    Timeout,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub prompt: String,
    pub status: TaskStatus,
    pub workspace_path: Option<String>,
    pub result: Option<String>,
    pub error: Option<String>,
    pub log_file: Option<String>,
    pub priority: i64,
    pub created_at: String,
    pub completed_at: Option<String>,
}

pub fn init_tasks_table() -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS claude_tasks (
                id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                status TEXT NOT NULL,
                workspace_path TEXT,
                result TEXT,
                error TEXT,
                log_file TEXT,
                priority INTEGER DEFAULT 5,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                completed_at TEXT
            )",
            [],
        )?;
        Ok(())
    })
}

pub fn create_task(prompt: String, workspace_path: Option<String>, priority: Option<i64>) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    with_connection(|conn| {
        conn.execute(
            "INSERT INTO claude_tasks (id, prompt, status, workspace_path, priority)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                task_id,
                prompt,
                "queued",
                workspace_path,
                priority.unwrap_or(5),
            ],
        )?;
        Ok(())
    })?;

    Ok(task_id)
}

pub fn update_task_status(
    task_id: &str,
    status: TaskStatus,
    result: Option<&str>,
    error: Option<&str>,
) -> Result<(), String> {
    let status_str = format!("{:?}", status).to_lowercase();

    with_connection(|conn| {
        conn.execute(
            "UPDATE claude_tasks
             SET status = ?1, result = ?2, error = ?3,
                 completed_at = CASE WHEN ?1 IN ('completed', 'failed', 'timeout')
                                THEN datetime('now') ELSE completed_at END
             WHERE id = ?4",
            rusqlite::params![status_str, result, error, task_id],
        )?;
        Ok(())
    })
}

pub fn set_task_log_file(task_id: &str, log_file: &str) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "UPDATE claude_tasks SET log_file = ?1 WHERE id = ?2",
            rusqlite::params![log_file, task_id],
        )?;
        Ok(())
    })
}

pub fn get_task(task_id: &str) -> Result<Option<Task>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, prompt, status, workspace_path, result, error, log_file, priority, created_at, completed_at
             FROM claude_tasks WHERE id = ?1"
        )?;

        match stmt.query_row([task_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                prompt: row.get(1)?,
                status: parse_status(&row.get::<_, String>(2)?),
                workspace_path: row.get(3)?,
                result: row.get(4)?,
                error: row.get(5)?,
                log_file: row.get(6)?,
                priority: row.get(7)?,
                created_at: row.get(8)?,
                completed_at: row.get(9)?,
            })
        }) {
            Ok(task) => Ok(Some(task)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    })
}

pub fn get_all_tasks() -> Result<Vec<Task>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, prompt, status, workspace_path, result, error, log_file, priority, created_at, completed_at
             FROM claude_tasks
             ORDER BY created_at DESC"
        )?;

        let tasks = stmt.query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                prompt: row.get(1)?,
                status: parse_status(&row.get::<_, String>(2)?),
                workspace_path: row.get(3)?,
                result: row.get(4)?,
                error: row.get(5)?,
                log_file: row.get(6)?,
                priority: row.get(7)?,
                created_at: row.get(8)?,
                completed_at: row.get(9)?,
            })
        })?;

        tasks.collect()
    })
}

fn parse_status(s: &str) -> TaskStatus {
    match s {
        "queued" => TaskStatus::Queued,
        "running" => TaskStatus::Running,
        "completed" => TaskStatus::Completed,
        "failed" => TaskStatus::Failed,
        "timeout" => TaskStatus::Timeout,
        _ => TaskStatus::Queued,
    }
}

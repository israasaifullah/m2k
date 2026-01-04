use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExecutionLog {
    pub task_id: String,
    pub timestamp: String,
    pub level: LogLevel,
    pub message: String,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum LogLevel {
    Info,
    Warning,
    Error,
    Debug,
}

#[derive(Clone)]
pub struct ClaudeLogger {
    log_dir: PathBuf,
}

impl ClaudeLogger {
    pub fn new(log_dir: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&log_dir)
            .map_err(|e| format!("Failed to create log dir: {}", e))?;

        Ok(Self { log_dir })
    }

    /// Create task-specific log file
    pub fn create_task_log(&self, task_id: &str) -> Result<PathBuf, String> {
        let log_path = self.log_dir.join(format!("{}.log", task_id));
        File::create(&log_path)
            .map_err(|e| format!("Failed to create log file: {}", e))?;
        Ok(log_path)
    }

    /// Append log entry
    pub fn log(
        &self,
        task_id: &str,
        level: LogLevel,
        message: &str,
        context: Option<serde_json::Value>,
    ) -> Result<(), String> {
        let log_path = self.log_dir.join(format!("{}.log", task_id));

        let entry = ExecutionLog {
            task_id: task_id.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            level,
            message: message.to_string(),
            context,
        };

        let log_line = format!(
            "[{}] {:?}: {}\n",
            entry.timestamp,
            entry.level,
            entry.message
        );

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .map_err(|e| format!("Failed to open log file: {}", e))?;

        file.write_all(log_line.as_bytes())
            .map_err(|e| format!("Failed to write log: {}", e))?;

        Ok(())
    }

    /// Read task logs
    pub fn read_task_log(&self, task_id: &str) -> Result<String, String> {
        let log_path = self.log_dir.join(format!("{}.log", task_id));

        if !log_path.exists() {
            return Ok(String::new());
        }

        fs::read_to_string(&log_path)
            .map_err(|e| format!("Failed to read log: {}", e))
    }

    /// Stream log file (tail -f style)
    pub fn get_log_path(&self, task_id: &str) -> PathBuf {
        self.log_dir.join(format!("{}.log", task_id))
    }

    /// Cleanup old logs (older than N days)
    pub fn cleanup_old_logs(&self, days: u64) -> Result<usize, String> {
        let cutoff = Utc::now() - chrono::Duration::days(days as i64);
        let mut removed = 0;

        for entry in fs::read_dir(&self.log_dir)
            .map_err(|e| format!("Failed to read log dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let metadata = entry.metadata()
                .map_err(|e| format!("Failed to get metadata: {}", e))?;

            if let Ok(modified) = metadata.modified() {
                let modified_time: chrono::DateTime<Utc> = modified.into();
                if modified_time < cutoff {
                    fs::remove_file(entry.path()).ok();
                    removed += 1;
                }
            }
        }

        Ok(removed)
    }
}

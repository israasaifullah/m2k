use std::path::{Path, PathBuf};
use std::fs;
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use crate::claude_logger::{ClaudeLogger, LogLevel};
use crate::claude_session::ClaudeSession;
use crate::task_manager::TaskStatus;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskRequest {
    pub prompt: String,
    pub workspace_path: Option<String>,
    pub timeout_secs: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskResult {
    pub task_id: String,
    pub status: TaskStatus,
    pub output: Option<String>,
    pub files_modified: Vec<String>,
    pub error: Option<String>,
    pub duration_ms: Option<u64>,
}

#[derive(Clone)]
pub struct ClaudeExecutor {
    workspace_base: PathBuf,
    logger: ClaudeLogger,
}

impl ClaudeExecutor {
    pub fn new(workspace_base: PathBuf) -> Result<Self, String> {
        let log_dir = workspace_base.join("logs");
        let logger = ClaudeLogger::new(log_dir)?;

        Ok(Self {
            workspace_base,
            logger,
        })
    }

    pub async fn execute_task(
        &self,
        task_id: &str,
        request: TaskRequest,
        app: AppHandle,
    ) -> Result<TaskResult, String> {
        // Check authentication before execution
        let session = ClaudeSession::check_auth_status()?;
        if !session.authenticated {
            return Err("Claude Code not authenticated. Run 'claude auth login' first.".to_string());
        }

        self.logger.log(
            task_id,
            LogLevel::Info,
            "Task execution started",
            Some(serde_json::json!({
                "prompt": request.prompt,
                "workspace": request.workspace_path,
            })),
        )?;

        let start = std::time::Instant::now();
        let workspace = self.create_workspace(task_id)?;

        // Log workspace creation
        self.logger.log(
            task_id,
            LogLevel::Debug,
            &format!("Workspace created: {}", workspace.display()),
            None,
        )?;

        // Copy files if needed
        if let Some(project_path) = &request.workspace_path {
            self.logger.log(
                task_id,
                LogLevel::Info,
                "Copying workspace files",
                None,
            )?;
            self.copy_workspace_files(project_path, &workspace)?;
        }

        // Execute with logging
        let output = self.execute_claude_code_with_logging(
            &workspace,
            &request.prompt,
            request.timeout_secs.unwrap_or(300),
            app.clone(),
            task_id,
        ).await?;

        let files_modified = self.scan_modified_files(&workspace)?;

        self.logger.log(
            task_id,
            LogLevel::Info,
            &format!("Task completed in {:?}", start.elapsed()),
            Some(serde_json::json!({
                "files_modified": files_modified.len(),
            })),
        )?;

        self.cleanup_workspace(&workspace)?;

        Ok(TaskResult {
            task_id: task_id.to_string(),
            status: TaskStatus::Completed,
            output: Some(output),
            files_modified,
            error: None,
            duration_ms: Some(start.elapsed().as_millis() as u64),
        })
    }

    fn create_workspace(&self, task_id: &str) -> Result<PathBuf, String> {
        let workspace = self.workspace_base.join(task_id);
        fs::create_dir_all(&workspace)
            .map_err(|e| format!("Failed to create workspace: {}", e))?;
        Ok(workspace)
    }

    fn copy_workspace_files(&self, source: &str, dest: &Path) -> Result<(), String> {
        let source_path = Path::new(source);
        if !source_path.exists() {
            return Err(format!("Source path does not exist: {}", source));
        }

        for entry in fs::read_dir(source_path)
            .map_err(|e| format!("Failed to read source dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let dest_path = dest.join(entry.file_name());

            if entry.path().is_dir() {
                self.copy_dir_recursive(&entry.path(), &dest_path)?;
            } else {
                fs::copy(&entry.path(), &dest_path)
                    .map_err(|e| format!("Failed to copy file: {}", e))?;
            }
        }

        Ok(())
    }

    fn copy_dir_recursive(&self, src: &Path, dst: &Path) -> Result<(), String> {
        fs::create_dir_all(dst)
            .map_err(|e| format!("Failed to create dir: {}", e))?;

        for entry in fs::read_dir(src)
            .map_err(|e| format!("Failed to read dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let dest_path = dst.join(entry.file_name());

            if entry.path().is_dir() {
                self.copy_dir_recursive(&entry.path(), &dest_path)?;
            } else {
                fs::copy(&entry.path(), &dest_path)
                    .map_err(|e| format!("Failed to copy file: {}", e))?;
            }
        }
        Ok(())
    }

    async fn execute_claude_code_with_logging(
        &self,
        workspace: &Path,
        prompt: &str,
        timeout_secs: u64,
        app: AppHandle,
        task_id: &str,
    ) -> Result<String, String> {
        let mut cmd = TokioCommand::new("claude");
        cmd.arg("--workspace")
            .arg(workspace)
            .arg("--prompt")
            .arg(prompt)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = cmd.spawn()
            .map_err(|e| {
                self.logger.log(task_id, LogLevel::Error, &format!("Failed to spawn: {}", e), None).ok();
                format!("Failed to spawn claude: {}", e)
            })?;

        let stdout = child.stdout.take()
            .ok_or("Failed to capture stdout")?;

        let stderr = child.stderr.take()
            .ok_or("Failed to capture stderr")?;

        let mut reader = BufReader::new(stdout).lines();
        let mut err_reader = BufReader::new(stderr).lines();
        let mut output = String::new();

        // Stream stdout with logging
        let logger_clone = self.logger.clone();
        let task_id_str = task_id.to_string();
        let app_clone = app.clone();

        tokio::spawn(async move {
            while let Ok(Some(line)) = reader.next_line().await {
                logger_clone.log(&task_id_str, LogLevel::Info, &line, None).ok();
                app_clone.emit("task-output", serde_json::json!({
                    "task_id": task_id_str,
                    "output": line
                })).ok();
            }
        });

        // Stream stderr with logging
        let logger_clone = self.logger.clone();
        let task_id_str = task_id.to_string();

        tokio::spawn(async move {
            while let Ok(Some(line)) = err_reader.next_line().await {
                logger_clone.log(&task_id_str, LogLevel::Warning, &line, None).ok();
            }
        });

        // Wait with timeout
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(timeout_secs),
            child.wait()
        ).await;

        match result {
            Ok(Ok(status)) => {
                if status.success() {
                    Ok(output)
                } else {
                    let err = format!("Claude exited with status: {}", status);
                    self.logger.log(task_id, LogLevel::Error, &err, None).ok();
                    Err(err)
                }
            }
            Ok(Err(e)) => {
                let err = format!("Failed to wait: {}", e);
                self.logger.log(task_id, LogLevel::Error, &err, None).ok();
                Err(err)
            }
            Err(_) => {
                child.kill().await.ok();
                let err = "Task timeout".to_string();
                self.logger.log(task_id, LogLevel::Error, &err, None).ok();
                Err(err)
            }
        }
    }

    fn scan_modified_files(&self, workspace: &Path) -> Result<Vec<String>, String> {
        let mut files = Vec::new();

        for entry in walkdir::WalkDir::new(workspace)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.path().is_file() {
                if let Some(path_str) = entry.path().to_str() {
                    files.push(path_str.to_string());
                }
            }
        }

        Ok(files)
    }

    fn cleanup_workspace(&self, workspace: &Path) -> Result<(), String> {
        fs::remove_dir_all(workspace)
            .map_err(|e| format!("Failed to cleanup workspace: {}", e))
    }
}

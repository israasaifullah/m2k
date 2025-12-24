use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as AsyncCommand;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeCliOutput {
    pub line: String,
    pub stream: String, // "stdout" or "stderr"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeCliResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub error: Option<String>,
}

/// Check if Claude Code CLI is installed and accessible
pub fn check_claude_code_installed() -> Result<bool, String> {
    let result = Command::new("claude").arg("--version").output();

    match result {
        Ok(output) => Ok(output.status.success()),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(false)
            } else {
                Err(format!("Failed to check Claude Code: {}", e))
            }
        }
    }
}

/// Get Claude Code version string
pub fn get_claude_code_version() -> Result<Option<String>, String> {
    let result = Command::new("claude").arg("--version").output();

    match result {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(Some(version))
            } else {
                Ok(None)
            }
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(None)
            } else {
                Err(format!("Failed to get Claude Code version: {}", e))
            }
        }
    }
}

/// Execute Claude Code CLI with a prompt
/// Streams output via Tauri events
pub async fn execute_claude_code(
    app: AppHandle,
    prompt: String,
    working_dir: String,
    stop_flag: Arc<AtomicBool>,
) -> Result<ClaudeCliResult, String> {
    // Spawn Claude Code process with the prompt
    let mut child = AsyncCommand::new("claude")
        .arg("--print") // Non-interactive mode, print response
        .arg("--dangerously-skip-permissions") // Skip permission prompts for automation
        .arg(&prompt)
        .current_dir(&working_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude Code: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let stop_stdout = stop_flag.clone();
    let stop_stderr = stop_flag.clone();

    // Stream stdout
    let stdout_handle = tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if stop_stdout.load(Ordering::Relaxed) {
                break;
            }
            let _ = app_stdout.emit(
                "claude-cli-output",
                ClaudeCliOutput {
                    line,
                    stream: "stdout".to_string(),
                },
            );
        }
    });

    // Stream stderr
    let stderr_handle = tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if stop_stderr.load(Ordering::Relaxed) {
                break;
            }
            let _ = app_stderr.emit(
                "claude-cli-output",
                ClaudeCliOutput {
                    line,
                    stream: "stderr".to_string(),
                },
            );
        }
    });

    // Wait for process to complete
    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for Claude Code: {}", e))?;

    // Wait for output handlers to finish
    let _ = stdout_handle.await;
    let _ = stderr_handle.await;

    Ok(ClaudeCliResult {
        success: status.success(),
        exit_code: status.code(),
        error: if status.success() {
            None
        } else {
            Some(format!("Claude Code exited with code {:?}", status.code()))
        },
    })
}

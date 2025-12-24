use log::{debug, error, info, warn};
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
    debug!("Checking if Claude Code CLI is installed");
    let result = Command::new("claude").arg("--version").output();

    match result {
        Ok(output) => {
            let installed = output.status.success();
            if installed {
                info!("Claude Code CLI is installed");
            } else {
                warn!("Claude Code CLI check failed with exit code: {:?}", output.status.code());
            }
            Ok(installed)
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                info!("Claude Code CLI not found in PATH");
                Ok(false)
            } else {
                error!("Failed to check Claude Code CLI: {}", e);
                Err(format!("Failed to check Claude Code: {}", e))
            }
        }
    }
}

/// Get Claude Code version string
pub fn get_claude_code_version() -> Result<Option<String>, String> {
    debug!("Getting Claude Code CLI version");
    let result = Command::new("claude").arg("--version").output();

    match result {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                info!("Claude Code CLI version: {}", version);
                Ok(Some(version))
            } else {
                warn!("Could not get Claude Code version");
                Ok(None)
            }
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                debug!("Claude Code CLI not found");
                Ok(None)
            } else {
                error!("Failed to get Claude Code version: {}", e);
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
    info!("Starting Claude Code execution");
    debug!("Working directory: {}", working_dir);
    debug!("Prompt length: {} chars", prompt.len());

    // Spawn Claude Code process with the prompt
    info!("Spawning Claude Code process");
    let mut child = AsyncCommand::new("claude")
        .arg("--print") // Non-interactive mode, print response
        .arg("--dangerously-skip-permissions") // Skip permission prompts for automation
        .arg(&prompt)
        .current_dir(&working_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            error!("Failed to spawn Claude Code process: {}", e);
            format!("Failed to spawn Claude Code: {}", e)
        })?;

    let pid = child.id();
    info!("Claude Code process spawned with PID: {:?}", pid);

    let stdout = child.stdout.take().ok_or_else(|| {
        error!("Failed to capture stdout");
        "Failed to capture stdout"
    })?;
    let stderr = child.stderr.take().ok_or_else(|| {
        error!("Failed to capture stderr");
        "Failed to capture stderr"
    })?;

    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let stop_stdout = stop_flag.clone();
    let stop_stderr = stop_flag.clone();

    // Stream stdout
    let stdout_handle = tokio::spawn(async move {
        debug!("Starting stdout reader");
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        let mut line_count = 0;
        while let Ok(Some(line)) = lines.next_line().await {
            if stop_stdout.load(Ordering::Relaxed) {
                info!("Stdout reader stopped by flag");
                break;
            }
            line_count += 1;
            debug!("[stdout:{}] {}", line_count, &line[..line.len().min(100)]);
            let _ = app_stdout.emit(
                "claude-cli-output",
                ClaudeCliOutput {
                    line,
                    stream: "stdout".to_string(),
                },
            );
        }
        debug!("Stdout reader finished, {} lines processed", line_count);
    });

    // Stream stderr
    let stderr_handle = tokio::spawn(async move {
        debug!("Starting stderr reader");
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        let mut line_count = 0;
        while let Ok(Some(line)) = lines.next_line().await {
            if stop_stderr.load(Ordering::Relaxed) {
                info!("Stderr reader stopped by flag");
                break;
            }
            line_count += 1;
            warn!("[stderr:{}] {}", line_count, line);
            let _ = app_stderr.emit(
                "claude-cli-output",
                ClaudeCliOutput {
                    line,
                    stream: "stderr".to_string(),
                },
            );
        }
        debug!("Stderr reader finished, {} lines processed", line_count);
    });

    // Wait for process to complete
    info!("Waiting for Claude Code process to complete");
    let status = child.wait().await.map_err(|e| {
        error!("Failed to wait for Claude Code process: {}", e);
        format!("Failed to wait for Claude Code: {}", e)
    })?;

    // Wait for output handlers to finish
    debug!("Waiting for output handlers to finish");
    let _ = stdout_handle.await;
    let _ = stderr_handle.await;

    let exit_code = status.code();
    if status.success() {
        info!("Claude Code process completed successfully");
    } else {
        error!("Claude Code process failed with exit code: {:?}", exit_code);
    }

    Ok(ClaudeCliResult {
        success: status.success(),
        exit_code,
        error: if status.success() {
            None
        } else {
            Some(format!("Claude Code exited with code {:?}", exit_code))
        },
    })
}

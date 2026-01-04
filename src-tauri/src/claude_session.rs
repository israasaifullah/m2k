use std::process::{Command, Stdio};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

lazy_static::lazy_static! {
    static ref SESSION_STATE: Mutex<SessionState> = Mutex::new(SessionState::default());
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionState {
    pub authenticated: bool,
    pub user_email: Option<String>,
    pub last_check: Option<String>,
}

impl Default for SessionState {
    fn default() -> Self {
        Self {
            authenticated: false,
            user_email: None,
            last_check: None,
        }
    }
}

pub struct ClaudeSession;

impl ClaudeSession {
    /// Check if Claude Code is authenticated
    pub fn check_auth_status() -> Result<SessionState, String> {
        let output = Command::new("claude")
            .arg("auth")
            .arg("status")
            .output()
            .map_err(|e| format!("Failed to check auth: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        let authenticated = output.status.success() && stdout.contains("Logged in");
        let user_email = Self::extract_email(&stdout);

        let state = SessionState {
            authenticated,
            user_email,
            last_check: Some(chrono::Utc::now().to_rfc3339()),
        };

        // Update global state
        if let Ok(mut session) = SESSION_STATE.lock() {
            *session = state.clone();
        }

        Ok(state)
    }

    /// Login to Claude Code (interactive)
    pub fn login() -> Result<(), String> {
        let status = Command::new("claude")
            .arg("auth")
            .arg("login")
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()
            .map_err(|e| format!("Failed to login: {}", e))?;

        if !status.success() {
            return Err("Login failed".to_string());
        }

        // Update state
        Self::check_auth_status()?;
        Ok(())
    }

    /// Logout from Claude Code
    pub fn logout() -> Result<(), String> {
        let status = Command::new("claude")
            .arg("auth")
            .arg("logout")
            .status()
            .map_err(|e| format!("Failed to logout: {}", e))?;

        if !status.success() {
            return Err("Logout failed".to_string());
        }

        // Clear state
        if let Ok(mut session) = SESSION_STATE.lock() {
            *session = SessionState::default();
        }

        Ok(())
    }

    /// Get cached session state
    pub fn get_cached_state() -> SessionState {
        SESSION_STATE.lock()
            .map(|s| s.clone())
            .unwrap_or_default()
    }

    fn extract_email(output: &str) -> Option<String> {
        // Parse email from "Logged in as: user@example.com"
        output.lines()
            .find(|line| line.contains("Logged in as"))
            .and_then(|line| line.split(':').nth(1))
            .map(|email| email.trim().to_string())
    }
}

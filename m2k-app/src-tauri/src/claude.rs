use keyring::Entry;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

const CLAUDE_API_URL: &str = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL: &str = "claude-sonnet-4-20250514";
const KEYRING_SERVICE: &str = "m2k-app";
const KEYRING_USER: &str = "anthropic-api-key";

#[derive(Debug, Serialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<ClaudeMessage>,
}

#[derive(Debug, Deserialize)]
struct ClaudeContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContentBlock>,
}

#[derive(Debug, Deserialize)]
struct ClaudeError {
    error: ClaudeErrorDetail,
}

#[derive(Debug, Deserialize)]
struct ClaudeErrorDetail {
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedTicket {
    pub id: String,
    pub title: String,
    pub description: String,
    pub criteria: Vec<String>,
    pub technical_notes: String,
    pub dependencies: String,
    pub testing: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedEpic {
    pub id: String,
    pub title: String,
    pub scope: String,
    pub tickets: Vec<GeneratedTicket>,
}

pub async fn validate_api_key(api_key: &str) -> Result<bool, String> {
    let client = Client::new();

    let request = ClaudeRequest {
        model: CLAUDE_MODEL.to_string(),
        max_tokens: 1,
        system: "Reply with 'ok'.".to_string(),
        messages: vec![ClaudeMessage {
            role: "user".to_string(),
            content: "test".to_string(),
        }],
    };

    let response = client
        .post(CLAUDE_API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    let status = response.status();
    if status.is_success() {
        Ok(true)
    } else if status.as_u16() == 401 {
        Err("Invalid API key".to_string())
    } else {
        let body = response.text().await.unwrap_or_default();
        if let Ok(error) = serde_json::from_str::<ClaudeError>(&body) {
            Err(error.error.message)
        } else {
            Err(format!("API error ({})", status))
        }
    }
}

fn get_api_key() -> Result<String, String> {
    // Try keyring first
    if let Ok(entry) = Entry::new(KEYRING_SERVICE, KEYRING_USER) {
        if let Ok(key) = entry.get_password() {
            return Ok(key);
        }
    }
    // Fall back to environment variables
    env::var("ANTHROPIC_API_KEY")
        .or_else(|_| env::var("CLAUDE_API_KEY"))
        .map_err(|_| "No API key configured. Please add your Anthropic API key in Settings.".to_string())
}

pub async fn generate_epic_and_tickets(
    requirements: String,
    next_epic_id: u32,
    next_ticket_id: u32,
) -> Result<GeneratedEpic, String> {
    let api_key = get_api_key()?;
    let client = Client::new();

    let system_prompt = format!(
        r#"You are an expert software project manager. Generate a well-structured EPIC with tickets from the given requirements.

IMPORTANT RULES:
1. Keep epics focused: 3-8 tickets maximum
2. Each ticket should be completable in one coding session
3. Use clear, actionable descriptions
4. Output ONLY valid JSON, no markdown or explanation

Use these IDs:
- Epic ID: EPIC-{epic_id:03}
- First ticket ID starts at: T-{ticket_id:03}

Output format (strict JSON):
{{
  "id": "EPIC-XXX",
  "title": "Epic Title",
  "scope": "Brief description of what this epic covers",
  "tickets": [
    {{
      "id": "T-XXX",
      "title": "Ticket title",
      "description": "What needs to be done",
      "criteria": ["Acceptance criterion 1", "Acceptance criterion 2"],
      "technical_notes": "Technical implementation notes",
      "dependencies": "Any dependencies or prerequisites",
      "testing": "How to test this ticket"
    }}
  ]
}}"#,
        epic_id = next_epic_id,
        ticket_id = next_ticket_id
    );

    let request = ClaudeRequest {
        model: CLAUDE_MODEL.to_string(),
        max_tokens: 4096,
        system: system_prompt,
        messages: vec![ClaudeMessage {
            role: "user".to_string(),
            content: format!("Generate an EPIC and tickets for:\n\n{}", requirements),
        }],
    };

    let response = client
        .post(CLAUDE_API_URL)
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to call Claude API: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        if let Ok(error) = serde_json::from_str::<ClaudeError>(&body) {
            return Err(format!("Claude API error: {}", error.error.message));
        }
        return Err(format!("Claude API error ({}): {}", status, body));
    }

    let claude_response: ClaudeResponse =
        serde_json::from_str(&body).map_err(|e| format!("Failed to parse response: {}", e))?;

    let text = claude_response
        .content
        .iter()
        .filter_map(|block| {
            if block.content_type == "text" {
                block.text.clone()
            } else {
                None
            }
        })
        .collect::<Vec<_>>()
        .join("");

    // Extract JSON from response (handle potential markdown wrapping)
    let json_text = if text.contains("```json") {
        text.split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&text)
            .trim()
    } else if text.contains("```") {
        text.split("```")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&text)
            .trim()
    } else {
        text.trim()
    };

    serde_json::from_str(json_text)
        .map_err(|e| format!("Failed to parse generated content: {}. Raw: {}", e, json_text))
}

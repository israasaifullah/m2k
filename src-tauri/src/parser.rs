use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Ticket {
    pub id: String,
    pub title: String,
    pub epic: String,
    pub description: String,
    pub criteria: Vec<String>,
    pub status: String,
    pub file_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Epic {
    pub id: String,
    pub title: String,
    pub scope: String,
    pub tickets: Vec<String>,
    pub file_path: String,
}

pub fn parse_tickets(project_path: &str) -> Result<Vec<Ticket>, String> {
    let mut tickets = Vec::new();
    let folders = ["backlog", "in-progress", "inprogress", "done"];

    for folder in folders {
        let folder_path = Path::new(project_path).join(folder);
        if !folder_path.exists() {
            continue;
        }

        let folder_tickets = collect_markdown_files(&folder_path, |path| {
            parse_ticket_file(path, folder)
        });
        tickets.extend(folder_tickets);
    }

    Ok(tickets)
}

pub fn parse_ticket_file(path: &Path, folder: &str) -> Option<Ticket> {
    let content = fs::read_to_string(path).ok()?;
    let file_name = path.file_stem()?.to_str()?;

    let id = file_name.to_string();
    let title = extract_title(&content).unwrap_or_else(|| id.clone());
    let epic = extract_epic(&content).unwrap_or_default();
    let description = extract_description(&content).unwrap_or_default();
    let criteria = extract_criteria(&content);
    let status = folder_to_status(folder);

    Some(Ticket {
        id,
        title,
        epic,
        description,
        criteria,
        status,
        file_path: path.to_string_lossy().to_string(),
    })
}

fn extract_title(content: &str) -> Option<String> {
    let re = Regex::new(r"^#\s+(.+)").ok()?;
    for line in content.lines() {
        if let Some(caps) = re.captures(line) {
            let title = caps.get(1)?.as_str().to_string();
            // Remove ticket ID prefix if present (e.g., "T-004: Title" -> "Title")
            if let Some(idx) = title.find(':') {
                return Some(title[idx + 1..].trim().to_string());
            }
            return Some(title);
        }
    }
    None
}

fn extract_epic(content: &str) -> Option<String> {
    let re = Regex::new(r"\*\*Epic:\*\*\s*(EPIC-\d+)").ok()?;
    re.captures(content)
        .and_then(|caps| caps.get(1).map(|m| m.as_str().to_string()))
}

fn extract_description(content: &str) -> Option<String> {
    let re = Regex::new(r"(?s)## Description\s*\n(.+?)(?:\n##|\z)").ok()?;
    re.captures(content)
        .and_then(|caps| caps.get(1).map(|m| m.as_str().trim().to_string()))
}

fn extract_criteria(content: &str) -> Vec<String> {
    let re = Regex::new(r"(?s)## Acceptance Criteria\s*\n(.+?)(?:\n##|\z)").ok();
    if let Some(re) = re {
        if let Some(caps) = re.captures(content) {
            if let Some(section) = caps.get(1) {
                return section
                    .as_str()
                    .lines()
                    .filter(|line| line.trim().starts_with('-'))
                    .map(|line| line.trim().trim_start_matches('-').trim().to_string())
                    .collect();
            }
        }
    }
    Vec::new()
}

fn folder_to_status(folder: &str) -> String {
    match folder {
        "backlog" => "backlog".to_string(),
        "in-progress" | "inprogress" => "in_progress".to_string(),
        "done" => "done".to_string(),
        _ => "backlog".to_string(),
    }
}

fn collect_markdown_files<T, F>(path: &Path, parser: F) -> Vec<T>
where
    F: Fn(&Path) -> Option<T>,
{
    let mut results = Vec::new();

    for entry in WalkDir::new(path)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();
        if entry_path.is_file() && entry_path.extension().map_or(false, |ext| ext == "md") {
            if let Some(item) = parser(entry_path) {
                results.push(item);
            }
        }
    }

    results
}

pub fn parse_epics(project_path: &str) -> Result<Vec<Epic>, String> {
    let epics_path = Path::new(project_path).join("epics");

    if !epics_path.exists() {
        return Ok(Vec::new());
    }

    let epics = collect_markdown_files(&epics_path, parse_epic_file);

    Ok(epics)
}

pub fn parse_epic_file(path: &Path) -> Option<Epic> {
    let content = fs::read_to_string(path).ok()?;
    let file_name = path.file_stem()?.to_str()?;

    // Extract EPIC-XXX from filename like "EPIC-002-Project-Setup.md"
    let id_re = Regex::new(r"(EPIC-\d+)").ok()?;
    let id = id_re
        .captures(file_name)
        .and_then(|caps| caps.get(1).map(|m| m.as_str().to_string()))
        .unwrap_or_else(|| file_name.to_string());

    let title = extract_title(&content).unwrap_or_else(|| id.clone());
    let scope = extract_scope(&content).unwrap_or_default();
    let tickets = extract_ticket_refs(&content);

    Some(Epic {
        id,
        title,
        scope,
        tickets,
        file_path: path.to_string_lossy().to_string(),
    })
}


fn extract_scope(content: &str) -> Option<String> {
    let re = Regex::new(r"(?s)## Scope\s*\n(.+?)(?:\n##|\z)").ok()?;
    re.captures(content)
        .and_then(|caps| caps.get(1).map(|m| m.as_str().trim().to_string()))
}

fn extract_ticket_refs(content: &str) -> Vec<String> {
    let re = Regex::new(r"\|\s*(T-\d+)\s*\|").ok();
    if let Some(re) = re {
        return re
            .captures_iter(content)
            .filter_map(|caps| caps.get(1).map(|m| m.as_str().to_string()))
            .collect();
    }
    Vec::new()
}

# T-138: Create Full Sync Command

**Epic:** EPIC-023

## Description
Implement `sync_md_to_db` command that scans all MD files and overwrites database (MD is source of truth). Expose via Tauri command.

### Implementation
- Function in `db.rs`: `sync_md_snapshots(project_path: &str) -> Result<(), String>`
- Logic:
  1. Call `parser::parse_epics()` and `parser::parse_tickets()`
  2. Begin transaction
  3. Delete existing epics/tickets for project_path
  4. Bulk insert parsed data via `upsert_epic()` / `upsert_ticket()`
  5. Commit transaction
- Tauri command in `lib.rs`: `#[tauri::command] fn sync_md_to_db(project_path: String) -> Result<(), String>`

## Acceptance Criteria
- [ ] Full sync completes in <500ms for 100 tickets
- [ ] Transaction ensures atomicity (all-or-nothing)
- [ ] Errors rollback changes
- [ ] Command exposed to frontend
- [ ] Handles missing/invalid MD files gracefully (logs warning, continues)

## Dependencies
T-137

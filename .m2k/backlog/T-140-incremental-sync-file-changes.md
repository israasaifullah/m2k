# T-140: Implement Incremental Sync on File Create/Modify

**Epic:** EPIC-023

## Description
Hook into existing file watcher (`watcher.rs`) to trigger incremental DB updates when MD files are created/modified.

### Implementation
- Add new event handler in `watcher.rs`: `handle_md_file_change(path: &Path, event_kind: EventKind)`
- Logic:
  - Detect if path is epic or ticket (match on folder/filename pattern)
  - Parse single file via `parser::parse_ticket_file()` / `parser::parse_epic_file()` (make these public)
  - Call `db::upsert_ticket()` / `db::upsert_epic()`
- Emit event to frontend: `app.emit("md-synced", {file_path, status})`

## Acceptance Criteria
- [ ] Creating new ticket/epic MD file updates DB within 100ms
- [ ] Editing MD content updates DB
- [ ] No duplicate syncs (debounce rapid edits within 500ms)
- [ ] Deletion events handled (call `delete_ticket/epic`)
- [ ] Frontend receives sync confirmation events

## Dependencies
T-138

# T-137: Implement Database CRUD Operations

**Epic:** EPIC-023

## Description
Add Rust functions in `db.rs` for upsert, query, and delete operations on epics/tickets. Reuse `with_connection()` pattern.

### Functions to Implement
```rust
pub fn upsert_epic(epic: &Epic) -> Result<(), String>
pub fn upsert_ticket(ticket: &Ticket) -> Result<(), String>
pub fn get_all_epics(project_path: &str) -> Result<Vec<Epic>, String>
pub fn get_all_tickets(project_path: &str) -> Result<Vec<Ticket>, String>
pub fn get_tickets_by_epic(epic_id: &str) -> Result<Vec<Ticket>, String>
pub fn delete_epic(epic_id: &str) -> Result<(), String>
pub fn delete_ticket(ticket_id: &str) -> Result<(), String>
```

## Acceptance Criteria
- [ ] All functions use `with_connection()` helper
- [ ] Upsert logic: INSERT OR REPLACE based on epic_id/ticket_id
- [ ] Delete operations clean up FK relationships
- [ ] Return proper error messages for DB failures
- [ ] Functions serialize/deserialize parser structs to DB rows

## Dependencies
T-136

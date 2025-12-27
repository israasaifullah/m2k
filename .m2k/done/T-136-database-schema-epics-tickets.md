# T-136: Design & Create Database Schema for Epics and Tickets

**Epic:** EPIC-023

## Description
Create `epics` and `tickets` tables in SQLite with proper relationships and indexes. Follow existing db.rs patterns.

### Tables to Create
**epics:**
- id (INTEGER PRIMARY KEY)
- epic_id (TEXT UNIQUE)
- title (TEXT)
- scope (TEXT)
- file_path (TEXT)
- created_at (TEXT)
- updated_at (TEXT)

**tickets:**
- id (INTEGER PRIMARY KEY)
- ticket_id (TEXT UNIQUE)
- epic_id (TEXT)
- title (TEXT)
- description (TEXT)
- status (TEXT)
- file_path (TEXT)
- created_at (TEXT)
- updated_at (TEXT)
- FOREIGN KEY (epic_id) REFERENCES epics(epic_id)

## Acceptance Criteria
- [ ] Migration logic in `db.rs` creates tables on init if not exist
- [ ] Foreign key constraint: `tickets.epic_id` references `epics.epic_id`
- [ ] Indexes on: `epics.epic_id`, `tickets.ticket_id`, `tickets.epic_id`, `tickets.status`
- [ ] Schema follows existing naming conventions (snake_case columns, datetime fields)
- [ ] `init_database()` function updated to create new tables

## Dependencies
None

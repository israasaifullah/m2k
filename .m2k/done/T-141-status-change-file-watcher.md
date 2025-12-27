# T-141: Handle Status Change Moves via File Watcher

**Epic:** EPIC-023

## Description
Detect when tickets are moved between folders (backlog/inprogress/done) and update DB status field. Leverage existing file watcher.

### Implementation
- Enhance `handle_md_file_change` to detect Move/Rename events
- On file move:
  1. Extract ticket_id from filename
  2. Determine new status from destination folder (backlog/inprogress/done)
  3. Update DB: `UPDATE tickets SET status = ?1 WHERE ticket_id = ?2`
  4. Keep `update_ticket_status_stats()` logic for counters
- Handle edge case: file moved outside .m2k (delete from DB)

## Acceptance Criteria
- [ ] Moving ticket file updates status in DB automatically
- [ ] Status field matches folder location (backlog/in_progress/done)
- [ ] Works when LLM/external tools move files (not just UI)
- [ ] Updates `project_settings` status counters correctly
- [ ] Deletion of MD file removes from DB

## Dependencies
T-140

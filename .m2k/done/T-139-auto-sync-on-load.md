# T-139: Trigger Auto-Sync on Project Load

**Epic:** EPIC-023

## Description
Call `sync_md_to_db` automatically when project is loaded/activated in frontend. Ensures DB always reflects current MD state.

### Implementation
- Update frontend: call `invoke('sync_md_to_db')` after `invoke('init_project_counters')` in project load sequence
- Add loading state to UI during sync
- Log sync result (success/error count) to console

## Acceptance Criteria
- [ ] Sync runs on every project open/switch
- [ ] UI shows "Syncing project data..." indicator
- [ ] Sync errors don't block project load (fallback to MD parsing)
- [ ] No race condition with file watcher

## Dependencies
T-138

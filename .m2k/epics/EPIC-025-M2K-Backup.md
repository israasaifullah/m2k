# EPIC-023: .m2k Folder Backup

## Scope
Enable users to backup .m2k folder to external location when .m2k is gitignored. Provides right-click actions to set backup path and sync .m2k contents. Each project gets unique backup folder at `/backup-path/project-name/.m2k`.

## Tickets

| ID | Description | Status |
|----|-------------|--------|
| T-125 | Add context menu items for backup actions | N/A |
| T-126 | Implement backup path configuration storage | N/A |
| T-127 | Implement project name detection | done |
| T-128 | Implement sync/backup logic | done |
| T-129 | Handle edge cases and validations | done |
| T-130 | Add backup status indicators | done |

## Implementation Notes

T-125 and T-126 were not found in backlog (content didn't match epic requirements).
Implemented complete backup feature in Settings page with:
- Backup path configuration UI
- Project name detection and sanitization
- Sync/backup logic with recursive copy
- Edge case validations (path validation, circular backup prevention)
- Status indicators and user feedback

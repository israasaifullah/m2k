# Workflow & Task Management

This document describes the epic and ticket workflow for the FOAMMS Mobile project.

## Directory Structure

```
.m2k/
  epics/        # Epic definitions (EPIC-XXX-<name>.md)
  backlog/      # Tickets ready for work (T-XXX-<name>.md)
  in-progress/  # Currently being worked on
  done/         # Completed (archive)
  templates/    # Epic and ticket templates
```

## Ticket Lifecycle

```
backlog/ → in-progress/ → done/
```

## Branch & Commit Convention

**Branch names:**
- Features: `feature/<description>` (e.g., `feature/{epic_tag}/{ticket_tag}/user-registration`)
- Bugfixes: `bugfix/<description>` (e.g., `bugfix/{epic_tag}/{ticket_tag}/date-format-ios`)

**Commit messages** (include ticket reference):
```
feat(scope): description (T-XXX)
fix(scope): description (T-XXX)
refactor(scope): description (T-XXX)
```

Examples:
- `feat(auth): add registration form UI (T-020)`
- `fix(complaints): resolve date parsing issue (T-045)`

## Ticket Sizing

| Size | Effort | Example |
|------|--------|---------|
| XS | < 30 min | Add a button, fix typo |
| S | 30 min - 2 hrs | New widget, API integration |
| M | 2 - 4 hrs | New feature page, complex component |
| L | 4+ hrs | **Split into smaller tickets** |

## Working with Claude Code

| Command | Action |
|---------|--------|
| "Create epic for X" | Analyze requirements, create epic with tickets |
| "Show backlog" | List all tickets in backlog |
| "Work on T-XXX" | Start implementation of specific ticket |
| "Status update" | Show current in-progress work |
| "Complete T-XXX" | Move ticket to done, update epic |

## Implementation Flow

1. **User**: "Work on T-001"
2. **Claude**:
   - Reads ticket from `docs/backlog/T-001-<name>.md`
   - Creates branch: `feature/<name>`
   - Moves ticket to `docs/in-progress/`
   - Implements according to acceptance criteria
   - Commits with ticket reference
   - Creates PR
3. **User**: Reviews and merges
4. **Claude**: Moves ticket to `docs/done/`

## Templates

- Epic template: `docs/templates/EPIC_TEMPLATE.md`
- Ticket template: `docs/templates/TICKET_TEMPLATE.md`

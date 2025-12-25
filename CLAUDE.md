# CLAUDE.md
Be extremely concise. Sacrifice grammar for concision.
In plan mode, always use multi-phase execution.

# WORKFLOW
## .m2k Folder as Task Management 
- All epics, tickets and resources can be find under .m2k folder

## Directory Structure

```
.m2k/
  epics/        # Epic definitions (EPIC-XXX-<name>.md)
  backlog/      # Tickets ready for work (T-XXX-<name>.md)
  inprogress/  # Currently being worked on
  done/         # Completed (archive)
  resources/    # Resources 
```

## Ticket Lifecycle

```
backlog/ → inprogress/ → done/
```

## EPIC / TICKET Execution Rules
* On EPIC assignment: locate all related tickets; execute sequentially; update each ticket’s status.
* On TICKET assignment: execute **only** the specified ticket.
* On ticket start: move ticket → `.m2k/inprogress`
* On ticket completion: move ticket → `.m2k/done`
* After EPIC completion: **clear working context**

## Branching Strategy 
CASE 1: On full EPIC request
    - create an epic branch `feature/{epic_tag}/{description}`.
CASE 2: On single TICKET request
    - create a ticket branch `feature/{ticket_tag}/{description}`.

## Commit Strategy

**Tickets act as execution checkpoints.**

After any ticket completions:

1. Checkout target branch
2. Commit changes
3. Push to remote
4. Push upstream if required

**All commits must include ticket reference:**

```
feat: description (T-XXX)
fix: description (T-XXX)
```

### Tests 
- Run a build/compile test to ensure there is no error before making any commit/push to the repository.

### Clean Code Conventions
1. Multi-line business logic inside conditional blocks must be extracted into named routines.
```
DONT:
if (condition1)
    routine1
    routine2
    routine2
else
    routine1
    routine2
    routine2

DO:
if (condition1)
    Routine1()
else
    Routine2()
```

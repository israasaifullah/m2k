# CLAUDE.md
- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- Always use multi-phase when in plan mode.
- Ask the user if there is any unresolved questions.

## Working on an EPIC
- All epics can be find under .m2k folder

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

## If user ask to run an entire EPIC 
- When assign to an epic, find all the tickets related to that epic, work on it 1 by 1 and update the ticket status. If complete, can move the ticket into the /done folder. 

- When you start working on a ticket, put it in the inprogress folder first

- Clear the context after every epic work.

## Commit Strategy
- If user start an execution with a ticket, after every completed execution of ticket, create a new branch and make a commit
- Features Branch: `feature/{ticket_tag}/{description}`
- Bugfixes Branch: `bugfix/{ticket_tag}/{description}`

### Commit Convention
Include ticket reference in commit messages:
```
feat: description (T-XXX)
fix: description (T-XXX)
```

### Refactor Rules
1. After every 5 completions of epics, strictly strictly remind the engineer to create a refactor epic.

### Clean Code Conventions

1. Business logic with more than 1 line and nested inside branching condition should extract
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

### Maintaining Readability
1. After every runs of epics, update the changed Class Interfaces and put it in the resource folder.
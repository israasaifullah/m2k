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
  inprogress/  # Currently being worked on
  done/         # Completed (archive)
  /    # Epic and ticket templates
```

## Ticket Lifecycle

```
backlog/ → inprogress/ → done/
```

## Working on an EPIC
- When assign to an epic, find all the tickets related to that epic, work on it 1 by 1 and update the ticket status. 
- When assign to a ticket, work on that particular ticket alone.
- When you start working on a ticket, put it in the `.m2k/inprogress` folder first
- If complete, can move the ticket into the `.m2k/done` folder. 
- Clear the context after every epic work.

## Branching Strategy 
- For each ticket work, create 1 ticket branch `feature/{ticket_tag}/{description}`.

# Commit Strategy
- After finishing the task:
    - checkout to ticket branch
    - commit & push the code
    - push upstream if necessary
- Include ticket reference in commit messages:

```
feat: description (T-XXX)
fix: description (T-XXX)
```

### Maintainability Rules
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

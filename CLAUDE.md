# CLAUDE.md
- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- Always use multi-phase when in plan mode.
- Ask the user if there is any unresolved questions.

## Working on an EPIC
- When assign to an epic, find all the tickets related to that epic, work on it 1 by 1 and update the ticket status. If complete, can move the ticket into the /done folder. 

- When you start working on a ticket, put it in the inprogress folder first

- Clear the context after every epic work.

- After every completed execution of ticket, create a new branch and make a commit
- Features Branch: `feature/{epic_tag}/{description}`
- Bugfixes Branch: `bugfix/{epic_tag}/{description}`

### Commit Convention
Include ticket reference in commit messages:
```
feat: description (T-XXX)
fix: description (T-XXX)
```
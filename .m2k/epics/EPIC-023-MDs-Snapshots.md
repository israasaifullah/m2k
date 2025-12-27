# EPIC-023: MD's Snapshots

## Scope
- We need a mechanism to snapshots the current MD files into persistent storage (sqlite)
- We need to store an epics, and tickets data in the database
- we should have a epics table, tickets table and they should be link between them. Epic has many tickets, tickets belong to epics
- The status of tickets and epics also needs to be stored
- We should have a Sync function, that syncs the current states of MDs to the database
- We should have an incremental sync, for example, when a user create an epics or tickets, we should also update our database
- We should also have a mechanism to update the db when LLM/External agents move the ticket files (especially during status change). We can use Filewatcher to trigger this incremental update

## Tickets

| ID | Description | Status |
|----|-------------|--------|
| T-136 | Design & Create Database Schema for Epics and Tickets | done |
| T-137 | Implement Database CRUD Operations | done |
| T-138 | Create Full Sync Command | done |
| T-139 | Trigger Auto-Sync on Project Load | done |
| T-140 | Implement Incremental Sync on File Create/Modify | done |
| T-141 | Handle Status Change Moves via File Watcher | done |

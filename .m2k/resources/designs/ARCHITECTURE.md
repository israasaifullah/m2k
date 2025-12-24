# M2K Architecture - High Level Design

## Overview
M2K: Markdown to Kanban - visualizes project backlogs/tickets from markdown files in kanban board view.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       M2K Application                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   File      │    │   Parser    │    │   Kanban    │     │
│  │   Watcher   │───▶│   Engine    │───▶│   Renderer  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                 │                   │             │
│         ▼                 ▼                   ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    State Store                       │   │
│  │   (tickets, columns, epics, metadata)               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. File Watcher
- Monitors markdown file directories (backlog/, in-progress/, done/)
- Triggers re-parse on file changes
- Handles file moves between folders

### 2. Parser Engine
- Parses markdown ticket files (T-XXX.md)
- Extracts: title, epic, description, acceptance criteria, status
- Maps folder location to kanban column

### 3. Kanban Renderer
- Displays columns: Backlog | In Progress | Done
- Renders ticket cards with key info
- Supports filtering by epic

### 4. State Store
- Single source of truth for parsed tickets
- Maintains relationships (ticket → epic)
- Caches parsed data for performance

## Data Flow

```
.md files → File Watcher → Parser → State Store → UI Render
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React + TypeScript |
| Bundler | Vite |
| File I/O | Chokidar |
| Desktop | Tauri (Rust) |

## MVP Scope

1. Read markdown tickets from configured path
2. Parse ticket structure
3. Display in 3-column kanban board
4. Auto-refresh on file changes

## Future Considerations

- Drag-drop to move tickets (writes to filesystem)
- Epic filtering/grouping
- Search/filter tickets
- Dark mode
- Export views

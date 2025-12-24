# M2K - Markdown to Kanban

A desktop application that visualizes markdown-based project management files as a Kanban board. Built with Tauri, React, and Rust.

## Purpose

M2K reads markdown ticket files from a project management folder structure and displays them in a 3-column Kanban board. It watches for file changes and updates the UI in real-time.

### Expected Folder Structure

```
project-management/
├── backlog/          # Tickets with "backlog" status
│   ├── T-001.md
│   └── T-002.md
├── in-progress/      # Tickets with "in_progress" status
│   └── T-003.md
├── done/             # Tickets with "done" status
│   └── T-004.md
└── epics/            # Epic definition files
    ├── EPIC-001-Name.md
    └── EPIC-002-Name.md
```

### Ticket Format

```markdown
# T-001: Ticket Title

**Epic:** EPIC-001

## Description
What needs to be done.

## Acceptance Criteria
- Criterion 1
- Criterion 2
```

## Getting Started

### Prerequisites

- Node.js (v20+)
- Rust (1.70+)
- macOS, Windows, or Linux

### Installation

```bash
cd m2k-app
npm install
```

### Development

```bash
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## Code Structure

```
m2k-app/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── KanbanBoard.tsx   # Main board with 3 columns
│   │   ├── KanbanColumn.tsx  # Single column component
│   │   ├── TicketCard.tsx    # Ticket card with expand
│   │   └── EpicFilter.tsx    # Epic dropdown filter
│   ├── hooks/
│   │   └── useProjectLoader.ts  # Loads project, handles file watching
│   ├── lib/
│   │   ├── store.ts          # Zustand state management
│   │   └── config.ts         # Config file utilities
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── App.tsx               # Main app component
│   └── App.css               # Tailwind imports
│
└── src-tauri/              # Rust backend
    └── src/
        ├── lib.rs            # Tauri commands and plugins
        ├── parser.rs         # Markdown parsing logic
        └── watcher.rs        # File system watcher
```

## Features

- **Kanban Board**: 3-column layout (Backlog, In Progress, Done)
- **Epic Filtering**: Filter tickets by epic
- **Live Updates**: File watcher detects changes and refreshes UI
- **Config Persistence**: Remembers last opened project folder
- **Dark Mode**: Automatic dark/light theme support
- **Expandable Cards**: Click to expand ticket details

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| State | Zustand |
| Backend | Rust, Tauri 2 |
| Parsing | pulldown-cmark, regex |
| File Watch | notify crate |

## License

MIT

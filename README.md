# M2K

> **M**arkdown **2** **K**anban - A powerful desktop application for managing epics and tickets with AI-powered assistance.

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.1--alpha-pink?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Tauri-2.x-blue?style=for-the-badge&logo=tauri" alt="Tauri">
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Rust-1.x-orange?style=for-the-badge&logo=rust" alt="Rust">
</p>

---

## ✨ Features

### 🎯 Epic & Ticket Management
- **Visual Epic Selection** - Beautiful grid view to browse and select epics
- **Kanban Board** - Drag-and-drop tickets across Backlog → In Progress → Done
- **Smart Filtering** - Filter tickets by epic with real-time stats
- **Progress Tracking** - Visual progress bars and completion indicators

### 🤖 AI-Powered Workflows
- **PRD Mode** - Create and edit Product Requirement Documents
- **Claude Integration** - AI-assisted epic and ticket generation
- **Smart Templates** - Automatic formatting and structure

### 🛠️ Developer Experience
- **Integrated Terminal** - Built-in terminal with project context
- **Resource Management** - Organize project resources and documentation
- **Live File Watching** - Auto-sync with `.m2k` folder changes
- **Vim Mode** - Optional vim keybindings in markdown editors

### 🎨 Design & UX
- **Dark Mode** - Beautiful dark theme powered by Geist Design
- **Responsive Layout** - Optimized for different screen sizes
- **Keyboard Shortcuts** - `Cmd/Ctrl + ,` for settings, and more
- **Smooth Animations** - Polished transitions and interactions

---

## 🚀 Quick Start

### Installation

Download the latest release for your platform:

- **macOS**: Download `.dmg` (Intel) or `.app.tar.gz` (Apple Silicon)
- **Linux**: Download `.AppImage` or `.deb`
- **Windows**: Download `.msi` or `.exe`

👉 [**Download Latest Release**](https://github.com/YOUR_USERNAME/m2k-app/releases)

### First Launch

1. **Select a project folder** - M2K will initialize a `.m2k` directory
2. **Configure API key** (optional) - Go to Settings → Anthropic API Key
3. **Start creating** - Click "PRD" to create your first epic!

---

## 📦 Project Structure

```
your-project/
└── .m2k/
    ├── epics/           # Epic definitions (EPIC-XXX-name.md)
    ├── backlog/         # Tickets ready for work (T-XXX-name.md)
    ├── inprogress/      # Currently being worked on
    ├── done/            # Completed tickets
    └── resources/       # Project resources
```

---

## 🛠️ Development

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Rust** 1.70+
- **Platform-specific dependencies**:
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`
  - **Windows**: Visual Studio C++ Build Tools

### Setup

```bash
# Clone the repository
git clone https://github.com/israasaifullah/m2k-app.git
cd m2k-app

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build

```bash
# Build for production
npm run tauri build
```

---

## 🚢 Release Process

### Automated Release (Recommended)

M2K uses GitHub Actions for automated multi-platform releases.

```bash
# 1. Update version in package.json and tauri.conf.json
npm version 0.2.0-alpha --no-git-tag-version

# 2. Commit changes
git add .
git commit -m "chore: bump version to 0.2.0-alpha"

# 3. Create and push tag
git tag v0.2.0-alpha
git push origin main
git push origin v0.2.0-alpha
```

**What happens next:**
1. GitHub Actions builds binaries for macOS (Intel + Apple Silicon), Linux, and Windows
2. Creates a draft GitHub release with all installers attached
3. Review the draft release and publish when ready

### Manual Release

```bash
# Build for current platform
npm run tauri build

# Artifacts will be in src-tauri/target/release/bundle/
```

---

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript 5.8** - Type safety
- **Tailwind CSS 4** - Styling
- **Vite** - Build tool
- **Zustand** - State management
- **XTerm.js** - Terminal emulator
- **Monaco Editor** - Code editing
- **Lucide React** - Icon library

### Backend
- **Tauri 2.x** - Desktop framework
- **Rust** - Backend logic
- **SQLite** - Project database
- **Portable PTY** - Terminal integration
- **Walkdir** - File system operations

### AI Integration
- **Claude API** - AI-powered features
- **Anthropic SDK** - API client

---

## 🎨 Development Philosophy

M2K follows clean code principles inspired by the project's CLAUDE.md workflow:

- **Multi-line business logic** → Extract into named routines
- **Ticket-based execution** → Each ticket is a checkpoint
- **Conventional commits** → `feat:`, `fix:`, with ticket references
- **Test before commit** → Always run build/compile checks

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Guidelines

- Use TypeScript for all new code
- Follow existing code style
- Add tests for new features
- Update documentation as needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app)
- Powered by [Claude AI](https://claude.ai)
- Designed with [Geist Design System](https://vercel.com/geist)
- Icons by [Lucide](https://lucide.dev)

---

<p align="center">
  <sub>Built with ❤️ using Claude Code </sub>
</p>

<p align="center">
  <sub>v0.1.1-alpha</sub>
</p>

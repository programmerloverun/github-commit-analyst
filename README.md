# GitHub Commit Analyst

Cross-platform desktop app to analyze GitHub commit history across all your repositories — including private repos and open-source contributions.

## Features

- **Multi-repo analysis** — Analyze commits across all repositories you own or contribute to
- **Incremental caching** — Only fetches new commits after the first run, 10x faster on subsequent analyses
- **Time range filtering** — Presets (this year, last year, last 6 months, etc.) or custom date range
- **Rich visualization** — Daily bar charts, cumulative line charts, detailed daily tables
- **Data insights** — Average lines/commit, add/delete ratio, most active days, peak day detection
- **Auto credential detection** — Reads token from `gh` CLI and username from git config, no manual input needed
- **i18n** — English and Chinese, auto-detected from system locale / timezone
- **Private repos** — Include private repos when authenticated via GitHub token
- **Dark theme** — GitHub-style dark UI
- **Cross-platform** — macOS, Windows, Linux

## Quick Start

```bash
# Prerequisites: Node.js >= 18, gh CLI (recommended)
npm install
npm run dev
```

The app auto-detects your GitHub credentials from `gh auth token` and `git config`. Works immediately if you've run `gh auth login` before.

## Manual Setup

If auto-detection fails, enter your GitHub username and a [personal access token](https://github.com/settings/tokens) with `repo` scope.

## Usage

1. Enter GitHub username (auto-detected if `gh` CLI is configured)
2. Select repositories to analyze
3. Choose a time range preset or custom dates
4. Click **Analyze** to view commit statistics
5. Switch time ranges instantly — data is cached locally
6. Use **Force Full Refresh** to clear cache and re-fetch everything

## Development

```bash
npm run dev       # Development with hot reload
npm run build     # Production build
npm run package   # Package as desktop installer (dmg/nsis/AppImage)
```

## Tech Stack

- **Electron** — Cross-platform desktop shell
- **React 19 + TypeScript** — UI
- **Vite** — Bundler (via electron-vite)
- **Recharts** — Data visualization
- **Octokit** — GitHub REST API
- **electron-builder** — Packaging

## License

MIT

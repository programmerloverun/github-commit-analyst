import { app, BrowserWindow, ipcMain, shell, screen, globalShortcut } from 'electron'
import { join } from 'path'
import { execSync } from 'child_process'
import { fetchUserRepos, fetchAllCommitStats, initCache, clearUserCache } from './github'

let mainWindow: BrowserWindow | null = null
let isHidden = false
let hideTimer: ReturnType<typeof setInterval> | null = null

const SIDEBAR_WIDTH = 380
const TAB_WIDTH = 20

// GUI apps on macOS don't inherit shell PATH; resolve common binary locations
const HOME = process.env.HOME || ''
const GH_BIN = ['/opt/homebrew/bin/gh', '/usr/local/bin/gh', 'gh'].find(p => {
  try { execSync(`test -x ${p}`, { stdio: 'ignore' }); return true } catch { return false }
}) || 'gh'
const GIT_BIN = '/usr/bin/git'

const SHELL_ENV = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}` }

function exec(cmd: string, useShellEnv?: boolean): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], env: useShellEnv ? SHELL_ENV : process.env }).trim()
  } catch {
    return ''
  }
}

function detectLocalAuth(): { username: string; token: string } {
  const token = exec(`${GH_BIN} auth token --hostname github.com`, true)
  let username = exec(`${GIT_BIN} config --global github.user`, true)
  if (!username && token) {
    username = exec(`${GH_BIN} api user --jq .login`, true)
  }
  if (!username) {
    username = exec(`${GIT_BIN} config --global user.name`, true)
  }
  return { username, token }
}

function getSidebarBounds(hidden: boolean) {
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  const y = display.workArea.y
  const x = hidden ? width - TAB_WIDTH : width - SIDEBAR_WIDTH
  return { x, y, width: SIDEBAR_WIDTH, height }
}

function showSidebar() {
  if (!mainWindow || !isHidden) return
  isHidden = false
  const { x, y } = getSidebarBounds(false)
  mainWindow.setPosition(x, y, true)
  mainWindow.focus()
}

function hideSidebar() {
  if (!mainWindow || isHidden) return
  isHidden = true
  const { x, y } = getSidebarBounds(true)
  mainWindow.setPosition(x, y, true)
}

function startEdgePoll() {
  if (hideTimer) return
  hideTimer = setInterval(() => {
    if (!isHidden) return
    const cursor = screen.getCursorScreenPoint()
    const display = screen.getPrimaryDisplay()
    const edge = display.workArea.x + display.workAreaSize.width
    // Reveal when cursor is within 8px of the right edge
    if (cursor.x >= edge - 8) {
      showSidebar()
    }
  }, 300)
}

function stopEdgePoll() {
  if (hideTimer) {
    clearInterval(hideTimer)
    hideTimer = null
  }
}

function createWindow(): void {
  const bounds = getSidebarBounds(false)

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: SIDEBAR_WIDTH,
    height: bounds.height,
    minWidth: SIDEBAR_WIDTH,
    maxWidth: SIDEBAR_WIDTH,
    frame: false,
    transparent: true,
    vibrancy: 'sidebar',
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    title: 'GitHub Commit Analyst',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.setVisibleOnAllWorkspaces(true)

  mainWindow.on('blur', () => {
    // Small delay to avoid hiding on accidental blur during interactions
    setTimeout(() => {
      if (mainWindow && !mainWindow.isFocused()) {
        hideSidebar()
        startEdgePoll()
      }
    }, 500)
  })

  mainWindow.on('focus', () => {
    stopEdgePoll()
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerShortcuts() {
  globalShortcut.register('Cmd+Shift+G', () => {
    if (isHidden) {
      showSidebar()
    } else {
      hideSidebar()
    }
  })
}

ipcMain.handle('detect-auth', async () => {
  return detectLocalAuth()
})

ipcMain.handle(
  'fetch-repos',
  async (_event, { username, token }: { username: string; token?: string }) => {
    return fetchUserRepos(username, token)
  }
)

ipcMain.handle(
  'fetch-all-stats',
  async (
    _event,
    { username, repos, token, since, until }: { username: string; repos: { owner: string; name: string }[]; token?: string; since?: string; until?: string }
  ) => {
    return fetchAllCommitStats(username, repos, token, since, until)
  }
)

ipcMain.handle(
  'clear-cache',
  async (_event, { username }: { username: string }) => {
    clearUserCache(username)
  }
)

ipcMain.handle('open-external', async (_event, url: string) => {
  shell.openExternal(url)
})

ipcMain.handle('toggle-sidebar', async () => {
  if (isHidden) {
    showSidebar()
  } else {
    hideSidebar()
  }
})

ipcMain.handle('quit-app', async () => {
  app.quit()
})

app.whenReady().then(() => {
  initCache(app.getPath('userData'))
  createWindow()
  registerShortcuts()
  // Hide from macOS Dock — sidebar lives in the menu bar only
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopEdgePoll()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { execSync } from 'child_process'
import { fetchUserRepos, fetchAllCommitStats, initCache, clearUserCache } from './github'

let mainWindow: BrowserWindow | null = null

function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function detectLocalAuth(): { username: string; token: string } {
  // 1. Try gh CLI token (most reliable, handles SSH + HTTPS)
  const token = exec('gh auth token --hostname github.com 2>/dev/null')

  // 2. Try github.user from git config
  let username = exec('git config --global github.user')

  // 3. If we have a token but no username, ask GitHub who we are
  if (!username && token) {
    username = exec(`gh api user --jq .login 2>/dev/null`)
  }

  // 4. Fall back to git user.name
  if (!username) {
    username = exec('git config --global user.name')
  }

  return { username, token }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'GitHub Commit Analyst',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
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

app.whenReady().then(() => {
  initCache(app.getPath('userData'))
  createWindow()
})

ipcMain.handle(
  'clear-cache',
  async (_event, { username }: { username: string }) => {
    clearUserCache(username)
  }
)

ipcMain.handle('open-external', async (_event, url: string) => {
  shell.openExternal(url)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

import { shell } from 'electron'
import * as http from 'http'
import * as net from 'net'
import { randomBytes } from 'crypto'

interface OAuthConfig {
  clientId: string
  clientSecret: string
}

const DEFAULT_PORT = 42835
const TIMEOUT_MS = 300_000

function loadOAuthConfig(): OAuthConfig {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      'GitHub OAuth not configured. Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET environment variables.\n\n' +
      'Create an OAuth App at https://github.com/settings/developers\n' +
      'Set callback URL to: http://127.0.0.1:42835/callback'
    )
  }
  return { clientId, clientSecret }
}

function findAvailablePort(preferred: number): Promise<number> {
  return new Promise((resolve, reject) => {
    function tryPort(port: number, remaining: number) {
      const server = net.createServer()
      server.once('error', () => {
        if (remaining > 0) {
          tryPort(port + 1, remaining - 1)
        } else {
          reject(new Error('Could not find an available port for OAuth callback'))
        }
      })
      server.once('listening', () => {
        server.close(() => resolve(port))
      })
      server.listen(port, '127.0.0.1')
    }
    tryPort(preferred, 5)
  })
}

async function exchangeCodeForToken(code: string, config: OAuthConfig): Promise<string> {
  const resp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code
    }).toString()
  })
  const data = await resp.json() as any
  if (data.error) {
    throw new Error(data.error_description || data.error)
  }
  if (!data.access_token) {
    throw new Error('No access token in response')
  }
  return data.access_token as string
}

async function fetchGitHubUser(token: string): Promise<string> {
  const resp = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'github-commit-analyst'
    }
  })
  if (!resp.ok) {
    throw new Error(`Failed to fetch user info: ${resp.status}`)
  }
  const data = await resp.json() as any
  return data.login as string
}

function htmlPage(title: string, message: string, success: boolean): string {
  const color = success ? '#28a745' : '#cb2431'
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .box { text-align: center; }
  .icon { font-size: 48px; color: ${color}; }
  .msg { margin-top: 12px; font-size: 16px; color: #333; }
</style></head>
<body><div class="box">
  <div class="icon">${success ? '✓' : '✗'}</div>
  <div class="msg">${message}</div>
</div></body></html>`
}

export async function startOAuthFlow(): Promise<{ username: string; token: string }> {
  const config = loadOAuthConfig()
  const port = await findAvailablePort(DEFAULT_PORT)
  const redirectUri = `http://127.0.0.1:${port}/callback`
  const state = randomBytes(12).toString('hex')

  const authorizeUrl = 'https://github.com/login/oauth/authorize?' + new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: 'repo,read:user',
    state
  }).toString()

  return new Promise((resolve, reject) => {
    let settled = false

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      server.close()
      reject(new Error('OAuth sign in timed out after 5 minutes'))
    }, TIMEOUT_MS)

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`)

      if (url.pathname === '/callback') {
        if (settled) return res.end()
        settled = true
        clearTimeout(timeout)

        const error = url.searchParams.get('error')
        const code = url.searchParams.get('code')
        const returnedState = url.searchParams.get('state')

        if (error) {
          const msg = error === 'access_denied' ? 'Authorization was denied.' : `Error: ${error}`
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(htmlPage('Sign In Failed', msg, false))
          server.close()
          reject(new Error(msg))
          return
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(htmlPage('Sign In Failed', 'No authorization code received.', false))
          server.close()
          reject(new Error('No authorization code received'))
          return
        }

        if (returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(htmlPage('Sign In Failed', 'State mismatch. Please try again.', false))
          server.close()
          reject(new Error('OAuth state mismatch'))
          return
        }

        try {
          const token = await exchangeCodeForToken(code, config)
          const username = await fetchGitHubUser(token)

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(htmlPage('Sign In Successful',
            `Authenticated as <strong>${username}</strong>. You may close this window.`, true))
          server.close()
          resolve({ username, token })
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(htmlPage('Sign In Failed', err.message || 'Unknown error', false))
          server.close()
          reject(err)
        }
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    server.listen(port, '127.0.0.1', () => {
      shell.openExternal(authorizeUrl)
    })

    server.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(new Error(`OAuth server error: ${err.message}`))
    })
  })
}

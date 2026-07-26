import * as vscode from 'vscode'
import { fetchUserRepos, fetchAllCommitStats, initCache, RepoInfo, OverallStats, RepoStats, DailyStats, CommitDetail } from './github'

export function activate(context: vscode.ExtensionContext) {
  // Initialize disk cache in the extension's global storage
  initCache(context.globalStorageUri.fsPath)

  const provider = new CommitAnalystProvider(context.extensionUri, context)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('commit-analyst.sidebar', provider)
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('commit-analyst.analyze', () => {
      provider.postMessage({ type: 'focus' })
    })
  )
}

class CommitAnalystProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    }

    webviewView.webview.html = this.getHtml(webviewView.webview)

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'get-token': {
          try {
            const session = await vscode.authentication.getSession('github', ['repo', 'read:user'], { createIfNone: true })
            webviewView.webview.postMessage({ type: 'token', token: session.accessToken, username: session.account.label })
          } catch {
            webviewView.webview.postMessage({ type: 'token', token: null })
          }
          break
        }
        case 'fetch-repos': {
          try {
            const repos = await fetchUserRepos(msg.username, msg.token || undefined)
            webviewView.webview.postMessage({ type: 'repos', repos })
          } catch (e: any) {
            webviewView.webview.postMessage({ type: 'error', message: e.message })
          }
          break
        }
        case 'fetch-stats': {
          try {
            const stats = await fetchAllCommitStats(msg.username, msg.repos, msg.token || undefined, msg.since, msg.until)
            webviewView.webview.postMessage({ type: 'stats', stats })
          } catch (e: any) {
            webviewView.webview.postMessage({ type: 'error', message: e.message })
          }
          break
        }
        case 'clear-cache': {
          const { clearUserCache } = await import('./github')
          clearUserCache(msg.username)
          break
        }
        case 'open-url': {
          vscode.env.openExternal(vscode.Uri.parse(msg.url))
          break
        }
      }
    })
  }

  postMessage(msg: any) {
    // Messages are handled via onDidReceiveMessage pattern
  }

  private getHtml(webview: vscode.Webview): string {
    const panelUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'panel.js')
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'styles.css')
    )

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>Commit Analyst</title>
</head>
<body>
  <div id="root"></div>
  <script src="${panelUri}"></script>
</body>
</html>`
  }
}

export function deactivate() {}

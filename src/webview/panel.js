// VS Code Webview — GitHub Commit Analyst sidebar panel
const vscode = acquireVsCodeApi()

interface State {
  username: string
  token: string
  repos: RepoInfo[]
  selected: Set<number>
  stats: OverallStats | null
  phase: 'input' | 'select' | 'results'
  timePreset: string
}

interface RepoInfo {
  id: number; owner: string; name: string; fullName: string
  stars: number; language: string; description: string
  isPrivate: boolean; source: string; updatedAt: string
}

interface OverallStats {
  username: string; totalCommits: number; totalAdditions: number
  totalDeletions: number; repoCount: number
  repoStats: RepoStat[]; recentCommits: CommitDetail[]; dailyStats: DailyStat[]
}

interface RepoStat { fullName: string; commits: number; additions: number; deletions: number }
interface CommitDetail { sha: string; message: string; repo: string; date: string; additions: number; deletions: number; url: string }
interface DailyStat { date: string; commits: number; additions: number; deletions: number }

const state: State = { username: '', token: '', repos: [], selected: new Set(), stats: null, phase: 'input', timePreset: 'last-year' }

// Restore saved state
const saved = vscode.getState() as any
if (saved) {
  state.username = saved.username || ''
  state.token = saved.token || ''
}

window.addEventListener('message', (e) => {
  const msg = e.data
  switch (msg.type) {
    case 'token':
      if (msg.token) {
        state.token = msg.token
        state.username = msg.username
        vscode.setState({ username: msg.username, token: msg.token })
        fetchRepos()
      }
      break
    case 'repos':
      state.repos = msg.repos
      state.selected = new Set(msg.repos.map((r: any) => r.id))
      state.phase = 'select'
      render()
      break
    case 'stats':
      state.stats = msg.stats
      state.phase = 'results'
      render()
      break
    case 'error':
      showError(msg.message)
      break
  }
})

function post(msg: any) { vscode.postMessage(msg) }

function fetchRepos() {
  showLoading('Fetching repos...')
  post({ type: 'fetch-repos', username: state.username, token: state.token })
}

function analyze() {
  const selectedRepos = state.repos.filter(r => state.selected.has(r.id))
  if (selectedRepos.length === 0) return
  const { since, until } = getTimeRange()
  showLoading('Analyzing commits...')
  post({ type: 'fetch-stats', username: state.username, repos: selectedRepos.map(r => ({ owner: r.owner, name: r.name })), token: state.token, since, until })
}

function getTimeRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (state.timePreset) {
    case 'this-year': return { since: `${y}-01-01`, until: undefined }
    case 'last-year': return { since: `${y-1}-01-01`, until: `${y-1}-12-31` }
    case 'all': return { since: undefined, until: undefined }
    default: return { since: undefined, until: undefined }
  }
}

// ---- Render ----
function render() {
  const root = document.getElementById('root')!
  if (state.phase === 'input') {
    root.innerHTML = `<div class="panel">
      <h3>GitHub Commit Analyst</h3>
      <p class="desc">Analyze GitHub commit history</p>
      <button class="btn" onclick="startAuth()">Sign in with GitHub</button>
      <div class="manual">
        <input id="user" class="input" placeholder="GitHub username" value="${esc(state.username)}" />
        <input id="tok" class="input" type="password" placeholder="Token (optional)" value="${esc(state.token)}" />
        <button class="btn btn-sm" onclick="manualFetch()">Fetch Repos</button>
      </div>
    </div>`
  } else if (state.phase === 'select') {
    const sel = state.selected
    const own = state.repos.filter(r => r.source === 'own')
    const contrib = state.repos.filter(r => r.source === 'contributed')
    let html = `<div class="panel">
      <div class="bar">
        <h3>${state.repos.length} repos</h3>
        <div class="bar-actions">
          <select id="timePreset" class="select" onchange="changeTime(this.value)">
            <option value="last-year" ${state.timePreset==='last-year'?'selected':''}>Last Year</option>
            <option value="this-year" ${state.timePreset==='this-year'?'selected':''}>This Year</option>
            <option value="all" ${state.timePreset==='all'?'selected':''}>All</option>
          </select>
          <button class="btn btn-sm" onclick="analyze()" ${sel.size===0?'disabled':''}>Analyze (${sel.size})</button>
        </div>
      </div>`
    if (contrib.length > 0) html += repoSection('Contributed', contrib, sel)
    html += repoSection('Own', own, sel)
    html += `<button class="btn btn-sm btn-back" onclick="state.phase='input';render()">Back</button></div>`
    root.innerHTML = html
  } else if (state.phase === 'results' && state.stats) {
    const s = state.stats!
    const stargazers = state.repos.filter(r => state.selected.has(r.id))
    let html = `<div class="panel">
      <div class="bar">
        <h3>${s.username}</h3>
        <button class="btn btn-sm" onclick="state.phase='select';render()">← Back</button>
      </div>
      <div class="stats-row">
        <div class="stat"><span class="stat-v">${s.totalCommits}</span><span class="stat-l">Commits</span></div>
        <div class="stat"><span class="stat-v add">+${s.totalAdditions}</span><span class="stat-l">Additions</span></div>
        <div class="stat"><span class="stat-v del">-${s.totalDeletions}</span><span class="stat-l">Deletions</span></div>
        <div class="stat"><span class="stat-v">${s.repoCount}</span><span class="stat-l">Repos</span></div>
      </div>
      <h4>Repo Breakdown</h4>
      <div class="repo-list">`
    for (const r of s.repoStats) {
      const repo = stargazers.find(x => x.fullName === r.fullName)
      html += `<div class="repo-row" onclick="openUrl('https://github.com/${r.fullName}')">
        <span class="repo-name">${r.fullName.split('/')[1]}</span>
        <span class="repo-meta">★ ${repo?.stars||0} · ${r.commits} commits</span>
      </div>`
    }
    html += `</div>
      <h4>Recent Commits</h4>
      <div class="commit-list">`
    for (const c of (s.recentCommits||[]).slice(0, 20)) {
      html += `<div class="commit-row" onclick="openUrl('${esc(c.url)}')">
        <span class="commit-msg">${esc(c.message.slice(0,60))}</span>
        <span class="commit-date">${c.date}</span>
      </div>`
    }
    html += '</div></div>'
    root.innerHTML = html
  }
}

function repoSection(title: string, repos: RepoInfo[], sel: Set<number>) {
  let h = `<h4>${title} (${repos.length})</h4><div class="repo-list">`
  for (const r of repos) {
    h += `<label class="repo-row ${sel.has(r.id)?'sel':''}">
      <input type="checkbox" ${sel.has(r.id)?'checked':''} onchange="toggleRepo(${r.id})" />
      <span class="repo-name">${esc(r.name)}</span>
      <span class="repo-stars">★ ${r.stars}</span>
    </label>`
  }
  h += '</div>'
  return h
}

// ---- Actions ----
function startAuth() { post({ type: 'get-token' }) }
function manualFetch() {
  const u = (document.getElementById('user') as HTMLInputElement)?.value
  const t = (document.getElementById('tok') as HTMLInputElement)?.value
  if (u) { state.username = u; state.token = t; vscode.setState({ username: u, token: t }); fetchRepos() }
}
function toggleRepo(id: number) {
  const next = new Set(state.selected)
  if (next.has(id)) next.delete(id) else next.add(id)
  state.selected = next
  render()
}
function changeTime(v: string) { state.timePreset = v }
function openUrl(url: string) { post({ type: 'open-url', url }) }
function showLoading(msg: string) {
  document.getElementById('root')!.innerHTML = `<div class="panel loading"><p>${msg}</p></div>`
}
function showError(msg: string) {
  document.getElementById('root')!.innerHTML = `<div class="panel"><p class="err">${esc(msg)}</p><button class="btn btn-sm" onclick="state.phase='input';render()">Back</button></div>`
}
function esc(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;') }

render()

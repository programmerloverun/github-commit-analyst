export interface DailyStats {
  date: string
  commits: number
  additions: number
  deletions: number
}

export interface RepoInfo {
  id: number
  owner: string
  name: string
  fullName: string
  stars: number
  language: string
  description: string
  isPrivate: boolean
}

export interface OverallStats {
  username: string
  dailyStats: DailyStats[]
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  repoCount: number
}

export type TimeRange =
  | { preset: 'all' }
  | { preset: 'this-year' }
  | { preset: 'last-year' }
  | { preset: 'last-6-months' }
  | { preset: 'last-3-months' }
  | { preset: 'this-month' }
  | { preset: 'last-month' }
  | { preset: 'custom'; since: string; until: string }

export function timeRangeToParams(range: TimeRange): { since?: string; until?: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (range.preset) {
    case 'this-year':
      return { since: `${y}-01-01` }
    case 'last-year':
      return { since: `${y - 1}-01-01`, until: `${y - 1}-12-31` }
    case 'last-6-months': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 6)
      return { since: d.toISOString().split('T')[0] }
    }
    case 'last-3-months': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      return { since: d.toISOString().split('T')[0] }
    }
    case 'this-month':
      return { since: `${y}-${String(m + 1).padStart(2, '0')}-01` }
    case 'last-month': {
      const prev = new Date(y, m - 1, 1)
      const lastDay = new Date(y, m, 0)
      return {
        since: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`,
        until: `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
      }
    }
    case 'custom':
      return { since: range.since, until: range.until }
    default:
      return {}
  }
}

export interface Api {
  detectAuth: () => Promise<{ username: string; token: string }>
  listRepos: (params: { username: string; token?: string }) => Promise<RepoInfo[]>
  fetchAllStats: (params: {
    username: string
    repos: { owner: string; name: string }[]
    token?: string
    since?: string
    until?: string
  }) => Promise<OverallStats>
  clearCache: (params: { username: string }) => Promise<void>
}

declare global {
  interface Window {
    api: Api
  }
}

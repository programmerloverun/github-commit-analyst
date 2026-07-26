import { Octokit } from '@octokit/rest'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

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
  source: 'own' | 'contributed'
  updatedAt: string
}

export interface RepoStats {
  fullName: string
  commits: number
  additions: number
  deletions: number
}

export interface CommitDetail {
  sha: string
  message: string
  repo: string
  date: string
  additions: number
  deletions: number
  url: string
}

export interface OverallStats {
  username: string
  dailyStats: DailyStats[]
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  repoCount: number
  repoStats: RepoStats[]
  recentCommits: CommitDetail[]
}

// ---- Cache layer ----

type DailyRecord = { commits: number; additions: number; deletions: number }
type RepoCache = { lastFetched: string; dailyMap: Record<string, DailyRecord> }
type UserCache = Record<string, RepoCache>

let cachePath = ''
let cacheData: Record<string, UserCache> = {}

export function initCache(dataDir: string) {
  cachePath = join(dataDir, 'commit-cache.json')
  if (!existsSync(dirname(cachePath))) {
    mkdirSync(dirname(cachePath), { recursive: true })
  }
  try {
    if (existsSync(cachePath)) {
      cacheData = JSON.parse(readFileSync(cachePath, 'utf8'))
    }
  } catch {
    cacheData = {}
  }
}

function saveCache() {
  try {
    writeFileSync(cachePath, JSON.stringify(cacheData))
  } catch {}
}

export function clearUserCache(username: string) {
  delete cacheData[username]
  saveCache()
}

function loadUserCache(username: string): UserCache {
  return cacheData[username] || {}
}

function saveUserCache(username: string, userCache: UserCache) {
  cacheData[username] = userCache
  saveCache()
}

function mergeDailyMap(
  into: Map<string, DailyRecord>,
  from: Record<string, DailyRecord>
) {
  for (const [date, rec] of Object.entries(from)) {
    const cur = into.get(date) || { commits: 0, additions: 0, deletions: 0 }
    into.set(date, {
      commits: cur.commits + rec.commits,
      additions: cur.additions + rec.additions,
      deletions: cur.deletions + rec.deletions
    })
  }
}

// ---- Thread pool ----

const CONCURRENCY = 6

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  const queue = [...items]

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!
      results.push(await fn(item))
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

// ---- API functions ----

export async function fetchUserRepos(
  username: string,
  token?: string
): Promise<RepoInfo[]> {
  const octokit = new Octokit(token ? { auth: token } : {})

  const repos: RepoInfo[] = []
  let page = 1

  // Fetch owned + collaborator repos
  while (true) {
    const { data } = token
      ? await octokit.rest.repos.listForAuthenticatedUser({
          per_page: 100,
          page,
          sort: 'updated',
          affiliation: 'owner,collaborator,organization_member'
        })
      : await octokit.rest.repos.listForUser({
          username,
          per_page: 100,
          page,
          sort: 'updated',
          type: 'owner'
        })

    if (data.length === 0) break

    for (const r of data) {
      if (r.fork) continue
      repos.push({
        id: r.id,
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        stars: r.stargazers_count ?? 0,
        language: r.language ?? '',
        description: r.description ?? '',
        isPrivate: r.private ?? false,
        source: 'own',
        updatedAt: r.updated_at ?? ''
      })
    }

    if (data.length < 100) break
    page++
  }

  // Search for contributed repos (open source PRs where user is not owner/collaborator)
  if (token) {
    const contributed = await searchContributedRepos(octokit, username)
    const existingIds = new Set(repos.map((r) => r.id))
    for (const r of contributed) {
      if (!existingIds.has(r.id)) {
        repos.push(r)
        existingIds.add(r.id)
      }
    }
  }

  return repos
}

async function searchContributedRepos(
  octokit: Octokit,
  username: string
): Promise<RepoInfo[]> {
  // Step 1: find all unique repos the user contributed to via search
  const foundRepos = new Map<number, { owner: string; name: string; fork: boolean }>()
  let page = 1

  while (page <= 10) {
    try {
      const { data } = await octokit.rest.search.commits({
        q: `author:${username}`,
        per_page: 100,
        page,
        sort: 'author-date',
        order: 'desc'
      })

      if (data.items.length === 0) break

      for (const item of data.items) {
        const repo = item.repository
        if (!repo || foundRepos.has(repo.id)) continue
        if (repo.owner.login === username) continue

        foundRepos.set(repo.id, {
          owner: repo.owner.login,
          name: repo.name,
          fork: repo.fork ?? false
        })
      }

      if (data.items.length < 100) break
      page++
    } catch {
      break
    }
  }

  if (foundRepos.size === 0) return []

  // Step 2: resolve ALL repos via the full repo API to get accurate star counts
  const repoList = Array.from(foundRepos.values())
  const resolved = await runWithConcurrency(repoList, async (r) => {
    try {
      const { data: fullRepo } = await octokit.rest.repos.get({
        owner: r.owner,
        repo: r.name
      })
      // For forks, use the parent (upstream) repo
      const upstream = fullRepo.parent ?? fullRepo.source ?? fullRepo
      return {
        id: upstream.id,
        owner: upstream.owner.login,
        name: upstream.name,
        fullName: upstream.full_name,
        stars: upstream.stargazers_count ?? 0,
        language: upstream.language ?? '',
        description: upstream.description ?? '',
        isPrivate: upstream.private ?? false,
        source: 'contributed' as const,
        updatedAt: upstream.updated_at ?? ''
      }
    } catch {
      return null
    }
  })

  // Step 3: deduplicate (multiple forks may resolve to same parent) and filter
  const repoMap = new Map<number, RepoInfo>()
  for (const r of resolved) {
    if (r && !repoMap.has(r.id) && r.owner !== username) {
      repoMap.set(r.id, r)
    }
  }

  return Array.from(repoMap.values())
}

async function fetchRepoCommits(
  octokit: Octokit,
  username: string,
  repo: { owner: string; name: string },
  since?: string,
  until?: string
): Promise<{ dailyMap: Map<string, DailyRecord>; commits: CommitDetail[] }> {
  const dailyMap = new Map<string, DailyRecord>()
  const commits: CommitDetail[] = []
  let page = 1

  while (true) {
    let list: any[]
    try {
      const { data } = await octokit.rest.repos.listCommits({
        owner: repo.owner,
        repo: repo.name,
        author: username,
        per_page: 100,
        page,
        since: since || undefined,
        until: until || undefined
      })
      list = data
    } catch {
      break
    }

    if (list.length === 0) break

    // Filter out merge commits and commits without sha
    const toFetch = list.filter((c: any) => c.sha && (!c.parents || c.parents.length <= 1))

    // Fetch detailed stats concurrently (6 at a time) instead of one by one
    const details = await runWithConcurrency(toFetch, async (c: any) => {
      try {
        const { data: detailed } = await octokit.rest.repos.getCommit({
          owner: repo.owner,
          repo: repo.name,
          ref: c.sha
        })
        return { c, detailed }
      } catch {
        return null
      }
    })

    for (const item of details) {
      if (!item) continue
      const { c, detailed } = item
      const stats = detailed.stats
      const date = c.commit?.author?.date
      if (!stats || !date) continue

      const dateKey = date.split('T')[0]
      const cur = dailyMap.get(dateKey) || { commits: 0, additions: 0, deletions: 0 }
      dailyMap.set(dateKey, {
        commits: cur.commits + 1,
        additions: cur.additions + (stats.additions || 0),
        deletions: cur.deletions + (stats.deletions || 0)
      })

      const msg = (c.commit?.message || '').split('\n')[0]
      commits.push({
        sha: c.sha,
        message: msg.length > 100 ? msg.slice(0, 97) + '...' : msg,
        repo: `${repo.owner}/${repo.name}`,
        date: dateKey,
        additions: stats.additions || 0,
        deletions: stats.deletions || 0,
        url: `https://github.com/${repo.owner}/${repo.name}/commit/${c.sha}`
      })
    }

    if (list.length < 100) break
    page++
  }

  return { dailyMap, commits }
}

async function processOneRepo(
  octokit: Octokit,
  username: string,
  repo: { owner: string; name: string },
  userCache: UserCache,
  combinedMap: Map<string, DailyRecord>,
  allCommits: CommitDetail[],
  now: string,
  since?: string,
  until?: string
): Promise<boolean> {
  const repoKey = `${repo.owner}/${repo.name}`
  const cachedRepo = userCache[repoKey]
  let hasData = false

  if (cachedRepo) {
    const cachedDates = Object.keys(cachedRepo.dailyMap).sort()

    // Backfill: if the requested range starts before the earliest cached date,
    // fetch older commits so the cache covers the full requested range.
    if (since && cachedDates.length > 0 && since < cachedDates[0]) {
      console.log(`[processOneRepo] backfilling ${repoKey}: since=${since} < earliestCached=${cachedDates[0]}`)
      const older = await fetchRepoCommits(octokit, username, repo, undefined, cachedDates[0])
      for (const [d, r] of older.dailyMap) {
        const existing = cachedRepo.dailyMap[d]
        cachedRepo.dailyMap[d] = existing
          ? { commits: existing.commits + r.commits, additions: existing.additions + r.additions, deletions: existing.deletions + r.deletions }
          : r
      }
    }

    // Incremental fetch: commits pushed since last cache update
    const newCommits = await fetchRepoCommits(octokit, username, repo, cachedRepo.lastFetched)

    if (newCommits.dailyMap.size > 0) {
      for (const [d, r] of newCommits.dailyMap) {
        const existing = cachedRepo.dailyMap[d]
        cachedRepo.dailyMap[d] = existing
          ? { commits: existing.commits + r.commits, additions: existing.additions + r.additions, deletions: existing.deletions + r.deletions }
          : r
      }
      userCache[repoKey] = { lastFetched: now, dailyMap: cachedRepo.dailyMap }
    } else {
      userCache[repoKey] = { ...cachedRepo, lastFetched: now }
    }

    hasData = Object.keys(userCache[repoKey].dailyMap).length > 0
    mergeDailyMap(combinedMap, userCache[repoKey].dailyMap)
  } else {
    // First fetch: always pull ALL commits so the cache has complete data.
    // Time range filtering is done at the display layer, not the cache layer.
    const result = await fetchRepoCommits(octokit, username, repo)
    hasData = result.dailyMap.size > 0

    const newMap: Record<string, DailyRecord> = {}
    for (const [d, r] of result.dailyMap) {
      newMap[d] = r
      const cur = combinedMap.get(d) || { commits: 0, additions: 0, deletions: 0 }
      combinedMap.set(d, {
        commits: cur.commits + r.commits,
        additions: cur.additions + r.additions,
        deletions: cur.deletions + r.deletions
      })
    }

    userCache[repoKey] = { lastFetched: now, dailyMap: newMap }
  }

  return hasData
}

export async function fetchAllCommitStats(
  username: string,
  repos: { owner: string; name: string }[],
  token?: string,
  since?: string,
  until?: string
): Promise<OverallStats> {
  const octokit = new Octokit(token ? { auth: token } : {})
  const userCache = loadUserCache(username)
  const now = new Date().toISOString()
  const combinedMap = new Map<string, DailyRecord>()
  const allCommits: CommitDetail[] = []

  console.log(`[fetchAllCommitStats] since=${since}, until=${until}, repos=${repos.length}`)

  // Process all repos with thread pool
  const results = await runWithConcurrency(repos, async (repo) => {
    const hasData = await processOneRepo(octokit, username, repo, userCache, combinedMap, allCommits, now, since, until)
    return { hasData, fullName: `${repo.owner}/${repo.name}` }
  })

  const validRepoCount = results.filter(r => r.hasData).length

  saveUserCache(username, userCache)

  const dailyStats: DailyStats[] = []
  let totalCommits = 0
  let totalAdditions = 0
  let totalDeletions = 0

  for (const [date, rec] of combinedMap) {
    if (since && date < since) continue
    if (until && date > until) continue

    dailyStats.push({ date, ...rec })
    totalCommits += rec.commits
    totalAdditions += rec.additions
    totalDeletions += rec.deletions
  }

  dailyStats.sort((a, b) => a.date.localeCompare(b.date))

  // Compute per-repo stats from cache, respecting time range
  const repoStats: RepoStats[] = []
  for (const repo of repos) {
    const repoKey = `${repo.owner}/${repo.name}`
    const cached = userCache[repoKey]
    if (!cached) continue
    let commits = 0, additions = 0, deletions = 0
    let hasData = false
    for (const [date, rec] of Object.entries(cached.dailyMap)) {
      if (since && date < since) continue
      if (until && date > until) continue
      commits += rec.commits
      additions += rec.additions
      deletions += rec.deletions
      hasData = true
    }
    if (hasData) {
      repoStats.push({ fullName: repoKey, commits, additions, deletions })
    }
  }

  console.log(`[fetchAllCommitStats] filtered: ${dailyStats.length} days, commits=${totalCommits}, adds=${totalAdditions}, dels=${totalDeletions}`)

  // Filter commit details by time range, sorted newest first, capped at 100
  const recentCommits = allCommits
    .filter((c) => {
      if (since && c.date < since) return false
      if (until && c.date > until) return false
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.sha.localeCompare(a.sha))
    .slice(0, 100)

  return {
    username,
    dailyStats,
    totalCommits,
    totalAdditions,
    totalDeletions,
    repoCount: validRepoCount,
    repoStats,
    recentCommits
  }
}

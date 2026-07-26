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
}

export interface OverallStats {
  username: string
  dailyStats: DailyStats[]
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  repoCount: number
}

// ---- Cache layer ----

type DailyRecord = { commits: number; additions: number; deletions: number }
type RepoCache = { lastFetched: string; dailyMap: Record<string, DailyRecord> }
type UserCache = Record<string, RepoCache>       // key: "owner/repo"

let cachePath = ''
let cacheData: Record<string, UserCache> = {}  // key: username

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
  } catch {
    // ignore write failures
  }
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

// ---- API functions ----

export async function fetchUserRepos(
  username: string,
  token?: string
): Promise<RepoInfo[]> {
  const octokit = new Octokit(token ? { auth: token } : {})

  const repos: RepoInfo[] = []
  let page = 1

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
        isPrivate: r.private ?? false
      })
    }

    if (data.length < 100) break
    page++
  }

  // Also search for contributed repos (PRs to repos user doesn't own/collaborate on)
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
  const repoMap = new Map<number, RepoInfo>()
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
        if (!repo || repoMap.has(repo.id)) continue
        if (repo.fork) continue
        repoMap.set(repo.id, {
          id: repo.id,
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          stars: repo.stargazers_count ?? 0,
          language: repo.language ?? '',
          description: repo.description ?? '',
          isPrivate: repo.private ?? false
        })
      }

      if (data.items.length < 100) break
      page++
    } catch {
      break
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
): Promise<Map<string, DailyRecord>> {
  const dailyMap = new Map<string, DailyRecord>()
  let page = 1

  while (true) {
    let commits: any[]
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
      commits = data
    } catch {
      break
    }

    if (commits.length === 0) break

    for (const commit of commits) {
      if (!commit.sha) continue

      try {
        const { data: detailed } = await octokit.rest.repos.getCommit({
          owner: repo.owner,
          repo: repo.name,
          ref: commit.sha
        })

        const stats = detailed.stats
        const date = commit.commit?.author?.date
        if (!stats || !date) continue

        const dateKey = date.split('T')[0]
        const cur = dailyMap.get(dateKey) || { commits: 0, additions: 0, deletions: 0 }
        dailyMap.set(dateKey, {
          commits: cur.commits + 1,
          additions: cur.additions + (stats.additions || 0),
          deletions: cur.deletions + (stats.deletions || 0)
        })
      } catch {
        // skip
      }
    }

    if (commits.length < 100) break
    page++
  }

  return dailyMap
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
  let validRepoCount = 0

  for (const repo of repos) {
    const repoKey = `${repo.owner}/${repo.name}`
    const cachedRepo = userCache[repoKey]
    let repoHasData = false

    if (cachedRepo) {
      // Merge existing cached data
      mergeDailyMap(combinedMap, cachedRepo.dailyMap)
      repoHasData = Object.keys(cachedRepo.dailyMap).length > 0

      // Fetch only new commits since last fetch
      const newCommits = await fetchRepoCommits(
        octokit, username, repo, cachedRepo.lastFetched
      )

      if (newCommits.size > 0) {
        const newMap: Record<string, DailyRecord> = {}
        for (const [d, r] of newCommits) {
          newMap[d] = r
          const cur = combinedMap.get(d) || { commits: 0, additions: 0, deletions: 0 }
          combinedMap.set(d, {
            commits: cur.commits + r.commits,
            additions: cur.additions + r.additions,
            deletions: cur.deletions + r.deletions
          })
        }

        // Update cache
        userCache[repoKey] = {
          lastFetched: now,
          dailyMap: { ...cachedRepo.dailyMap, ...newMap }
        }
        repoHasData = true
      } else {
        // No new commits, bump timestamp
        userCache[repoKey] = {
          ...cachedRepo,
          lastFetched: now
        }
      }
    } else {
      // First fetch for this repo
      const newCommits = await fetchRepoCommits(octokit, username, repo)
      repoHasData = newCommits.size > 0

      const newMap: Record<string, DailyRecord> = {}
      for (const [d, r] of newCommits) {
        newMap[d] = r
        combinedMap.set(d, r)
      }

      userCache[repoKey] = {
        lastFetched: now,
        dailyMap: newMap
      }
    }

    if (repoHasData) validRepoCount++
  }

  saveUserCache(username, userCache)

  // Filter by time range from combined cache
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

  return {
    username,
    dailyStats,
    totalCommits,
    totalAdditions,
    totalDeletions,
    repoCount: validRepoCount
  }
}

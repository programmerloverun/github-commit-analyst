import { useState, useEffect, useRef } from 'react'
import RepoInput from './components/RepoInput'
import RepoSelector from './components/RepoSelector'
import TimeRangeSelector from './components/TimeRangeSelector'
import StatsCards from './components/StatsCards'
import DailyTable from './components/DailyTable'
import CommitCharts from './components/CommitCharts'
import AnalysisPanel from './components/AnalysisPanel'
import NetworkGraph from './components/NetworkGraph'
import type { RepoInfo, OverallStats, TimeRange } from './types'
import { timeRangeToParams } from './types'
import { type Lang, t, loadLang, saveLang, detectLocale } from './i18n'

function loadSettings(): { username: string; token: string } {
  try {
    const raw = localStorage.getItem('gh-settings')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { username: '', token: '' }
}

function saveSettings(username: string, token: string) {
  localStorage.setItem('gh-settings', JSON.stringify({ username, token }))
}

export default function App() {
  const saved = useRef(loadSettings())
  const [lang, setLang] = useState<Lang>(loadLang)
  const [username, setUsername] = useState(saved.current.username)
  const [token, setToken] = useState(saved.current.token)
  const [repos, setRepos] = useState<RepoInfo[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [timeRange, setTimeRange] = useState<TimeRange>({ preset: 'last-year' })
  const [stats, setStats] = useState<OverallStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'input' | 'select' | 'results'>(saved.current.username ? 'select' : 'input')
  const autoFetched = useRef(false)
  const [detecting, setDetecting] = useState(false)

  const changeLang = (l: Lang) => {
    setLang(l)
    saveLang(l)
  }

  useEffect(() => {
    if (autoFetched.current) return
    autoFetched.current = true

    if (saved.current.username) {
      handleFetchRepos(saved.current.username, saved.current.token)
      return
    }

    setDetecting(true)
    window.api.detectAuth().then((detected) => {
      setDetecting(false)
      if (detected.username && detected.token) {
        setUsername(detected.username)
        setToken(detected.token)
        handleFetchRepos(detected.username, detected.token)
      } else if (detected.username) {
        setUsername(detected.username)
        setToken('')
      }
    }).catch(() => {
      setDetecting(false)
    })
  }, [])

  const doAnalyze = async (reposList: RepoInfo[], sel: Set<number>, range: TimeRange) => {
    const selectedRepos = reposList.filter((r) => sel.has(r.id))
    if (selectedRepos.length === 0) return

    setLoading(true)
    setError(null)
    setStats(null)

    const { since, until } = timeRangeToParams(range)

    try {
      const result = await window.api.fetchAllStats({
        username,
        repos: selectedRepos.map((r) => ({ owner: r.owner, name: r.name })),
        token: token || undefined,
        since,
        until
      })
      setStats(result)
      setPhase('results')
    } catch (e: any) {
      if (e.message?.includes('401') || e.message?.includes('403')) {
        setError(t('rateLimit', lang))
      } else {
        setError(e.message || t('rateLimit', lang))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFetchRepos = async (name: string, tkn: string) => {
    setLoadingRepos(true)
    setError(null)
    setUsername(name)
    setToken(tkn)
    saveSettings(name, tkn)

    try {
      const result = await window.api.listRepos({ username: name, token: tkn || undefined })
      if (result.length === 0) {
        setError(t('noRepos', lang, { name }))
        return
      }
      setRepos(result)
      setSelected(new Set(result.map((r) => r.id)))
      setPhase('select')
      setStats(null)
      saved.current = { username: name, token: tkn }
    } catch (e: any) {
      if (e.message?.includes('404') || e.message?.includes('Not Found')) {
        setError(t('userNotFound', lang, { name }))
      } else if (e.message?.includes('401') || e.message?.includes('403')) {
        setError(t('rateLimit', lang))
      } else {
        setError(e.message || t('rateLimit', lang))
      }
    } finally {
      setLoadingRepos(false)
    }
  }

  const toggleRepo = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleForceRefresh = async () => {
    await window.api.clearCache({ username })
    doAnalyze(repos, selected, timeRange)
  }

  const handleBack = () => {
    setPhase('input')
    setRepos([])
    setStats(null)
    setSelected(new Set())
    setError(null)
  }

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range)
    if (phase === 'results') {
      doAnalyze(repos, selected, range)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="lang-switch">
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => changeLang('en')}
            >EN</button>
            <button
              className={`lang-btn ${lang === 'zh' ? 'active' : ''}`}
              onClick={() => changeLang('zh')}
            >中文</button>
          </div>
        </div>
        <h1>{t('title', lang)}</h1>
        <p>{t('subtitle', lang)}</p>
        {username && phase !== 'input' && (
          <button className="link-btn back-btn" onClick={handleBack}>
            {t('back', lang)}
          </button>
        )}
      </header>

      {phase === 'input' && (
        <RepoInput
          onFetchRepos={handleFetchRepos}
          loading={loadingRepos}
          initialUsername={username}
          initialToken={token}
          detecting={detecting}
          lang={lang}
        />
      )}

      {error && <div className="error-banner">{error}</div>}

      {detecting && (
        <div className="loading">
          <div className="spinner" />
          <p>{t('detecting', lang)}</p>
        </div>
      )}

      {loadingRepos && (
        <div className="loading">
          <div className="spinner" />
          <p>{t('fetchingReposFor', lang, { name: username })}</p>
        </div>
      )}

      {phase === 'select' && repos.length > 0 && (
        <>
          <RepoSelector
            repos={repos}
            selected={selected}
            onToggle={toggleRepo}
            onSelectAll={() => setSelected(new Set(repos.map((r) => r.id)))}
            onDeselectAll={() => setSelected(new Set())}
            onAnalyze={() => doAnalyze(repos, selected, timeRange)}
            onForceRefresh={handleForceRefresh}
            loading={loading}
            lang={lang}
          />
          <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} lang={lang} />
        </>
      )}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <p>{t('fetchingStats', lang, { count: selected.size })}</p>
        </div>
      )}

      {stats && (
        <>
          <div className="summary-bar">
            {t('summary', lang, { username: stats.username, count: stats.repoCount })}
            <div style={{ marginTop: 8 }}>
              <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} lang={lang} />
            </div>
          </div>
          <StatsCards stats={stats} lang={lang} />
          <CommitCharts dailyStats={stats.dailyStats} lang={lang} />
          <NetworkGraph
            repoStats={stats.repoStats}
            repos={repos}
            username={username}
            lang={lang}
          />
          <AnalysisPanel stats={stats} lang={lang} />
          <DailyTable dailyStats={stats.dailyStats} lang={lang} />
        </>
      )}
    </div>
  )
}

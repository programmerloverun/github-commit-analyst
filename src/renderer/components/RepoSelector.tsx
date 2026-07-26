import { useState } from 'react'
import type { RepoInfo, SortKey } from '../types'
import { sortRepos } from '../types'
import { type Lang, t } from '../i18n'

interface Props {
  repos: RepoInfo[]
  selected: Set<number>
  onToggle: (id: number) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onAnalyze: () => void
  onForceRefresh: () => void
  loading: boolean
  lang: Lang
}

export default function RepoSelector({
  repos, selected, onToggle, onSelectAll, onDeselectAll,
  onAnalyze, onForceRefresh, loading, lang
}: Props) {
  const [sort, setSort] = useState<SortKey>('stars-desc')

  const ownedRepos = sortRepos(repos.filter(r => r.source === 'own'), sort)
  const contribRepos = sortRepos(repos.filter(r => r.source === 'contributed'), sort)

  return (
    <div className="repo-selector">
      <div className="selector-header">
        <h2>
          {ownedRepos.length + contribRepos.length} {t('reposFound', lang)}
          <span className="selector-subtitle">
            ({ownedRepos.length} {t('own', lang)}, {contribRepos.length} {t('contributed', lang)})
          </span>
        </h2>
        <div className="selector-controls">
          <select
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="stars-desc">{t('sortStarsDesc', lang)}</option>
            <option value="stars-asc">{t('sortStarsAsc', lang)}</option>
            <option value="name-asc">{t('sortNameAsc', lang)}</option>
            <option value="name-desc">{t('sortNameDesc', lang)}</option>
            <option value="updated-desc">{t('sortUpdatedDesc', lang)}</option>
            <option value="updated-asc">{t('sortUpdatedAsc', lang)}</option>
          </select>
          <div className="selector-actions">
            <button className="link-btn" onClick={onSelectAll}>{t('selectAll', lang)}</button>
            <button className="link-btn" onClick={onDeselectAll}>{t('deselectAll', lang)}</button>
            <button className="primary-btn" disabled={selected.size === 0 || loading} onClick={onAnalyze}>
              {loading ? t('analyzing', lang) : t('analyze', lang, { count: selected.size })}
            </button>
            <button className="link-btn" disabled={selected.size === 0 || loading}
              onClick={onForceRefresh} title="Clear cache and re-fetch all commits">
              {t('forceRefresh', lang)}
            </button>
          </div>
        </div>
      </div>

      {contribRepos.length > 0 && (
        <>
          <h3 className="section-title">{t('contributed', lang)} ({contribRepos.length})</h3>
          <RepoGrid repos={contribRepos} selected={selected} onToggle={onToggle} lang={lang} />
        </>
      )}

      <h3 className="section-title">{t('own', lang)} ({ownedRepos.length})</h3>
      <RepoGrid repos={ownedRepos} selected={selected} onToggle={onToggle} lang={lang} />
    </div>
  )
}

function RepoGrid({ repos, selected, onToggle, lang }: {
  repos: RepoInfo[]
  selected: Set<number>
  onToggle: (id: number) => void
  lang: Lang
}) {
  return (
    <div className="repo-grid">
      {repos.map((repo) => (
        <div
          key={repo.id}
          className={`repo-card ${selected.has(repo.id) ? 'selected' : ''}`}
          onClick={() => onToggle(repo.id)}
        >
          <div className="repo-card-top">
            <input
              type="checkbox"
              checked={selected.has(repo.id)}
              onChange={() => onToggle(repo.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="repo-card-badges">
              {repo.source === 'contributed' && <span className="contrib-badge">{t('contributed', lang)}</span>}
              {repo.isPrivate && <span className="private-badge">{t('private', lang)}</span>}
            </div>
          </div>
          <a
            className="repo-card-name"
            href={`https://github.com/${repo.fullName}`}
            onClick={(e) => {
              e.stopPropagation()
              window.api.openExternal(`https://github.com/${repo.fullName}`)
            }}
            title={repo.fullName}
          >
            {repo.name}
          </a>
          <div className="repo-card-owner">{repo.owner}</div>
          {repo.description && <div className="repo-card-desc">{repo.description}</div>}
          <div className="repo-card-meta">
            {repo.language && <span className="repo-card-lang">{repo.language}</span>}
            <span className="repo-card-stars">★ {repo.stars.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

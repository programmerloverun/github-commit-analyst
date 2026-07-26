import type { RepoInfo } from '../types'
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
  return (
    <div className="repo-selector">
      <div className="selector-header">
        <h2>{repos.length} {t('reposFound', lang)}</h2>
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
      <div className="repo-list">
        {repos.map((repo) => (
          <label key={repo.id} className={`repo-item ${selected.has(repo.id) ? 'selected' : ''}`}>
            <input type="checkbox" checked={selected.has(repo.id)} onChange={() => onToggle(repo.id)} />
            <div className="repo-info">
              <span className="repo-name">
                {repo.fullName}
                {repo.isPrivate && <span className="private-badge">{t('private', lang)}</span>}
                {repo.source === 'contributed' && <span className="contrib-badge">{t('contributed', lang)}</span>}
              </span>
              <span className="repo-meta">
                {repo.language && <span className="repo-lang">{repo.language}</span>}
                <span>★ {repo.stars}</span>
              </span>
              {repo.description && <span className="repo-desc">{repo.description}</span>}
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

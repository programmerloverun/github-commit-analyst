import type { CommitDetail } from '../types'
import { type Lang, t } from '../i18n'

interface Props {
  commits: CommitDetail[]
  lang: Lang
}

export default function CommitList({ commits, lang }: Props) {
  if (commits.length === 0) return null

  return (
    <div className="commit-list-section">
      <h3>{t('recentCommits', lang)}</h3>
      <div className="commit-list">
        {commits.map((c) => (
          <a
            key={c.sha}
            className="commit-item"
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault()
              window.api.openExternal(c.url)
            }}
          >
            <span className="commit-repo">{c.repo}</span>
            <span className="commit-date">{c.date}</span>
            <span className="commit-msg">{c.message}</span>
            <span className="commit-stats">
              <span className="add-col">+{c.additions}</span>
              {' '}
              <span className="del-col">-{c.deletions}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

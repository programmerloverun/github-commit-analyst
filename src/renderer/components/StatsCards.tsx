import type { OverallStats } from '../types'
import { type Lang, t } from '../i18n'

interface Props {
  stats: OverallStats
  lang: Lang
}

export default function StatsCards({ stats, lang }: Props) {
  const net = stats.totalAdditions - stats.totalDeletions

  return (
    <div className="stats-cards">
      <div className="stat-card">
        <div className="stat-value">{stats.totalCommits}</div>
        <div className="stat-label">{t('totalCommits', lang)}</div>
      </div>
      <div className="stat-card additions">
        <div className="stat-value">+{stats.totalAdditions.toLocaleString()}</div>
        <div className="stat-label">{t('linesAdded', lang)}</div>
      </div>
      <div className="stat-card deletions">
        <div className="stat-value">-{stats.totalDeletions.toLocaleString()}</div>
        <div className="stat-label">{t('linesDeleted', lang)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value" style={{ color: net >= 0 ? '#22c55e' : '#ef4444' }}>
          {net >= 0 ? '+' : ''}{net.toLocaleString()}
        </div>
        <div className="stat-label">{t('netChange', lang)}</div>
      </div>
    </div>
  )
}

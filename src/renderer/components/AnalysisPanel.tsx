import type { OverallStats } from '../types'
import { type Lang, t } from '../i18n'

interface Props {
  stats: OverallStats
  lang: Lang
}

export default function AnalysisPanel({ stats, lang }: Props) {
  const { dailyStats, totalCommits, totalAdditions, totalDeletions, repoCount } = stats
  if (dailyStats.length === 0) return null

  let maxDay = dailyStats[0]
  let peakAddDay = dailyStats[0]
  let peakDelDay = dailyStats[0]

  for (const d of dailyStats) {
    if (d.commits > maxDay.commits) maxDay = d
    if (d.additions > peakAddDay.additions) peakAddDay = d
    if (d.deletions > peakDelDay.deletions) peakDelDay = d
  }

  const avgLines = totalCommits > 0 ? Math.round((totalAdditions + totalDeletions) / totalCommits) : 0
  const ratio = totalDeletions > 0 ? (totalAdditions / totalDeletions).toFixed(2) : 'N/A'
  const avgDay = dailyStats.length > 0 ? (totalCommits / dailyStats.length).toFixed(1) : '0'
  const range = dailyStats.length > 0 ? `${dailyStats[0].date} ~ ${dailyStats[dailyStats.length - 1].date}` : '-'

  return (
    <div className="analysis-panel">
      <h3>{t('analysis', lang)}</h3>
      <div className="analysis-grid">
        <div className="analysis-item">
          <span className="analysis-label">{t('analyzedRepos', lang)}</span>
          <span className="analysis-value">{repoCount}</span>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">{t('avgLinesPerCommit', lang)}</span>
          <span className="analysis-value">{avgLines}</span>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">{t('addDelRatio', lang)}</span>
          <span className="analysis-value">{ratio}</span>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">{t('avgCommitsPerDay', lang)}</span>
          <span className="analysis-value">{avgDay}</span>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">{t('dateRange', lang)}</span>
          <span className="analysis-value">{range}</span>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">{t('mostActiveDay', lang)}</span>
          <span className="analysis-value">{maxDay.date} ({maxDay.commits} {t('commits', lang).toLowerCase()})</span>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">{t('peakAddDay', lang)}</span>
          <span className="analysis-value">{peakAddDay.date} (+{peakAddDay.additions.toLocaleString()})</span>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">{t('peakDelDay', lang)}</span>
          <span className="analysis-value">{peakDelDay.date} (-{peakDelDay.deletions.toLocaleString()})</span>
        </div>
      </div>
    </div>
  )
}

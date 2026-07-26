import { useState, useMemo } from 'react'
import type { DailyStats } from '../types'
import { type Lang, t } from '../i18n'

interface Props {
  dailyStats: DailyStats[]
  lang: Lang
  since?: string
  until?: string
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS_ZH = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_LABELS_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getColorLevel(commits: number): number {
  if (commits === 0) return 0
  if (commits <= 2) return 1
  if (commits <= 5) return 2
  if (commits <= 9) return 3
  return 4
}

export default function ContributionGraph({ dailyStats, lang, since, until }: Props) {
  const [tooltip, setTooltip] = useState<{ date: string; commits: number; additions: number; deletions: number; x: number; y: number } | null>(null)

  const { weeks, monthLabels, totalContributions } = useMemo(() => {
    if (dailyStats.length === 0) return { weeks: [], monthLabels: [], totalContributions: 0 }

    // Build lookup map: date -> stats
    const map = new Map<string, DailyStats>()
    let totalCommits = 0
    for (const d of dailyStats) {
      map.set(d.date, d)
      totalCommits += d.commits
    }

    // Use the time range filter bounds for the grid, falling back to data range
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const rangeStart = since || dailyStats.map(d => d.date).sort()[0]
    const rangeEnd = until || todayStr

    // Start from the Sunday before the range start
    const start = new Date(rangeStart + 'T00:00:00')
    start.setDate(start.getDate() - start.getDay())

    // End on the Saturday after the range end (or today, whichever is earlier)
    const rangeEndDate = new Date(rangeEnd + 'T00:00:00')
    const end = new Date(Math.min(rangeEndDate.getTime(), now.getTime()))
    end.setDate(end.getDate() + (6 - end.getDay()))

    // Build week columns
    const cols: { date: Date; stats: DailyStats | null }[][] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const week: { date: Date; stats: DailyStats | null }[] = []
      for (let d = 0; d < 7; d++) {
        const key = cursor.toISOString().split('T')[0]
        week.push({ date: new Date(cursor), stats: map.get(key) || null })
        cursor.setDate(cursor.getDate() + 1)
      }
      cols.push(week)
    }

    // Month labels: position at first week that contains a day from the month
    const ml: { label: string; col: number }[] = []
    const monthNames = lang === 'zh' ? MONTH_LABELS_ZH : MONTH_LABELS_EN
    for (let i = 0; i < cols.length; i++) {
      const week = cols[i]
      for (const day of week) {
        if (day.date.getDate() === 1 || (i === 0 && day.date.getDate() <= 7)) {
          const label = monthNames[day.date.getMonth()]
          // Only add if this month hasn't been added yet
          if (!ml.length || ml[ml.length - 1].label !== label) {
            ml.push({ label, col: i })
          }
        }
      }
    }

    return { weeks: cols, monthLabels: ml, totalContributions: totalCommits }
  }, [dailyStats, lang, since, until])

  if (weeks.length === 0) return <p className="empty-hint">{t('noData', lang)}</p>

  const dayLabels = lang === 'zh' ? DAY_LABELS_ZH : DAY_LABELS

  return (
    <div className="contribution-graph">
      <div className="contrib-header">
        <span className="contrib-count">
          {totalContributions.toLocaleString()} contributions{lang === 'zh' ? '' : ''} {lang === 'zh' ? '次提交' : ''}
        </span>
      </div>
      <div className="contrib-grid-wrap">
        <div className="contrib-month-row" style={{ marginLeft: 32 }}>
          {monthLabels.map((m) => (
            <span key={m.label} className="contrib-month-label" style={{ left: m.col * 16 }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="contrib-body">
          <div className="contrib-day-labels">
            {dayLabels.map((label, i) => (
              <div key={i} className="contrib-day-label">{label}</div>
            ))}
          </div>
          <div className="contrib-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="contrib-week">
                {week.map((day, di) => {
                  const level = getColorLevel(day.stats?.commits || 0)
                  const dateStr = day.date.toISOString().split('T')[0]
                  return (
                    <div
                      key={di}
                      className={`contrib-cell level-${level}`}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        const container = (e.target as HTMLElement).closest('.contribution-graph')?.getBoundingClientRect()
                        setTooltip({
                          date: dateStr,
                          commits: day.stats?.commits || 0,
                          additions: day.stats?.additions || 0,
                          deletions: day.stats?.deletions || 0,
                          x: rect.left - (container?.left || 0) + rect.width / 2,
                          y: rect.top - (container?.top || 0) - 8
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="contrib-legend">
        <span className="contrib-legend-label">{lang === 'zh' ? '少' : 'Less'}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div key={level} className={`contrib-cell level-${level} legend-cell`} />
        ))}
        <span className="contrib-legend-label">{lang === 'zh' ? '多' : 'More'}</span>
      </div>
      {tooltip && (
        <div
          className="contrib-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <strong>{tooltip.date}</strong>
          <div>{tooltip.commits} {lang === 'zh' ? '次提交' : 'commits'}</div>
          {tooltip.commits > 0 && (
            <>
              <div className="add-col">+{tooltip.additions.toLocaleString()}</div>
              <div className="del-col">-{tooltip.deletions.toLocaleString()}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

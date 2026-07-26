import type { DailyStats } from '../types'
import { type Lang, t } from '../i18n'

interface Props {
  dailyStats: DailyStats[]
  lang: Lang
}

export default function DailyTable({ dailyStats, lang }: Props) {
  if (dailyStats.length === 0) return <p className="empty-hint">{t('noData', lang)}</p>

  return (
    <div className="table-wrapper">
      <table className="daily-table">
        <thead>
          <tr>
            <th>{t('date', lang)}</th>
            <th>{t('commits', lang)}</th>
            <th className="add-col">+ {t('additions', lang)}</th>
            <th className="del-col">- {t('deletions', lang)}</th>
            <th>{t('netChange', lang)}</th>
          </tr>
        </thead>
        <tbody>
          {dailyStats.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.commits}</td>
              <td className="add-col">+{d.additions.toLocaleString()}</td>
              <td className="del-col">-{d.deletions.toLocaleString()}</td>
              <td style={{ color: d.additions - d.deletions >= 0 ? '#22c55e' : '#ef4444' }}>
                {d.additions - d.deletions >= 0 ? '+' : ''}
                {(d.additions - d.deletions).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

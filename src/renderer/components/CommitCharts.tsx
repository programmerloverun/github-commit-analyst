import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import type { DailyStats } from '../types'
import { type Lang, t } from '../i18n'

interface Props {
  dailyStats: DailyStats[]
  lang: Lang
}

export default function CommitCharts({ dailyStats, lang }: Props) {
  if (dailyStats.length === 0) return null

  const chartData = dailyStats.map((d) => ({
    date: d.date.slice(5),
    additions: d.additions,
    deletions: d.deletions,
    commits: d.commits
  }))

  let cumAdd = 0
  let cumDel = 0
  const cumulative = chartData.map((d) => {
    cumAdd += d.additions
    cumDel += d.deletions
    return { date: d.date, additions: cumAdd, deletions: cumDel }
  })

  return (
    <div className="charts">
      <div className="chart-container">
        <h3>{t('dailyChart', lang)}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="additions" fill="#22c55e" name={t('additions', lang)} />
            <Bar dataKey="deletions" fill="#ef4444" name={t('deletions', lang)} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-container">
        <h3>{t('cumulativeChart', lang)}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cumulative}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="additions" stroke="#22c55e" name={t('totalAdditions', lang)} />
            <Line type="monotone" dataKey="deletions" stroke="#ef4444" name={t('totalDeletions', lang)} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

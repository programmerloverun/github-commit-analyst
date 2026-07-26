import type { TimeRange } from '../types'
import { type Lang, t } from '../i18n'

const PRESETS: { value: TimeRange['preset']; labelKey: string }[] = [
  { value: 'all', labelKey: 'allTime' },
  { value: 'this-year', labelKey: 'thisYear' },
  { value: 'last-year', labelKey: 'lastYear' },
  { value: 'last-6-months', labelKey: 'last6Months' },
  { value: 'last-3-months', labelKey: 'last3Months' },
  { value: 'this-month', labelKey: 'thisMonth' },
  { value: 'last-month', labelKey: 'lastMonth' },
  { value: 'custom', labelKey: 'custom' }
]

interface Props {
  value: TimeRange
  onChange: (range: TimeRange) => void
  lang: Lang
}

export default function TimeRangeSelector({ value, onChange, lang }: Props) {
  return (
    <div className="time-range">
      <div className="time-presets">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            className={`time-btn ${value.preset === p.value ? 'active' : ''}`}
            onClick={() => onChange(p.value === 'custom' ? { preset: 'custom', since: '', until: '' } : { preset: p.value })}
          >
            {t(p.labelKey, lang)}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="time-custom">
          <input type="date" value={value.since} onChange={(e) => onChange({ ...value, since: e.target.value })} />
          <span>{t('startDate', lang)} ~ {t('endDate', lang)}</span>
          <input type="date" value={value.until} onChange={(e) => onChange({ ...value, until: e.target.value })} />
        </div>
      )}
    </div>
  )
}

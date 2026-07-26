import { useState } from 'react'
import { type Lang, t } from '../i18n'

interface Props {
  onFetchRepos: (username: string, token: string) => void
  loading: boolean
  initialUsername: string
  initialToken: string
  detecting: boolean
  lang: Lang
}

export default function RepoInput({ onFetchRepos, loading, initialUsername, initialToken, detecting, lang }: Props) {
  const [username, setUsername] = useState(initialUsername)
  const [token, setToken] = useState(initialToken)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = username.trim()
    if (!name) return
    onFetchRepos(name, token.trim() || '')
  }

  return (
    <form className="repo-input" onSubmit={handleSubmit}>
      <div className="input-row">
        <div className="input-group">
          <label>{t('username', lang)}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. torvalds"
            required
          />
        </div>
        <div className="input-group">
          <label>{t('token', lang)}</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t('tokenPlaceholder', lang)}
          />
        </div>
      </div>
      <button type="submit" disabled={loading || detecting}>
        {detecting ? t('detecting', lang) : loading ? t('fetchingRepos', lang) : t('fetchRepos', lang)}
      </button>
      <p className="input-hint">{t('detectHint', lang)}</p>
    </form>
  )
}

import { useState, useEffect } from 'react'

function faviconUrl(link) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(link).hostname}&sz=32` } catch { return '' }
}

function timeAgo(pubDate) {
  if (!pubDate) return ''
  const diffMs = Date.now() - new Date(pubDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function PenIcon() {
  return (
    <svg className="latest-updates-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function ColumnistsCard() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/columnists')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setArticles(data.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="latest-updates-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  if (!articles.length) return null

  return (
    <div className="latest-updates-card">
      <div className="latest-updates-header">
        <PenIcon />
        <span className="latest-updates-title">Columnists</span>
      </div>
      <div className="latest-updates-list">
        {articles.map((a, i) => (
          <a
            key={`${a.link}-${i}`}
            href={a.link}
            target="_blank"
            rel="noopener noreferrer"
            className="latest-updates-row"
          >
            <img
              src={faviconUrl(a.link)}
              alt=""
              className="latest-updates-favicon"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
            <span className="latest-updates-row-title">
              {a.title}
              <span className="latest-updates-byline">{a.author} · {a.source}</span>
            </span>
            <span className="latest-updates-row-meta">{timeAgo(a.pubDate)}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

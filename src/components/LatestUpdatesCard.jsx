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

function ClockIcon() {
  return (
    <svg className="latest-updates-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <polyline points="12,7 12,12 15,14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function LatestUpdatesCard({ articles: propArticles, title = 'Latest Updates' }) {
  const [fetchedArticles, setFetchedArticles] = useState([])
  const [loading, setLoading] = useState(propArticles == null)

  useEffect(() => {
    if (propArticles != null) return
    fetch('/api/latestupdates')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setFetchedArticles(data.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [propArticles])

  const articles = propArticles != null ? propArticles : fetchedArticles

  if (loading) return (
    <div className="latest-updates-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  if (!articles.length) return null

  return (
    <div className="latest-updates-card">
      <div className="latest-updates-header">
        <ClockIcon />
        <span className="latest-updates-title">{title}</span>
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
            <span className="latest-updates-row-title">{a.title}</span>
            <span className="latest-updates-row-meta">{timeAgo(a.pubDate)}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

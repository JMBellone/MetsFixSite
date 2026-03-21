import { useState, useEffect } from 'react'

function timeAgo(pubDate) {
  if (!pubDate) return ''
  const diffMs = Date.now() - new Date(pubDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function BaseballIcon() {
  return (
    <svg className="mlbnews-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <path d="M7.5 12c0-1.5.8-2.8 2-3.6M16.5 12c0 1.5-.8 2.8-2 3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M12 4.5c1 .6 1.8 2 2 4M12 19.5c-1-.6-1.8-2-2-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

export default function MLBNewsCard() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mlbnews')
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
        <BaseballIcon />
        <span className="latest-updates-title">MLB News</span>
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
              src="https://www.google.com/s2/favicons?domain=mlb.com&sz=32"
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

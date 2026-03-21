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

function RssIcon() {
  return (
    <svg className="latest-updates-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 11a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 4a16 16 0 0 1 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="5" cy="19" r="1" fill="currentColor"/>
    </svg>
  )
}

export default function BlogRollCard() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [removed, setRemoved] = useState(new Set())

  useEffect(() => {
    fetch('/api/blogroll')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setArticles(data.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const visible = articles.filter(a => !removed.has(a.link))

  if (loading) return (
    <div className="team-news-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  if (!visible.length) return null

  const removeArticle = (link) => setRemoved(prev => new Set([...prev, link]))

  return (
    <div className="team-news-card">
      <div className="latest-updates-header">
        <RssIcon />
        <span className="latest-updates-title">Blog Roll</span>
      </div>
      {visible.map((a, idx) => (
        <div key={a.link}>
          {idx > 0 && <div className="team-news-divider" />}
          <div className="team-news-item-wrap">
            <a
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="team-news-secondary"
            >
              {a.image && (
                <img
                  src={a.image}
                  alt=""
                  className="team-news-secondary-img"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              )}
              <div className="team-news-secondary-body">
                <span className="team-news-secondary-title">{a.title}</span>
                <span className="team-news-meta">
                  {timeAgo(a.pubDate)} ·{' '}
                  <img src={faviconUrl(a.link)} alt="" className="news-meta-favicon"
                    onError={e => { e.currentTarget.style.display = 'none' }} />
                  {a.source}
                </span>
              </div>
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

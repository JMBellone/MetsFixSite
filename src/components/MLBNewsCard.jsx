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

export default function MLBNewsCard({ shownLinks = new Set() }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mlbnews')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setArticles(data.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="mlbnews-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  const visible = articles.filter(a => !shownLinks.has(a.link))
  if (!visible.length) return null

  return (
    <div className="mlbnews-card">
      <div className="mlbnews-header">
        <img
          src="https://www.google.com/s2/favicons?domain=mlb.com&sz=32"
          alt=""
          className="mlbnews-header-favicon"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span className="mlbnews-title">MLB News</span>
      </div>
      <div className="mlbnews-list">
        {visible.map((a, i) => (
          <div key={`${a.link}-${i}`}>
            {i > 0 && <div className="team-news-divider" />}
            <div className="sfe-headline-article">
              <div className="team-news-item-wrap">
                <a href={a.link} target="_blank" rel="noopener noreferrer" className="sfe-headline-link">
                  <span className="sfe-headline-title">{a.title}</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

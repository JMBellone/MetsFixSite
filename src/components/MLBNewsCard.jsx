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
    <div className="mlbnews-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  if (!articles.length) return null

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
        {articles.map((a, i) => (
          <a
            key={`${a.link}-${i}`}
            href={a.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mlbnews-row"
          >
            <div className="mlbnews-row-body">
              <span className="mlbnews-row-title">{a.title}</span>
              <span className="mlbnews-row-meta">{timeAgo(a.pubDate)}</span>
            </div>
            {a.image && (
              <img
                src={a.image}
                alt=""
                className="mlbnews-row-thumb"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </a>
        ))}
      </div>
    </div>
  )
}

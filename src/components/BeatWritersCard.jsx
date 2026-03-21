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

export default function BeatWritersCard({ readIds, markRead, removeArticle }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/beatwriters')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setArticles(data.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="team-news-card">
      <div className="option-dates-skeleton" />
    </div>
  )

  const featured   = articles[0]
  const secondary  = articles[1]
  const tertiary   = articles[2]
  const headlines  = articles.slice(3, 5)

  if (!featured) return null

  return (
    <div className="team-news-card">
      <div className="latest-updates-header">
        <img
          src="https://www.google.com/s2/favicons?domain=newsday.com&sz=32"
          alt=""
          className="mlbnews-header-favicon"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <img
          src="https://www.google.com/s2/favicons?domain=nydailynews.com&sz=32"
          alt=""
          className="mlbnews-header-favicon"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span className="latest-updates-title">More from the Beat</span>
      </div>

      {/* Featured */}
      <div className="team-news-item-wrap">
        <a href={featured.link} target="_blank" rel="noopener noreferrer"
          className="team-news-featured" onClick={() => markRead?.(featured.link)}>
          {featured.image && (
            <img src={featured.image} alt="" className="team-news-featured-img"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
          <div className="team-news-featured-body">
            <span className={`team-news-featured-title${readIds?.has(featured.link) ? ' team-news--read' : ''}`}>
              {featured.title}
            </span>
            <span className="team-news-meta">{timeAgo(featured.pubDate)} · {featured.source}</span>
          </div>
        </a>
        <button className="item-remove" onClick={() => removeArticle?.(featured.link)} aria-label="Remove">✕</button>
      </div>

      {/* Secondary */}
      {secondary && (
        <>
          <div className="team-news-divider" />
          <div className="team-news-item-wrap">
            <a href={secondary.link} target="_blank" rel="noopener noreferrer"
              className="team-news-secondary" onClick={() => markRead?.(secondary.link)}>
              {secondary.image && (
                <img src={secondary.image} alt="" className="team-news-secondary-img"
                  onError={e => { e.currentTarget.style.display = 'none' }} />
              )}
              <div className="team-news-secondary-body">
                <span className={`team-news-secondary-title${readIds?.has(secondary.link) ? ' team-news--read' : ''}`}>
                  {secondary.title}
                </span>
                <span className="team-news-meta">{timeAgo(secondary.pubDate)} · {secondary.source}</span>
              </div>
            </a>
            <button className="item-remove" onClick={() => removeArticle?.(secondary.link)} aria-label="Remove">✕</button>
          </div>
        </>
      )}

      {/* Tertiary */}
      {tertiary && (
        <>
          <div className="team-news-divider" />
          <div className="team-news-item-wrap">
            <a href={tertiary.link} target="_blank" rel="noopener noreferrer"
              className="team-news-secondary" onClick={() => markRead?.(tertiary.link)}>
              {tertiary.image && (
                <img src={tertiary.image} alt="" className="team-news-secondary-img"
                  onError={e => { e.currentTarget.style.display = 'none' }} />
              )}
              <div className="team-news-secondary-body">
                <span className={`team-news-secondary-title${readIds?.has(tertiary.link) ? ' team-news--read' : ''}`}>
                  {tertiary.title}
                </span>
                <span className="team-news-meta">{timeAgo(tertiary.pubDate)} · {tertiary.source}</span>
              </div>
            </a>
            <button className="item-remove" onClick={() => removeArticle?.(tertiary.link)} aria-label="Remove">✕</button>
          </div>
        </>
      )}

      {/* Headlines */}
      {headlines.length > 0 && (
        <>
          <div className="team-news-divider" />
          <div className="team-news-headlines team-news-headlines--row">
            {headlines.map((a, i) => (
              <a key={i} href={a.link} target="_blank" rel="noopener noreferrer"
                className={`team-news-headline${readIds?.has(a.link) ? ' team-news--read' : ''}`}
                onClick={() => markRead?.(a.link)}>
                <span className="team-news-headline-body">
                  <span className="team-news-headline-title">{a.title}</span>
                  <span className="team-news-headline-source">
                    <img src={faviconUrl(a.link)} alt="" className="team-news-source-favicon"
                      onError={e => { e.currentTarget.style.display = 'none' }} />
                    {a.source} · {timeAgo(a.pubDate)}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

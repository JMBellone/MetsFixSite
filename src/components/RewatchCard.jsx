import { useState, useEffect } from 'react'

const INTRO = {
  title: '1986 Mets Rewatch Newsletter: An introduction',
  url: 'https://1986-mets-rewatch.beehiiv.com/p/1986-mets-rewatch-newsletter-an-introduction',
}

function faviconUrl(link) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(link).hostname}&sz=32` } catch { return '' }
}

export default function RewatchCard() {
  const [latest, setLatest] = useState(null)

  useEffect(() => {
    fetch('/api/rewatch')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.latest) setLatest(data.latest) })
      .catch(() => {})
  }, [])

  const articles = latest ? [latest, INTRO] : [INTRO]

  return (
    <div className="team-news-card">
      <div className="latest-updates-header">
        <span className="latest-updates-title">Re-Live the 1986 Season</span>
      </div>
      {articles.map((a, i) => (
        <div key={a.url}>
          {i > 0 && <div className="team-news-divider" />}
          <div className="sfe-headline-article">
            <div className="team-news-item-wrap">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="sfe-headline-link mlbnews-headline-row">
                <img src={faviconUrl(a.url)} alt="" className="mlbnews-article-icon"
                  onError={e => { e.currentTarget.style.display = 'none' }} />
                <span className="sfe-headline-title">{a.title}</span>
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

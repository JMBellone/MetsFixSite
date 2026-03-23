import { useState, useEffect } from 'react'

const INTRO = {
  title: '1986 Mets Rewatch Newsletter: An introduction',
  url: 'https://1986-mets-rewatch.beehiiv.com/p/1986-mets-rewatch-newsletter-an-introduction',
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
        <span className="latest-updates-title">Party like it's 1986</span>
      </div>
      <p className="prospect-watch-subtext">Rewatch the 1986 season with Mark Simon.</p>
      <div className="rewatch-body">
        <img src="/1986-rewatch.avif" alt="Like It Oughta Be" className="rewatch-art"
          onError={e => { e.currentTarget.style.display = 'none' }} />
        <div className="rewatch-links">
          {articles.map((a, i) => (
            <div key={a.url}>
              {i > 0 && <div className="team-news-divider" />}
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="rewatch-link">
                {a.title}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

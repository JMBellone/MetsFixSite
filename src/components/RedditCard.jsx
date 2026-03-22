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

function RedditIcon() {
  return (
    <svg className="reddit-icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="10" fill="#FF4500"/>
      <path fill="#fff" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 1-.97 1 1 0 0 0-.96.68l-2.38-.5a.17.17 0 0 0-.2.13l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .66-1.54zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.79 3.58 3.58 0 0 1-2.85-.79.19.19 0 1 1 .27-.27 3.2 3.2 0 0 0 2.58.67 3.2 3.2 0 0 0 2.58-.67.19.19 0 0 1 .27.27zm-.17-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/>
    </svg>
  )
}

export default function RedditCard() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reddit')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setPosts(data.posts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="latest-updates-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  if (!posts.length) return null

  return (
    <div className="latest-updates-card">
      <div className="latest-updates-header">
        <RedditIcon />
        <span className="latest-updates-title">Mets Reddit</span>
      </div>
      <div className="latest-updates-list">
        {posts.map((p) => (
          <a
            key={p.id}
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            className="latest-updates-row"
          >
            <span className="latest-updates-row-title">
              {p.title}
              {p.flair && <span className="reddit-flair">{p.flair}</span>}
            </span>
            <span className="latest-updates-row-meta">
              {timeAgo(p.pubDate)}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

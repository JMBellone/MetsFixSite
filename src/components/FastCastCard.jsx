import { useState, useEffect } from 'react'

function PlayIcon() {
  return (
    <svg className="sny-play-icon" viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="68" height="48" rx="10" fill="rgba(0,0,0,0.65)" />
      <polygon points="27,14 27,34 46,24" fill="white" />
    </svg>
  )
}

export default function FastCastCard() {
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/fastcast')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (data.video) setVideo(data.video) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && !video) return (
    <div className="sny-card">
      <div className="sny-card-header">
        <img
          src="https://www.google.com/s2/favicons?domain=mlb.com&sz=64"
          alt="MLB"
          className="sny-card-header-logo"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span className="sny-card-header-label">MLB FastCast</span>
      </div>
      <a
        href="https://www.mlb.com/video/topic/fastcast"
        target="_blank"
        rel="noopener noreferrer"
        className="fastcast-link fastcast-fallback"
      >
        <span className="sny-video-title fastcast-fallback-text">Watch the latest FastCast on MLB.com →</span>
      </a>
    </div>
  )

  return (
    <div className="sny-card">
      <div className="sny-card-header">
        <img
          src="https://www.google.com/s2/favicons?domain=mlb.com&sz=64"
          alt="MLB"
          className="sny-card-header-logo"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span className="sny-card-header-label">MLB FastCast</span>
      </div>

      {loading && <div className="sny-skeleton" />}

      {!loading && video && (
        <a
          href={video.link}
          target="_blank"
          rel="noopener noreferrer"
          className="fastcast-link fastcast-row"
          aria-label={`Watch: ${video.title}`}
        >
          <div className="fastcast-thumb-wrap">
            {video.thumbnail ? (
              <img
                src={video.thumbnail}
                alt=""
                className="fastcast-thumb-img"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="fastcast-thumb-placeholder" />
            )}
            <div className="sny-play-overlay"><PlayIcon /></div>
          </div>
          <div className="sny-video-info fastcast-info">
            <span className="fastcast-title">{video.title}</span>
            <span className="sny-video-meta fastcast-meta">
              <img
                src="https://www.google.com/s2/favicons?domain=mlb.com&sz=32"
                alt=""
                className="news-meta-favicon"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
              MLB.com
            </span>
          </div>
        </a>
      )}
    </div>
  )
}

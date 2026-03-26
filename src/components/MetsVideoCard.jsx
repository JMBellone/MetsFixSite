import { useState, useEffect, useRef } from 'react'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function PlayIcon() {
  return (
    <svg className="sny-play-icon" viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="68" height="48" rx="10" fill="rgba(0,0,0,0.65)" />
      <polygon points="27,14 27,34 46,24" fill="white" />
    </svg>
  )
}

export default function MetsVideoCard() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playingIndex, setPlayingIndex] = useState(null)

  // Touch swipe state
  const touchStartX = useRef(null)

  useEffect(() => {
    fetch('/api/metsvideo')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setVideos(data.videos || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="sny-card">
      <div className="sny-skeleton" />
    </div>
  )
  if (!videos.length) return null

  const video = videos[currentIndex]

  function goTo(idx) {
    if (idx === currentIndex) return
    setPlayingIndex(null)
    setCurrentIndex(idx)
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0 && currentIndex < videos.length - 1) goTo(currentIndex + 1)
    if (dx > 0 && currentIndex > 0) goTo(currentIndex - 1)
  }

  return (
    <div
      className="sny-card mvc-card"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="sny-card-header">
        <img
          src="https://www.google.com/s2/favicons?domain=youtube.com&sz=64"
          alt="YouTube"
          className="sny-card-header-logo"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span className="sny-card-header-label">Mets on YouTube</span>
      </div>

      {playingIndex === currentIndex ? (
        <div className="sny-embed-wrap">
          <iframe
            className="sny-embed"
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        </div>
      ) : (
        <button className="sny-thumb-btn" onClick={() => setPlayingIndex(currentIndex)} aria-label={`Play: ${video.title}`}>
          <img src={video.thumbnail} alt="" className="sny-thumb sny-thumb--featured" />
          <div className="sny-play-overlay"><PlayIcon /></div>
        </button>
      )}

      <div className="sny-video-info">
        <span className="sny-video-title sny-video-title--featured">{video.title}</span>
        <span className="sny-video-meta">{timeAgo(video.published)}</span>
      </div>

      {videos.length > 1 && (
        <div className="mvc-dots">
          {videos.map((_, i) => (
            <button
              key={i}
              className={`mvc-dot${i === currentIndex ? ' mvc-dot--active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Video ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

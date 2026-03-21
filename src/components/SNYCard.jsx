import { useState, useEffect } from 'react'

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

function VideoThumb({ video, className }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className={className}>
      {playing ? (
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
        <button className="sny-thumb-btn" onClick={() => setPlaying(true)} aria-label={`Play: ${video.title}`}>
          <img src={video.thumbnail} alt="" className="sny-thumb" />
          <div className="sny-play-overlay"><PlayIcon /></div>
        </button>
      )}
      <div className="sny-video-info">
        <span className="sny-video-title">{video.title}</span>
        <span className="sny-video-meta">{timeAgo(video.published)}</span>
      </div>
    </div>
  )
}

export default function SNYCard() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/snyvideos')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setVideos((data.videos || []).slice(1, 4)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="sny-card">
      <div className="sny-card-header">
        <img
          src="https://www.google.com/s2/favicons?domain=sny.tv&sz=64"
          alt="SNY"
          className="sny-card-header-logo"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span className="sny-card-header-label">See It on SNY</span>
      </div>

      {loading && <div className="sny-skeleton" />}

      {!loading && videos.length > 0 && (
        <>
          <VideoThumb video={videos[0]} className="sny-featured" />
          {videos.length > 1 && (
            <div className="sny-small-row">
              {videos.slice(1).map(v => (
                <VideoThumb key={v.videoId} video={v} className="sny-small" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

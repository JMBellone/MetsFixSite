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

function VideoItem({ video }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="sny-video">
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
          <div className="sny-play-overlay">
            <svg className="sny-play-icon" viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg">
              <rect width="68" height="48" rx="10" fill="rgba(0,0,0,0.65)" />
              <polygon points="27,14 27,34 46,24" fill="white" />
            </svg>
          </div>
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
      .then(data => { setVideos(data.videos || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="sny-card">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="sny-skeleton" />
      ))}
    </div>
  )
  if (!videos.length) return null

  return (
    <div className="sny-card">
      {videos.map(v => <VideoItem key={v.videoId} video={v} />)}
    </div>
  )
}

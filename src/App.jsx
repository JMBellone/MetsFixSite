import { useState, useEffect, useCallback, useRef } from 'react'
import ArticleCard from './components/ArticleCard'
import SkeletonCard from './components/SkeletonCard'
import ScheduleCard from './components/ScheduleCard'
import StandingsCard from './components/StandingsCard'
import './App.css'

const SOURCES = ['all', 'MLB.com', 'The Athletic', 'SNY', 'NY Post', 'Mets Merized', 'Amazin Avenue']

function timeAgo(pubDate) {
  if (!pubDate) return ''
  const diffMs = Date.now() - new Date(pubDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York'
  })
}

export default function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState('all')
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('metsReadArticles') || '[]')) }
    catch { return new Set() }
  })
  const [removedIds, setRemovedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('metsRemovedArticles') || '[]')) }
    catch { return new Set() }
  })
  const [pullY, setPullY] = useState(0)
  const touchStartY = useRef(0)

  const [lastVisitTime] = useState(() => {
    const stored = localStorage.getItem('metsLastVisitTime')
    localStorage.setItem('metsLastVisitTime', new Date().toISOString())
    return stored ? new Date(stored) : null
  })

  const fetchFeeds = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/feeds')
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFeeds() }, [fetchFeeds])

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e) => {
    if (!touchStartY.current) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setPullY(Math.min(delta, 80))
  }, [])

  const onTouchEnd = useCallback(() => {
    if (pullY >= 60) fetchFeeds()
    setPullY(0)
    touchStartY.current = 0
  }, [pullY, fetchFeeds])

  const markRead = useCallback((id) => {
    setReadIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('metsReadArticles', JSON.stringify([...next]))
      return next
    })
  }, [])

  const removeArticle = useCallback((id) => {
    setRemovedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('metsRemovedArticles', JSON.stringify([...next]))
      return next
    })
  }, [])

  const isNew = (article) => lastVisitTime && article.pubDate
    ? new Date(article.pubDate) > lastVisitTime
    : false

  const visible = articles
    .filter(a => !removedIds.has(a.id))
    .filter(a => source === 'all' || a.source === source)

  const unreadCount = articles
    .filter(a => !removedIds.has(a.id) && !readIds.has(a.id))
    .length

  const sourceCounts = {}
  for (const src of SOURCES.slice(1)) {
    sourceCounts[src] = articles.filter(a => !removedIds.has(a.id) && !readIds.has(a.id) && a.source === src).length
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-text">Mets <span>HQ</span></span>
          </div>
          <span className="header-date">{formatDate()}</span>
        </div>
      </header>

      <div className="filter-bar">
        {SOURCES.map(src => {
          const count = src === 'all' ? unreadCount : sourceCounts[src]
          const hasArticles = src === 'all'
            ? articles.length > 0
            : articles.some(a => a.source === src)
          if (src !== 'all' && !hasArticles) return null
          return (
            <button
              key={src}
              className={`filter-btn${source === src ? ' filter-btn--active' : ''}`}
              onClick={() => setSource(src)}
            >
              {src === 'all' ? 'All' : src}
              {count > 0 && <span className="filter-count">{count}</span>}
            </button>
          )
        })}
      </div>

      {pullY > 10 && (
        <div className="pull-indicator" style={{ height: Math.min(pullY, 40) }}>
          {pullY >= 60 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}

      <main className="main">
        <ScheduleCard />
        <StandingsCard />

        {loading && (
          <div className="article-list">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div className="error-state">
            <p>Failed to load news: {error}</p>
            <button className="retry-btn" onClick={fetchFeeds}>Try again</button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="empty-state">No articles found.</div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="article-list">
            {visible.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                isRead={readIds.has(article.id)}
                isNew={isNew(article)}
                onRead={markRead}
                onRemove={removeArticle}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        Updated {timeAgo(articles[0]?.pubDate) || 'just now'} · Mets HQ
      </footer>
    </div>
  )
}

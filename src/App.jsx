import { useState, useEffect, useCallback, useRef } from 'react'
import SkeletonCard from './components/SkeletonCard'
import ScheduleCard from './components/ScheduleCard'
import StandingsCard from './components/StandingsCard'
import OptionDatesCard from './components/OptionDatesCard'
import SNYCard from './components/SNYCard'
import './App.css'

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

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
  })
}

function SubscriberBadge({ paywalled }) {
  if (!paywalled) return null
  return <span className="subscriber-badge">Subscriber Content</span>
}


export default function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  const briefingArticle = articles.find(a => a.team === 'metropolitan' && !removedIds.has(a.id)) || null

  const newsPool = articles
    .filter(a => a.team === 'mets' && !removedIds.has(a.id))
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))

  const featured   = newsPool[0]
  const secondary  = newsPool[1]
  const tertiary   = newsPool[2]
  const headlines  = newsPool.slice(3, 5)
  const moreNews   = newsPool.slice(5, 10)

  const shownIds = new Set(newsPool.slice(0, 10).map(a => a.id))
  const athleticPool = articles
    .filter(a => a.source === 'The Athletic' && !removedIds.has(a.id) && !shownIds.has(a.id))
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 5)
  const athFeatured  = athleticPool[0]
  const athSecondary = athleticPool[1]
  const athTertiary  = athleticPool[2]
  const athHeadlines = athleticPool.slice(3, 5)

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <header className="header">
        <div className="header-inner">
          <img src="/logo.png" alt="Get Your Mets Fix" className="header-logo-img" />
          <span className="header-date">{formatDate()}</span>
        </div>
      </header>

      {pullY > 10 && (
        <div className="pull-indicator" style={{ height: Math.min(pullY, 40) }}>
          {pullY >= 60 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}

      <main className="main">

        {/* ── The Latest Briefing ─────────────────────────── */}
        {briefingArticle && (
          <>
            <div className="section-header section-header--mets">
              <span className="section-header-label">The Latest Briefing</span>
              <span className="section-header-line" />
            </div>
            <div className="briefing-card">
              <a
                href={briefingArticle.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`briefing-link${readIds.has(briefingArticle.id) ? ' briefing-link--read' : ''}`}
                onClick={() => markRead(briefingArticle.id)}
              >
                <div className="briefing-body">
                  <span className="briefing-source">Mets Fix</span>
                  <span className="briefing-title">{briefingArticle.title}</span>
                  <span className="briefing-meta">{timeAgo(briefingArticle.pubDate)}</span>
                </div>
                {briefingArticle.image && (
                  <img
                    src={briefingArticle.image}
                    alt=""
                    className="briefing-thumb"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                )}
              </a>
            </div>
          </>
        )}

        {/* ── The Latest News ──────────────────────────────── */}
        {loading && (
          <div className="article-list">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div className="error-state">
            <p>Failed to load news: {error}</p>
            <button className="retry-btn" onClick={fetchFeeds}>Try again</button>
          </div>
        )}

        {!loading && !error && featured && (
          <>
            <div className="section-header section-header--mets">
              <img
                src="https://a.espncdn.com/i/teamlogos/mlb/500/nym.png"
                alt="Mets"
                className="section-header-logo"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
              <span className="section-header-label">The Latest News</span>
              <span className="section-header-line" />
            </div>

            <div className="team-news-card">
              {/* Featured */}
              <div className="team-news-item-wrap">
                <a
                  href={featured.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="team-news-featured"
                  onClick={() => markRead(featured.id)}
                >
                  {featured.image && (
                    <img src={featured.image} alt="" className="team-news-featured-img"
                      onError={e => { e.currentTarget.style.display = 'none' }} />
                  )}
                  <div className="team-news-featured-body">
                    <span className={`team-news-featured-title${readIds.has(featured.id) ? ' team-news--read' : ''}`}>
                      {featured.title}
                    </span>
                    <span className="team-news-meta">{timeAgo(featured.pubDate)} · {featured.source}</span>
                    <SubscriberBadge paywalled={featured.paywalled} />
                  </div>
                </a>
                <button className="item-remove" onClick={() => removeArticle(featured.id)} aria-label="Remove">✕</button>
              </div>

              {/* Secondary */}
              {secondary && (
                <>
                  <div className="team-news-divider" />
                  <div className="team-news-item-wrap">
                    <a href={secondary.link} target="_blank" rel="noopener noreferrer"
                      className="team-news-secondary" onClick={() => markRead(secondary.id)}>
                      {secondary.image && (
                        <img src={secondary.image} alt="" className="team-news-secondary-img"
                          onError={e => { e.currentTarget.style.display = 'none' }} />
                      )}
                      <div className="team-news-secondary-body">
                        <span className={`team-news-secondary-title${readIds.has(secondary.id) ? ' team-news--read' : ''}`}>
                          {secondary.title}
                        </span>
                        {secondary.description && <span className="team-news-secondary-desc">{secondary.description}</span>}
                        <span className="team-news-meta">{timeAgo(secondary.pubDate)} · {secondary.source}</span>
                        <SubscriberBadge paywalled={secondary.paywalled} />
                      </div>
                    </a>
                    <button className="item-remove" onClick={() => removeArticle(secondary.id)} aria-label="Remove">✕</button>
                  </div>
                </>
              )}

              {/* Tertiary */}
              {tertiary && (
                <>
                  <div className="team-news-divider" />
                  <div className="team-news-item-wrap">
                    <a href={tertiary.link} target="_blank" rel="noopener noreferrer"
                      className="team-news-secondary" onClick={() => markRead(tertiary.id)}>
                      {tertiary.image && (
                        <img src={tertiary.image} alt="" className="team-news-secondary-img"
                          onError={e => { e.currentTarget.style.display = 'none' }} />
                      )}
                      <div className="team-news-secondary-body">
                        <span className={`team-news-secondary-title${readIds.has(tertiary.id) ? ' team-news--read' : ''}`}>
                          {tertiary.title}
                        </span>
                        {tertiary.description && <span className="team-news-secondary-desc">{tertiary.description}</span>}
                        <span className="team-news-meta">{timeAgo(tertiary.pubDate)} · {tertiary.source}</span>
                        <SubscriberBadge paywalled={tertiary.paywalled} />
                      </div>
                    </a>
                    <button className="item-remove" onClick={() => removeArticle(tertiary.id)} aria-label="Remove">✕</button>
                  </div>
                </>
              )}

              {/* Headline row */}
              {headlines.length > 0 && (
                <>
                  <div className="team-news-divider" />
                  <div className="team-news-headlines team-news-headlines--row">
                    {headlines.map(a => (
                      <a key={a.id} href={a.link} target="_blank" rel="noopener noreferrer"
                        className={`team-news-headline${readIds.has(a.id) ? ' team-news--read' : ''}`}
                        onClick={() => markRead(a.id)}>
                        <span className="team-news-headline-body">
                          <span className="team-news-headline-title">{a.title}</span>
                          <span className="team-news-headline-source">
                            <img src={faviconUrl(a.link)} alt="" className="team-news-source-favicon"
                              onError={e => { e.currentTarget.style.display = 'none' }} />
                            {a.source} · {timeAgo(a.pubDate)}
                            {a.paywalled && <span className="subscriber-badge subscriber-badge--inline">Subscriber</span>}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── Upcoming Games (moved here) ───────────────── */}
            <ScheduleCard />

            {/* ── MLB Standings ─────────────────────────────── */}
            <StandingsCard />

            {/* ── More on the Mets ─────────────────────────── */}
            {moreNews.length > 0 && (
              <>
                <div className="section-header section-header--mets">
                  <span className="section-header-label">More on the Mets</span>
                  <span className="section-header-line" />
                </div>
                <div className="team-news-card">
                  {moreNews.map((a, idx) => (
                    <div key={a.id}>
                      {idx > 0 && <div className="team-news-divider" />}
                      <div className="team-news-item-wrap">
                        <a href={a.link} target="_blank" rel="noopener noreferrer"
                          className="team-news-secondary" onClick={() => markRead(a.id)}>
                          {a.image && (
                            <img src={a.image} alt="" className="team-news-secondary-img"
                              onError={e => { e.currentTarget.style.display = 'none' }} />
                          )}
                          <div className="team-news-secondary-body">
                            <span className={`team-news-secondary-title${readIds.has(a.id) ? ' team-news--read' : ''}`}>
                              {a.title}
                            </span>
                            {a.description && <span className="team-news-secondary-desc">{a.description}</span>}
                            <span className="team-news-meta">{timeAgo(a.pubDate)} · {a.source}</span>
                            <SubscriberBadge paywalled={a.paywalled} />
                          </div>
                        </a>
                        <button className="item-remove" onClick={() => removeArticle(a.id)} aria-label="Remove">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── The Athletic ─────────────────────────────────── */}
        {athFeatured && (
          <>
            <div className="section-header section-header--mets">
              <img
                src="https://www.google.com/s2/favicons?domain=theathletic.com&sz=64"
                alt="The Athletic"
                className="section-header-logo"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
              <span className="section-header-label">The Athletic</span>
              <span className="section-header-line" />
            </div>

            <div className="team-news-card">
              <div className="team-news-item-wrap">
                <a href={athFeatured.link} target="_blank" rel="noopener noreferrer"
                  className="team-news-featured" onClick={() => markRead(athFeatured.id)}>
                  {athFeatured.image && (
                    <img src={athFeatured.image} alt="" className="team-news-featured-img"
                      onError={e => { e.currentTarget.style.display = 'none' }} />
                  )}
                  <div className="team-news-featured-body">
                    <span className={`team-news-featured-title${readIds.has(athFeatured.id) ? ' team-news--read' : ''}`}>
                      {athFeatured.title}
                    </span>
                    <span className="team-news-meta">{timeAgo(athFeatured.pubDate)} · The Athletic</span>
                    <SubscriberBadge paywalled={athFeatured.paywalled} />
                  </div>
                </a>
                <button className="item-remove" onClick={() => removeArticle(athFeatured.id)} aria-label="Remove">✕</button>
              </div>

              {athSecondary && (
                <>
                  <div className="team-news-divider" />
                  <div className="team-news-item-wrap">
                    <a href={athSecondary.link} target="_blank" rel="noopener noreferrer"
                      className="team-news-secondary" onClick={() => markRead(athSecondary.id)}>
                      {athSecondary.image && (
                        <img src={athSecondary.image} alt="" className="team-news-secondary-img"
                          onError={e => { e.currentTarget.style.display = 'none' }} />
                      )}
                      <div className="team-news-secondary-body">
                        <span className={`team-news-secondary-title${readIds.has(athSecondary.id) ? ' team-news--read' : ''}`}>
                          {athSecondary.title}
                        </span>
                        {athSecondary.description && <span className="team-news-secondary-desc">{athSecondary.description}</span>}
                        <span className="team-news-meta">{timeAgo(athSecondary.pubDate)} · The Athletic</span>
                        <SubscriberBadge paywalled={athSecondary.paywalled} />
                      </div>
                    </a>
                    <button className="item-remove" onClick={() => removeArticle(athSecondary.id)} aria-label="Remove">✕</button>
                  </div>
                </>
              )}

              {athTertiary && (
                <>
                  <div className="team-news-divider" />
                  <div className="team-news-item-wrap">
                    <a href={athTertiary.link} target="_blank" rel="noopener noreferrer"
                      className="team-news-secondary" onClick={() => markRead(athTertiary.id)}>
                      {athTertiary.image && (
                        <img src={athTertiary.image} alt="" className="team-news-secondary-img"
                          onError={e => { e.currentTarget.style.display = 'none' }} />
                      )}
                      <div className="team-news-secondary-body">
                        <span className={`team-news-secondary-title${readIds.has(athTertiary.id) ? ' team-news--read' : ''}`}>
                          {athTertiary.title}
                        </span>
                        {athTertiary.description && <span className="team-news-secondary-desc">{athTertiary.description}</span>}
                        <span className="team-news-meta">{timeAgo(athTertiary.pubDate)} · The Athletic</span>
                        <SubscriberBadge paywalled={athTertiary.paywalled} />
                      </div>
                    </a>
                    <button className="item-remove" onClick={() => removeArticle(athTertiary.id)} aria-label="Remove">✕</button>
                  </div>
                </>
              )}

              {athHeadlines.length > 0 && (
                <>
                  <div className="team-news-divider" />
                  <div className="team-news-headlines team-news-headlines--row">
                    {athHeadlines.map(a => (
                      <a key={a.id} href={a.link} target="_blank" rel="noopener noreferrer"
                        className={`team-news-headline${readIds.has(a.id) ? ' team-news--read' : ''}`}
                        onClick={() => markRead(a.id)}>
                        <span className="team-news-headline-body">
                          <span className="team-news-headline-title">{a.title}</span>
                          <span className="team-news-headline-source">
                            <img src={faviconUrl(a.link)} alt="" className="team-news-source-favicon"
                              onError={e => { e.currentTarget.style.display = 'none' }} />
                            The Athletic · {timeAgo(a.pubDate)}
                            {a.paywalled && <span className="subscriber-badge subscriber-badge--inline">Subscriber</span>}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── See It on SNY ────────────────────────────────── */}
        <div className="section-header section-header--mets">
          <svg className="section-header-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="1" y="4" width="22" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/>
            <line x1="8" y1="20" x2="16" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="12" y1="18" x2="12" y2="20" stroke="currentColor" strokeWidth="1.8"/>
          </svg>
          <span className="section-header-label">See It on SNY</span>
          <span className="section-header-line" />
        </div>
        <SNYCard />

        {/* ── Option Dates ─────────────────────────────────── */}
        <OptionDatesCard />

        {!loading && !error && newsPool.length === 0 && !briefingArticle && (
          <div className="empty-state">No articles found.</div>
        )}
      </main>

      <footer className="footer">
        Updated {timeAgo(articles[0]?.pubDate) || 'just now'} · Mets Fix
      </footer>
    </div>
  )
}

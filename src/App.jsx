import { useState, useEffect, useCallback, useRef } from 'react'
import SkeletonCard from './components/SkeletonCard'
import ScheduleCard from './components/ScheduleCard'
import StandingsCard from './components/StandingsCard'
import OptionDatesCard from './components/OptionDatesCard'
import InjuredListCard from './components/InjuredListCard'
import SNYCard from './components/SNYCard'
import LatestUpdatesCard from './components/LatestUpdatesCard'
import LastGameCard from './components/LastGameCard'
import BlogRollCard from './components/BlogRollCard'
import RedditCard from './components/RedditCard'
import MLBNewsCard from './components/MLBNewsCard'
import SNYFeaturedCard from './components/SNYFeaturedCard'
import LiveScoreCard from './components/LiveScoreCard'
import MetsVideoCard from './components/MetsVideoCard'
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

function getBriefingTime() {
  const et = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const [h, m] = et.split(':').map(Number)
  const mins = h * 60 + m
  if (mins >= 240 && mins <= 720) return 'morning'
  if (mins <= 1020) return 'afternoon'
  return 'evening'
}

function getBriefingLabel() {
  const t = getBriefingTime()
  if (t === 'morning') return '☀️ Morning Briefing'
  if (t === 'afternoon') return '🍎 Afternoon Briefing'
  return '☾ Evening Briefing'
}

function SubscriberIcon() {
  return <span className="subscriber-icon" title="Subscriber Content">$</span>
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

  const topFeatured  = newsPool[0]
  const topSecondary = newsPool[1]
  const topTertiary  = newsPool[2]
  const hotOff       = newsPool.slice(3, 8)

  const featured   = newsPool[8]
  const secondary  = newsPool[9]
  const tertiary   = newsPool[10]
  const headlines  = newsPool.slice(11, 13)
  const moreNews   = newsPool.slice(13, 18)

  const shownIds = new Set(newsPool.slice(0, 18).map(a => a.id))
  const athleticPool = articles
    .filter(a => a.source === 'The Athletic' && !removedIds.has(a.id) && !shownIds.has(a.id))
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 5)
  const athFeatured  = athleticPool[0]
  const athSecondary = athleticPool[1]
  const athTertiary  = athleticPool[2]
  const athHeadlines = athleticPool.slice(3, 5)

  const allShownIds = new Set([...shownIds, ...athleticPool.map(a => a.id)])
  const FORTY_EIGHT_H = 48 * 60 * 60 * 1000
  const remainingPool = articles
    .filter(a =>
      !removedIds.has(a.id) &&
      !allShownIds.has(a.id) &&
      a.team !== 'metropolitan' &&
      Date.now() - new Date(a.pubDate).getTime() < FORTY_EIGHT_H
    )
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <header className="header">
        <div className="header-inner">
          <div className="logo-group">
            <img src="/mrmet.png" alt="" className="logo-mrmet" />
            <span className="logo-text">Mets <span>Fix</span></span>
          </div>
          <span className="header-date">{formatDate()}</span>
        </div>
      </header>

      {pullY > 10 && (
        <div className="pull-indicator" style={{ height: Math.min(pullY, 40) }}>
          {pullY >= 60 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}

      <main className="main">

        {/* ── Live Score ───────────────────────────────────── */}
        <LiveScoreCard />

        {/* ── The Latest Briefing ─────────────────────────── */}
        {briefingArticle && (
          <>
            <div className={`section-header section-header--mets section-header--briefing section-header--briefing-${getBriefingTime()}`}>
              <span className="section-header-label">{getBriefingLabel()}</span>
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
                <img src="/metsfix-banner.png" alt="Get Your Mets Fix" className="briefing-banner" />
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

        {/* ── Signup CTA ───────────────────────────────────── */}
        {briefingArticle && (
          <>
            <a
              href="https://themetropolitan.substack.com/subscribe"
              target="_blank"
              rel="noopener noreferrer"
              className="briefing-signup"
            >
              👉 Sign up to receive Mets Fix in your inbox
            </a>
            <div className="news-section-divider" />
          </>
        )}

        {/* ── Top News Card ────────────────────────────────── */}
        {loading && (
          <div className="team-news-card">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}
        {!loading && !error && topFeatured && (
          <div className="team-news-card">
            <div className="team-news-item-wrap">
              <a
                href={topFeatured.link}
                target="_blank"
                rel="noopener noreferrer"
                className="team-news-featured"
                onClick={() => markRead(topFeatured.id)}
              >
                {topFeatured.image && (
                  <img src={topFeatured.image} alt="" className="team-news-featured-img"
                    onError={e => { e.currentTarget.style.display = 'none' }} />
                )}
                <div className="team-news-featured-body">
                  <span className={`team-news-featured-title${readIds.has(topFeatured.id) ? ' team-news--read' : ''}`}>
                    {topFeatured.title}
                  </span>
                  <span className="team-news-meta">{timeAgo(topFeatured.pubDate)} · {topFeatured.source}{topFeatured.paywalled && <SubscriberIcon />}</span>
                </div>
              </a>
              <button className="item-remove" onClick={() => removeArticle(topFeatured.id)} aria-label="Remove">✕</button>
            </div>

            {topSecondary && (
              <>
                <div className="team-news-divider" />
                <div className="team-news-item-wrap">
                  <a href={topSecondary.link} target="_blank" rel="noopener noreferrer"
                    className="team-news-secondary" onClick={() => markRead(topSecondary.id)}>
                    {topSecondary.image && (
                      <img src={topSecondary.image} alt="" className="team-news-secondary-img"
                        onError={e => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <div className="team-news-secondary-body">
                      <span className={`team-news-secondary-title${readIds.has(topSecondary.id) ? ' team-news--read' : ''}`}>
                        {topSecondary.title}
                      </span>
                      <span className="team-news-meta">{timeAgo(topSecondary.pubDate)} · {topSecondary.source}{topSecondary.paywalled && <SubscriberIcon />}</span>
                    </div>
                  </a>
                  <button className="item-remove" onClick={() => removeArticle(topSecondary.id)} aria-label="Remove">✕</button>
                </div>
              </>
            )}

            {topTertiary && (
              <>
                <div className="team-news-divider" />
                <div className="team-news-item-wrap">
                  <a href={topTertiary.link} target="_blank" rel="noopener noreferrer"
                    className="team-news-secondary" onClick={() => markRead(topTertiary.id)}>
                    {topTertiary.image && (
                      <img src={topTertiary.image} alt="" className="team-news-secondary-img"
                        onError={e => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <div className="team-news-secondary-body">
                      <span className={`team-news-secondary-title${readIds.has(topTertiary.id) ? ' team-news--read' : ''}`}>
                        {topTertiary.title}
                      </span>
                      <span className="team-news-meta">{timeAgo(topTertiary.pubDate)} · {topTertiary.source}{topTertiary.paywalled && <SubscriberIcon />}</span>
                    </div>
                  </a>
                  <button className="item-remove" onClick={() => removeArticle(topTertiary.id)} aria-label="Remove">✕</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Hot Off the Presses ──────────────────────────── */}
        {loading ? (
          <div className="latest-updates-card">
            <div className="option-dates-skeleton" />
          </div>
        ) : (
          <LatestUpdatesCard title="Recently Published" articles={hotOff} />
        )}

        {/* ── Upcoming Games ───────────────────────────────── */}
        <ScheduleCard />

        {/* ── Last Game ────────────────────────────────────── */}
        <LastGameCard />

        {/* ── SNY Featured Video ───────────────────────────── */}
        <SNYFeaturedCard />

        {/* ── MLB News ─────────────────────────────────────── */}
        <MLBNewsCard />

        {/* ── MLB Standings ─────────────────────────────────── */}
        <StandingsCard />

        {/* ── Dive Into the News ───────────────────────────── */}
        <div className="section-header section-header--mets">
          <img
            src="https://a.espncdn.com/i/teamlogos/mlb/500/nym.png"
            alt="Mets"
            className="section-header-logo"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <span className="section-header-label">Dive Into the News</span>
          <span className="section-header-line" />
        </div>

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
                    <span className="team-news-meta">{timeAgo(featured.pubDate)} · {featured.source}{featured.paywalled && <SubscriberIcon />}</span>
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
                        <span className="team-news-meta">{timeAgo(secondary.pubDate)} · {secondary.source}{secondary.paywalled && <SubscriberIcon />}</span>
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
                        <span className="team-news-meta">{timeAgo(tertiary.pubDate)} · {tertiary.source}{tertiary.paywalled && <SubscriberIcon />}</span>
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
                            {a.source}{a.paywalled && <SubscriberIcon />} · {timeAgo(a.pubDate)}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── Mets YouTube Video ───────────────────────── */}
            <MetsVideoCard />

            {/* ── More on the Mets ─────────────────────────── */}
            {moreNews.length > 0 && (
              <>
                <div className="team-news-card">
                  <div className="latest-updates-header">
                    <span className="latest-updates-title">More on the Mets</span>
                  </div>
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
                            <span className="team-news-meta">{timeAgo(a.pubDate)} · {a.source}{a.paywalled && <SubscriberIcon />}</span>
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

        {/* ── Roster Activity ──────────────────────────────── */}
        <div className="section-header section-header--mets">
          <span className="section-header-label">📝 Roster Activity</span>
          <span className="section-header-line" />
        </div>

        {/* ── Option Dates ─────────────────────────────────── */}
        <OptionDatesCard />

        {/* ── Injured List ─────────────────────────────────── */}
        <InjuredListCard />

        {/* ── Ya Gotta Keep Reading ────────────────────────── */}
        <div className="section-header section-header--mets">
          <span className="section-header-label">📚 Ya Gotta Keep Reading</span>
          <span className="section-header-line" />
        </div>

        {/* ── The Athletic ─────────────────────────────────── */}
        {athFeatured && (
          <div className="team-news-card">
              <div className="latest-updates-header">
                <img
                  src="https://www.google.com/s2/favicons?domain=theathletic.com&sz=32"
                  alt=""
                  className="mlbnews-header-favicon"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
                <span className="latest-updates-title">The Athletic</span>
              </div>
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
                    <span className="team-news-meta">{timeAgo(athFeatured.pubDate)} · The Athletic{athFeatured.paywalled && <SubscriberIcon />}</span>
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
                        <span className="team-news-meta">{timeAgo(athSecondary.pubDate)} · The Athletic{athSecondary.paywalled && <SubscriberIcon />}</span>
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
                        <span className="team-news-meta">{timeAgo(athTertiary.pubDate)} · The Athletic{athTertiary.paywalled && <SubscriberIcon />}</span>
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
                            The Athletic{a.paywalled && <SubscriberIcon />} · {timeAgo(a.pubDate)}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}
          </div>
        )}

        {/* ── See It on SNY ────────────────────────────────── */}
        <SNYCard />

        {/* ── Blog Roll ────────────────────────────────────── */}
        <BlogRollCard />

        {/* ── Mets Reddit ──────────────────────────────────── */}
        <RedditCard />

        {/* ── Remaining Articles ───────────────────────────── */}
        {!loading && remainingPool.length > 0 && (
          <div className="team-news-card">
            <div className="latest-updates-header">
              <span className="latest-updates-title">More Mets News</span>
            </div>
            {remainingPool.map((a, idx) => (
              <div key={a.id}>
                {idx > 0 && <div className="team-news-divider" />}

                {/* idx 0 — full-width featured image */}
                {idx === 0 ? (
                  <div className="team-news-item-wrap">
                    <a href={a.link} target="_blank" rel="noopener noreferrer"
                      className="team-news-featured" onClick={() => markRead(a.id)}>
                      {a.image && (
                        <img src={a.image} alt="" className="team-news-featured-img"
                          onError={e => { e.currentTarget.style.display = 'none' }} />
                      )}
                      <div className="team-news-featured-body">
                        <span className={`team-news-featured-title${readIds.has(a.id) ? ' team-news--read' : ''}`}>
                          {a.title}
                        </span>
                        <span className="team-news-meta">
                          {timeAgo(a.pubDate)} ·{' '}
                          <img src={faviconUrl(a.link)} alt="" className="news-meta-favicon"
                            onError={e => { e.currentTarget.style.display = 'none' }} />
                          {a.source}{a.paywalled && <SubscriberIcon />}
                        </span>
                      </div>
                    </a>
                    <button className="item-remove" onClick={() => removeArticle(a.id)} aria-label="Remove">✕</button>
                  </div>

                /* idx 1–5 — secondary with small image */
                ) : idx < 6 ? (
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
                        <span className="team-news-meta">
                          {timeAgo(a.pubDate)} ·{' '}
                          <img src={faviconUrl(a.link)} alt="" className="news-meta-favicon"
                            onError={e => { e.currentTarget.style.display = 'none' }} />
                          {a.source}{a.paywalled && <SubscriberIcon />}
                        </span>
                      </div>
                    </a>
                    <button className="item-remove" onClick={() => removeArticle(a.id)} aria-label="Remove">✕</button>
                  </div>

                /* idx 6+ — no image, larger headline-only */
                ) : (
                  <div className="team-news-item-wrap">
                    <a href={a.link} target="_blank" rel="noopener noreferrer"
                      className="team-news-secondary" onClick={() => markRead(a.id)}>
                      <div className="team-news-secondary-body">
                        <span className={`team-news-secondary-title team-news-secondary-title--headline${readIds.has(a.id) ? ' team-news--read' : ''}`}>
                          {a.title}
                        </span>
                        <span className="team-news-meta">
                          {timeAgo(a.pubDate)} ·{' '}
                          <img src={faviconUrl(a.link)} alt="" className="news-meta-favicon"
                            onError={e => { e.currentTarget.style.display = 'none' }} />
                          {a.source}{a.paywalled && <SubscriberIcon />}
                        </span>
                      </div>
                    </a>
                    <button className="item-remove" onClick={() => removeArticle(a.id)} aria-label="Remove">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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

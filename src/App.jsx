import { useState, useEffect, useCallback, useRef } from 'react'
import SkeletonCard from './components/SkeletonCard'
import ScheduleCard from './components/ScheduleCard'
import StandingsCard from './components/StandingsCard'
import OptionDatesCard from './components/OptionDatesCard'
import InjuredListCard from './components/InjuredListCard'
import SNYCard from './components/SNYCard'
import LastGameCard from './components/LastGameCard'
import BlogRollCard from './components/BlogRollCard'
import RedditCard from './components/RedditCard'
import MLBNewsCard from './components/MLBNewsCard'
import SNYFeaturedCard from './components/SNYFeaturedCard'
import LiveScoreCard from './components/LiveScoreCard'
import MetsVideoCard from './components/MetsVideoCard'
import MetsStatsCard from './components/MetsStatsCard'
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

// Repeating pattern for Stories From Earlier (after idx 0 featured):
// 2 small-image, 3 big-headline, 2 small-image, 2 side-by-side → repeat (cycle of 9)
function groupRemainingArticles(articles) {
  if (!articles.length) return []
  const groups = [{ type: 'featured', items: [articles[0]] }]
  for (let i = 1; i < articles.length; i++) {
    const cp = (i - 1) % 9
    const type = cp <= 1 ? 'small' : cp <= 4 ? 'headline' : cp <= 6 ? 'small' : 'sidebyside'
    const last = groups[groups.length - 1]
    if (last.type === type) last.items.push(articles[i])
    else groups.push({ type, items: [articles[i]] })
  }
  return groups
}


export default function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('metsReadArticles') || '[]')) }
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

  const briefingArticle = articles.find(a => a.team === 'metropolitan') || null

  const newsPool = articles
    .filter(a => a.team === 'mets')
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))

  // Top card: MLB.com + SNY only, guarantee ≥2 MLB articles
  const mlbArticles = newsPool.filter(a => a.source === 'MLB.com').slice(0, 2)
  const mlbIds = new Set(mlbArticles.map(a => a.id))
  const topRemainder = newsPool
    .filter(a => (a.source === 'MLB.com' || a.source === 'SNY') && !mlbIds.has(a.id))
    .slice(0, 3)
  const topPool = [...mlbArticles, ...topRemainder]
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))

  const topFeatured  = topPool[0]
  const topSecondary = topPool[1]
  const topTertiary  = topPool[2]
  const topHeadline1 = topPool[3]
  const topHeadline2 = topPool[4]

  const topIds = new Set(topPool.slice(0, 5).map(a => a.id))

  // Dive Into the News: force 3 most recent Athletic + 7 others, guarantee Athletic in first 15
  const athleticForDive = articles
    .filter(a => a.source === 'The Athletic' && !topIds.has(a.id))
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 3)
  const athleticForDiveIds = new Set(athleticForDive.map(a => a.id))
  const othersForDive = newsPool
    .filter(a => !topIds.has(a.id) && !athleticForDiveIds.has(a.id))
    .slice(0, 7)
  const divePool = [...athleticForDive, ...othersForDive]
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
  const featured   = divePool[0]
  const secondary  = divePool[1]
  const tertiary   = divePool[2]
  const headlines  = divePool.slice(3, 5)
  const moreNews   = divePool.slice(5, 10)

  const shownIds = new Set([...topIds, ...divePool.map(a => a.id)])
  // SFE gets the 3 most recent Athletic not already in dive; Athletic card gets the next batch after those
  const athleticAllByDate = articles
    .filter(a => a.source === 'The Athletic' && !shownIds.has(a.id))
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
  const sfePriorityAthletic = athleticAllByDate.slice(0, 3)
  const sfePriorityAthleticIds = new Set(sfePriorityAthletic.map(a => a.id))
  const athleticPool = athleticAllByDate.filter(a => !sfePriorityAthleticIds.has(a.id)).slice(0, 5)
  const athFeatured  = athleticPool[0]
  const athSecondary = athleticPool[1]
  const athTertiary  = athleticPool[2]
  const athHeadlines = athleticPool.slice(3, 5)

  const allShownIds = new Set([...shownIds, ...sfePriorityAthleticIds, ...athleticPool.map(a => a.id)])
  const SEVENTY_TWO_H = 72 * 60 * 60 * 1000
  const sfeBase = articles
    .filter(a =>
      !allShownIds.has(a.id) &&
      a.team !== 'metropolitan' &&
      Date.now() - new Date(a.pubDate).getTime() < SEVENTY_TWO_H
    )
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
  // 3 most recent from MLB.com/SNY/NY Post pulled from sfeBase; Athletic handled separately above
  const sfePriority = [
    ...['MLB.com', 'SNY', 'NY Post'].flatMap(src => sfeBase.filter(a => a.source === src).slice(0, 3)),
    ...sfePriorityAthletic,
  ].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
  const sfePriorityIds = new Set(sfePriority.map(a => a.id))
  const remainingPool = [...sfePriority, ...sfeBase.filter(a => !sfePriorityIds.has(a.id))]

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
                </div>
              </>
            )}

            {topHeadline1 && (
              <>
                <div className="team-news-divider" />
                <div className="sfe-headline-article">
                  <div className="team-news-item-wrap">
                    <a href={topHeadline1.link} target="_blank" rel="noopener noreferrer"
                      className="sfe-headline-link" onClick={() => markRead(topHeadline1.id)}>
                      <span className={`sfe-headline-title${readIds.has(topHeadline1.id) ? ' team-news--read' : ''}`}>
                        {topHeadline1.title}
                      </span>
                      <span className="team-news-meta">
                        {timeAgo(topHeadline1.pubDate)} ·{' '}
                        <img src={faviconUrl(topHeadline1.link)} alt="" className="news-meta-favicon"
                          onError={e => { e.currentTarget.style.display = 'none' }} />
                        {topHeadline1.source}{topHeadline1.paywalled && <SubscriberIcon />}
                      </span>
                    </a>
                  </div>
                </div>
              </>
            )}

            {topHeadline2 && (
              <>
                <div className="team-news-divider" />
                <div className="sfe-headline-article">
                  <div className="team-news-item-wrap">
                    <a href={topHeadline2.link} target="_blank" rel="noopener noreferrer"
                      className="sfe-headline-link" onClick={() => markRead(topHeadline2.id)}>
                      <span className={`sfe-headline-title${readIds.has(topHeadline2.id) ? ' team-news--read' : ''}`}>
                        {topHeadline2.title}
                      </span>
                      <span className="team-news-meta">
                        {timeAgo(topHeadline2.pubDate)} ·{' '}
                        <img src={faviconUrl(topHeadline2.link)} alt="" className="news-meta-favicon"
                          onError={e => { e.currentTarget.style.display = 'none' }} />
                        {topHeadline2.source}{topHeadline2.paywalled && <SubscriberIcon />}
                      </span>
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Upcoming Games ───────────────────────────────── */}
        <ScheduleCard />

        {/* ── Last Game ────────────────────────────────────── */}
        <LastGameCard />

        {/* ── SNY Featured Video ───────────────────────────── */}
        <SNYFeaturedCard />

        {/* ── MLB News ─────────────────────────────────────── */}
        <MLBNewsCard shownLinks={new Set(articles.flatMap(a => {
          const links = [a.link]
          try {
            const u = new URL(a.link)
            links.push(u.origin + u.pathname.replace(/^\/[a-z-]+\/news\//, '/news/'))
          } catch {}
          return links
        }))} />

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

            {/* ── Mets Stats ───────────────────────────────── */}
            <MetsStatsCard />

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
                            <span className="team-news-meta">
                              {timeAgo(a.pubDate)} ·{' '}
                              <img src={faviconUrl(a.link)} alt="" className="news-meta-favicon"
                                onError={e => { e.currentTarget.style.display = 'none' }} />
                              {a.source}{a.paywalled && <SubscriberIcon />}
                            </span>
                          </div>
                        </a>
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

        {/* ── Stories From Earlier ─────────────────────────── */}
        {!loading && remainingPool.length > 0 && (() => {
          const chunks = []
          for (let i = 0; i < remainingPool.length; i += 10) chunks.push(remainingPool.slice(i, i + 10))
          return (
            <>
              <div className="section-header section-header--mets">
                <span className="section-header-label">📰 Stories From Earlier</span>
                <span className="section-header-line" />
              </div>
              {chunks.map((chunk, ci) => {
                const sfeGroups = groupRemainingArticles(chunk)
                return <div key={ci} className="team-news-card">
                {sfeGroups.map((group, gi) => {
                  const prevType = gi > 0 ? sfeGroups[gi - 1].type : null
                  const showDivider = gi > 0 && group.type !== 'headline' && prevType !== 'headline'
                  return (
                    <div key={gi}>
                      {showDivider && <div className="team-news-divider" />}

                      {/* Featured — large image */}
                      {group.type === 'featured' && group.items.map(a => (
                        <div key={a.id} className="team-news-item-wrap">
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
                          </div>
                      ))}

                      {/* Small — thumbnail + title */}
                      {group.type === 'small' && group.items.map((a, i) => (
                        <div key={a.id}>
                          {i > 0 && <div className="team-news-divider" />}
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
                              </div>
                        </div>
                      ))}

                      {/* Headline — large text, dividers between items */}
                      {group.type === 'headline' && group.items.map((a, i) => (
                        <div key={a.id}>
                          {i > 0 && <div className="team-news-divider" />}
                          <div className="sfe-headline-article">
                            <div className="team-news-item-wrap">
                              <a href={a.link} target="_blank" rel="noopener noreferrer"
                                className="sfe-headline-link" onClick={() => markRead(a.id)}>
                                <span className={`sfe-headline-title${readIds.has(a.id) ? ' team-news--read' : ''}`}>
                                  {a.title}
                                </span>
                                <span className="team-news-meta">
                                  {timeAgo(a.pubDate)} ·{' '}
                                  <img src={faviconUrl(a.link)} alt="" className="news-meta-favicon"
                                    onError={e => { e.currentTarget.style.display = 'none' }} />
                                  {a.source}{a.paywalled && <SubscriberIcon />}
                                </span>
                              </a>
                                  </div>
                          </div>
                        </div>
                      ))}

                      {/* Side-by-side — 2-column grid, title only */}
                      {group.type === 'sidebyside' && (
                        <div className="team-news-sidebyside">
                          {group.items.map(a => (
                            <div key={a.id} className="team-news-sidebyside-item">
                              <a href={a.link} target="_blank" rel="noopener noreferrer"
                                className="team-news-sidebyside-link" onClick={() => markRead(a.id)}>
                                <span className={`team-news-sidebyside-title${readIds.has(a.id) ? ' team-news--read' : ''}`}>
                                  {a.title}
                                </span>
                                <span className="team-news-meta">
                                  {timeAgo(a.pubDate)} ·{' '}
                                  <img src={faviconUrl(a.link)} alt="" className="news-meta-favicon"
                                    onError={e => { e.currentTarget.style.display = 'none' }} />
                                  {a.source}{a.paywalled && <SubscriberIcon />}
                                </span>
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                </div>
              })}
            </>
          )
        })()}

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

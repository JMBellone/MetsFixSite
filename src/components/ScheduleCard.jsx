import { useState, useEffect } from 'react'

function etDateKey(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

// Before Opening Day: anchor on March 26. On/after Opening Day: anchor on first upcoming game.
const OPENING_DAY = new Date(2026, 2, 26) // March 26, 2026 local

function nextThreeDates(games) {
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const today = new Date(...todayKey.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v)))

  let anchor
  if (today < OPENING_DAY) {
    anchor = OPENING_DAY
  } else if (games.length > 0) {
    const [y, m, d] = etDateKey(games[0].date).split('-').map(Number)
    anchor = new Date(y, m - 1, d)
  } else {
    anchor = today
  }

  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(anchor)
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('en-CA')
  })
}

function formatDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  }) + ' ET'
}

function lastName(name) {
  if (!name) return null
  return name.split(' ').pop()
}

const BROADCAST_MAP = {
  'SNY':         { label: 'SNY',           domain: 'sny.tv',        href: 'https://www.mlb.com/live-stream-games/subscribe' },
  'WPIX':        { label: 'WPIX (MLB.TV)', domain: 'wpix.com',      href: 'https://www.mlb.com/live-stream-games/subscribe' },
  'ESPN':        { label: 'ESPN',          domain: 'espn.com',      href: 'https://www.espn.com/watch/' },
  'ESPN2':       { label: 'ESPN2',         domain: 'espn.com',      href: 'https://www.espn.com/watch/' },
  'NBC':         { label: 'NBC',           domain: 'nbc.com',       href: 'https://www.peacocktv.com' },
  'FS1':         { label: 'FS1',           domain: 'foxsports.com', href: 'https://www.foxsports.com/live' },
  'TBS':         { label: 'TBS',           domain: 'tbs.com',       href: 'https://www.tbs.com/watchtbs' },
  'Apple TV+':   { label: 'Apple TV+',     domain: 'tv.apple.com',  href: 'https://tv.apple.com' },
  'Peacock':     { label: 'Peacock',       domain: 'peacocktv.com', href: 'https://www.peacocktv.com' },
  'MLB Network': { label: 'MLB Network',   domain: 'mlb.com',       href: 'https://www.mlb.com/network' },
  'MLB.TV':      { label: 'MLB.TV',        domain: 'mlb.com',       href: 'https://www.mlb.com/live-stream-games/subscribe' },
}

function broadcastInfo(raw) {
  if (!raw) return null
  return BROADCAST_MAP[raw] || { label: raw, domain: null, href: null }
}

export default function ScheduleCard() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/schedule')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.games) setGames(data.games) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const dates = nextThreeDates(games)
  const gamesByDate = {}
  games.forEach(g => {
    const key = etDateKey(g.date)
    if (!gamesByDate[key]) gamesByDate[key] = g
  })

  const slots = dates.map(dateKey => ({ dateKey, game: gamesByDate[dateKey] || null }))

  return (
    <div className="schedule-card">
      <div className="schedule-header">
        <svg className="schedule-header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" fill="none"/>
          <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.7"/>
          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
        <span className="schedule-title">Upcoming Schedule</span>
      </div>
      <div className="schedule-grid">
        {slots.map(({ dateKey, game }) => (
          <div key={dateKey} className="schedule-game">
            {game ? (
              <>
                <div className="schedule-matchup">
                  <span className="schedule-ha">{game.isHome ? 'vs' : '@'}</span>
                  {game.opponentLogo && (
                    <img
                      className="schedule-opp-logo"
                      src={game.opponentLogo}
                      alt={game.opponentAbbr}
                    />
                  )}
                  <span className="schedule-opp-abbr">{game.opponentAbbr}</span>
                </div>
                <span className="schedule-date">{formatDateKey(dateKey)}</span>
                <span className="schedule-time">{formatTime(game.date)}</span>
                {(game.metsStarter || game.oppStarter) && (
                  <span className="schedule-starters">
                    {game.metsStarter && game.oppStarter
                      ? `${lastName(game.metsStarter)} vs ${lastName(game.oppStarter)}`
                      : lastName(game.metsStarter) || lastName(game.oppStarter)}
                  </span>
                )}
                {(() => {
                  const bc = broadcastInfo(game.broadcast)
                  if (!bc) return null
                  const Tag = bc.href ? 'a' : 'span'
                  const linkProps = bc.href
                    ? { href: bc.href, target: '_blank', rel: 'noopener noreferrer' }
                    : {}
                  return (
                    <Tag className="schedule-tv" {...linkProps}>
                      {bc.domain && (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${bc.domain}&sz=32`}
                          alt=""
                          className="schedule-tv-icon"
                          onError={e => { e.currentTarget.style.display = 'none' }}
                        />
                      )}
                      {bc.label}
                    </Tag>
                  )
                })()}
              </>
            ) : (
              <>
                <span className="schedule-off-label">Off Day</span>
                <span className="schedule-date">{formatDateKey(dateKey)}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'

const OPENING_DATE = new Date(2026, 2, 27) // March 27, 2026

function nextThreeDates(games) {
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const today = new Date(...todayKey.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v)))

  let anchor
  if (today < OPENING_DATE) {
    anchor = OPENING_DATE
  } else if (games.length > 0) {
    const [y, m, d] = games[0].officialDate.split('-').map(Number)
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

export default function SyracuseScheduleCard() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/syracuse')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.games) setGames(data.games) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const dates = nextThreeDates(games)
  const gamesByDate = {}
  games.forEach(g => {
    if (!gamesByDate[g.officialDate]) gamesByDate[g.officialDate] = g
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
        <span className="schedule-title">Syracuse Mets Schedule</span>
      </div>
      <div className="schedule-grid">
        {slots.map(({ dateKey, game }) => (
          <div key={dateKey} className="schedule-game">
            {game ? (
              <>
                <div className="schedule-matchup">
                  <span className="schedule-ha">{game.isHome ? 'vs' : '@'}</span>
                  <span className="schedule-opp-abbr">{game.opponentAbbr}</span>
                </div>
                <span className="schedule-date">{formatDateKey(dateKey)}</span>
                <span className="schedule-time">{formatTime(game.date)}</span>
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

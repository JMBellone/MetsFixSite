import { useState, useEffect } from 'react'

function formatGame(dateStr) {
  const date = new Date(dateStr)
  const day = date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York'
  })
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York'
  }) + ' ET'
  return { day, time }
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

  if (loading || games.length === 0) return null

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
        {games.map(game => {
          const { day, time } = formatGame(game.date)
          return (
            <div key={game.id} className="schedule-game">
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
              <span className="schedule-date">{day}</span>
              <span className="schedule-time">{time}</span>
              {(game.metsStarter || game.oppStarter) && (
                <span className="schedule-starters">
                  {game.metsStarter && game.oppStarter
                    ? `${game.metsStarter} vs ${game.oppStarter}`
                    : game.metsStarter || game.oppStarter}
                </span>
              )}
              {game.broadcast && (
                <span className="schedule-tv">{game.broadcast}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

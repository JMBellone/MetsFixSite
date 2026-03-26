import { useState, useEffect, useRef, useCallback } from 'react'
import './ScoresCard.css'

const MLB_LOGO = 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png'

function GameTile({ game }) {
  const { away, home, status, inning, inningHalf, startTime } = game

  const inningLabel = status === 'live' && inning
    ? `${inningHalf === 'Top' ? 'T' : inningHalf === 'Bottom' ? 'B' : 'M'}${inning}`
    : null

  const finalLabel = status === 'final'
    ? (inning && inning > 9 ? `F/${inning}` : 'FINAL')
    : null

  return (
    <div className={`sc-tile${status === 'live' ? ' sc-tile--live' : ''}`}>
      <div className="sc-teams">
        <div className="sc-team-row">
          <img className="sc-logo" src={away.logo} alt={away.abbr} onError={e => { e.currentTarget.style.display = 'none' }} />
          <span className={`sc-abbr${away.win ? ' sc-abbr--win' : ''}`}>{away.abbr}</span>
          <span className={`sc-score${away.win ? ' sc-score--win' : status === 'preview' ? ' sc-score--hidden' : ''}`}>
            {away.score ?? ''}
          </span>
        </div>
        <div className="sc-team-row">
          <img className="sc-logo" src={home.logo} alt={home.abbr} onError={e => { e.currentTarget.style.display = 'none' }} />
          <span className={`sc-abbr${home.win ? ' sc-abbr--win' : ''}`}>{home.abbr}</span>
          <span className={`sc-score${home.win ? ' sc-score--win' : status === 'preview' ? ' sc-score--hidden' : ''}`}>
            {home.score ?? ''}
          </span>
        </div>
      </div>
      <div className="sc-status-row">
        {status === 'live' && (
          <span className="sc-status sc-status--live">
            <span className="sc-live-dot" />
            {inningLabel}
          </span>
        )}
        {status === 'final' && <span className="sc-status sc-status--final">{finalLabel}</span>}
        {status === 'preview' && <span className="sc-status sc-status--time">{startTime}</span>}
        {status === 'postponed' && <span className="sc-status sc-status--ppd">PPD</span>}
        {status === 'suspended' && <span className="sc-status sc-status--ppd">SUSP</span>}
      </div>
    </div>
  )
}

export default function ScoresCard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const intervalRef = useRef(null)

  const fetchScores = useCallback(async () => {
    try {
      const r = await fetch('/api/scores')
      if (!r.ok) return
      const d = await r.json()
      setData(d)
      setLoading(false)
      const isLive = d.games?.some(g => g.status === 'live')
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(fetchScores, isLive ? 30000 : 300000)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScores()
    return () => clearInterval(intervalRef.current)
  }, [fetchScores])

  if (loading || !data?.games?.length) return null

  const nlEastGames = data.games.filter(g => g.isNLEast)
  const otherGames = data.games.filter(g => !g.isNLEast)

  // Minimum 5 games: fill from other games (already sorted live → final → preview)
  const defaultGames = nlEastGames.length >= 5
    ? nlEastGames
    : [...nlEastGames, ...otherGames.slice(0, 5 - nlEastGames.length)]

  const displayGames = showAll ? data.games : defaultGames
  const hasMore = data.games.length > defaultGames.length

  return (
    <div className="sc-card">
      <div className="sc-header">
        <img src={MLB_LOGO} alt="MLB" className="sc-header-logo" onError={e => { e.currentTarget.style.display = 'none' }} />
        <span className="sc-header-title">MLB Scores</span>
        <span className="sc-header-date">{data.displayLabel}</span>
      </div>
      <div className="sc-grid">
        {displayGames.map(g => <GameTile key={g.gamePk} game={g} />)}
      </div>
      {(hasMore || showAll) && (
        <button className="sc-toggle" onClick={() => setShowAll(s => !s)}>
          {showAll ? 'Show Less' : 'Show All Scores'}
          <svg viewBox="0 0 24 24" fill="none" className={`lg-toggle-chevron${showAll ? ' lg-toggle-chevron--open' : ''}`}>
            <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

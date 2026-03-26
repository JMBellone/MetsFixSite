import { useState, useEffect, useRef, useCallback } from 'react'
import './ScoresCard.css'

const MLB_LOGO = 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png'

function GameRow({ game }) {
  const { away, home, status, inning, inningHalf, startTime } = game

  let statusEl
  if (status === 'live') {
    const half = inningHalf === 'Top' ? 'T' : inningHalf === 'Bottom' ? 'B' : 'M'
    statusEl = (
      <span className="sc-status sc-status--live">
        <span className="sc-live-dot" />
        {half}{inning}
      </span>
    )
  } else if (status === 'final') {
    const label = inning && inning > 9 ? `F/${inning}` : 'Final'
    statusEl = <span className="sc-status sc-status--final">{label}</span>
  } else if (status === 'postponed') {
    statusEl = <span className="sc-status sc-status--ppd">PPD</span>
  } else if (status === 'suspended') {
    statusEl = <span className="sc-status sc-status--ppd">SUSP</span>
  } else {
    statusEl = <span className="sc-status sc-status--time">{startTime}</span>
  }

  const awayDim = status === 'final' && !away.win
  const homeDim = status === 'final' && !home.win

  return (
    <div className="sc-row">
      {/* Away (left) */}
      <div className="sc-side">
        <img className="sc-logo" src={away.logo} alt={away.abbr} onError={e => { e.currentTarget.style.display = 'none' }} />
        <span className={`sc-abbr${awayDim ? ' sc-dim' : ''}`}>{away.abbr}</span>
        <span className={`sc-score${awayDim ? ' sc-dim' : away.win ? ' sc-score--win' : ''}`}>
          {status !== 'preview' ? (away.score ?? '') : ''}
        </span>
      </div>

      {/* Center status */}
      <div className="sc-mid">{statusEl}</div>

      {/* Home (right) */}
      <div className="sc-side sc-side--home">
        <span className={`sc-score${homeDim ? ' sc-dim' : home.win ? ' sc-score--win' : ''}`}>
          {status !== 'preview' ? (home.score ?? '') : ''}
        </span>
        <span className={`sc-abbr${homeDim ? ' sc-dim' : ''}`}>{home.abbr}</span>
        <img className="sc-logo" src={home.logo} alt={home.abbr} onError={e => { e.currentTarget.style.display = 'none' }} />
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

      <div className="sc-list">
        {displayGames.map(g => <GameRow key={g.gamePk} game={g} />)}
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

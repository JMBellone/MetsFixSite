import { useState, useEffect, useRef, useCallback } from 'react'

function logoUrl(abbr) {
  if (!abbr) return ''
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${abbr.toLowerCase()}.png`
}

function shortName(full) {
  if (!full) return ''
  const parts = full.trim().split(/\s+/)
  if (parts.length < 2) return full
  return parts[parts.length - 1]
}

function BasesDiamond({ first, second, third }) {
  return (
    <div className="live-diamond">
      <div className={`live-base live-base--second${second ? ' live-base--on' : ''}`} />
      <div className="live-diamond-mid">
        <div className={`live-base live-base--third${third ? ' live-base--on' : ''}`} />
        <div className={`live-base live-base--first${first ? ' live-base--on' : ''}`} />
      </div>
      <div className="live-base live-base--home" />
    </div>
  )
}

function OutDots({ outs }) {
  return (
    <div className="live-outs">
      {[0, 1, 2].map(i => (
        <div key={i} className={`live-out-dot${i < outs ? ' live-out-dot--on' : ''}`} />
      ))}
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="live-refresh-icon">
      <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.51 15a9 9 0 1 0 .49-3.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function LiveScoreCard() {
  const [game, setGame] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)

  const fetchGame = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/livegame')
      if (!res.ok) return
      const data = await res.json()
      setGame(data.isLive ? data : null)
      setLastUpdated(new Date())
    } catch {
      // silently fail — if fetch fails, keep showing last known state
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchGame()
    intervalRef.current = setInterval(fetchGame, 30000)
    return () => clearInterval(intervalRef.current)
  }, [fetchGame])

  if (!game) return null

  const { home, away, inningHalf, inningOrdinal, outs, balls, strikes, runners, batter, pitcher, status } = game
  const isTop = inningHalf === 'Top'
  const metScore = game.metsIsHome ? home.score : away.score
  const oppScore = game.metsIsHome ? away.score : home.score
  const winning = metScore > oppScore
  const losing = metScore < oppScore

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''

  return (
    <div className="live-card">
      {/* Header row */}
      <div className="live-header">
        <div className="live-badge">
          <span className="live-dot" />
          LIVE
        </div>
        <span className="live-status">{status}</span>
        <button
          className={`live-refresh-btn${refreshing ? ' live-refresh-btn--spinning' : ''}`}
          onClick={fetchGame}
          disabled={refreshing}
          aria-label="Refresh score"
        >
          <RefreshIcon />
          {timeStr && <span className="live-refresh-time">{timeStr}</span>}
        </button>
      </div>

      {/* Scoreboard */}
      <div className="live-scoreboard">
        {/* Away team */}
        <div className={`live-team${!game.metsIsHome && losing ? ' live-team--mets' : ''}`}>
          <img
            src={logoUrl(away.abbr)}
            alt={away.abbr}
            className="live-team-logo"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <span className="live-team-abbr">{away.abbr || away.name}</span>
          {!game.metsIsHome && <span className="live-team-label">Mets</span>}
        </div>

        <div className="live-scores">
          <span className={`live-score${away.score > home.score ? ' live-score--lead' : ''}`}>{away.score}</span>
          <span className="live-scores-sep">–</span>
          <span className={`live-score${home.score > away.score ? ' live-score--lead' : ''}`}>{home.score}</span>
        </div>

        {/* Home team */}
        <div className={`live-team live-team--home${game.metsIsHome && losing ? ' live-team--mets' : ''}`}>
          <img
            src={logoUrl(home.abbr)}
            alt={home.abbr}
            className="live-team-logo"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <span className="live-team-abbr">{home.abbr || home.name}</span>
          {game.metsIsHome && <span className="live-team-label">Mets</span>}
        </div>
      </div>

      {/* Game state row */}
      <div className="live-state">
        <div className="live-inning">
          <span className="live-inning-arrow">{isTop ? '▲' : '▼'}</span>
          <span className="live-inning-text">{inningOrdinal}</span>
        </div>

        <OutDots outs={outs} />

        <div className="live-count">{balls}–{strikes}</div>

        <BasesDiamond first={runners.first} second={runners.second} third={runners.third} />
      </div>

      {/* Batter / Pitcher */}
      {(batter || pitcher) && (
        <div className="live-matchup">
          {batter && (
            <span className="live-matchup-item">
              <span className="live-matchup-label">AB</span>
              {shortName(batter)}
            </span>
          )}
          {pitcher && (
            <span className="live-matchup-item">
              <span className="live-matchup-label">P</span>
              {shortName(pitcher)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

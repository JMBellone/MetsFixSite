import { useState, useEffect, useRef, useCallback } from 'react'
import { broadcastInfo } from '../utils/broadcastInfo'

function logoUrl(abbr) {
  if (!abbr) return ''
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${abbr.toLowerCase()}.png`
}

const SUFFIXES = new Set(['jr.', 'sr.', 'ii', 'iii', 'iv', 'v'])

function initLast(full) {
  if (!full) return ''
  const parts = full.trim().split(/\s+/)
  if (parts.length < 2) return full
  const last = parts[parts.length - 1]
  if (SUFFIXES.has(last.toLowerCase()) && parts.length >= 3) {
    return `${parts[0][0]}. ${parts[parts.length - 2]} ${last}`
  }
  return `${parts[0][0]}. ${last}`
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

function BSORow({ label, filled, total, colorClass }) {
  return (
    <div className="live-bso-row">
      <span className="live-bso-label">{label}</span>
      <div className="live-bso-dots">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`live-bso-dot${i < filled ? ` live-bso-dot--${colorClass}` : ''}`}
          />
        ))}
      </div>
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

export default function LiveScoreCard({ onLiveChange }) {
  const [game, setGame] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showScoringPlays, setShowScoringPlays] = useState(false)
  const [showBoxScore, setShowBoxScore] = useState(false)
  const [showManagerCard, setShowManagerCard] = useState(false)
  const [managerSplits, setManagerSplits] = useState(null)
  const [splitsLoading, setSplitsLoading] = useState(false)
  const [activeTeam, setActiveTeam] = useState('mets')
  const intervalRef = useRef(null)

  const scheduleInterval = useCallback((isLive) => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(fetchGame, isLive ? 30000 : 300000)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGame = useCallback(async () => {
    setRefreshing(true)
    try {
      const debugPk = localStorage.getItem('metsDebugGamePk')
      const url = debugPk ? `/api/livegame?gamePk=${debugPk}` : '/api/livegame'
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      const live = data.isLive ? data : null
      setGame(live)
      onLiveChange?.(!!live, data.gameFinishedToday ?? false)
      setLastUpdated(new Date())
      scheduleInterval(!!live)
    } catch {
      // silently fail — keep showing last known state
    } finally {
      setRefreshing(false)
    }
  }, [scheduleInterval])

  useEffect(() => {
    fetchGame()
    return () => clearInterval(intervalRef.current)
  }, [fetchGame])

  // Pause polling when app is backgrounded / screen locked; resume on return
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current)
      } else {
        fetchGame()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchGame])

  // Fetch split stats once when Manager's Card is first opened
  useEffect(() => {
    if (!showManagerCard || managerSplits || splitsLoading || !game?.gamePk) return
    setSplitsLoading(true)
    fetch(`/api/managerscard?gamePk=${game.gamePk}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setManagerSplits(d) })
      .catch(() => {})
      .finally(() => setSplitsLoading(false))
  }, [showManagerCard, game?.gamePk]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!game) return null

  const {
    home, away, inningHalf, inningOrdinal, outs, balls, strikes,
    runners, batter, pitcher, batterStats, pitcherStats,
    status, broadcast, venue, metsIsHome, linescore, scoringPlays, boxscore, managers,
  } = game

  const isTop = inningHalf === 'Top'
  const metsSide = metsIsHome ? 'home' : 'away'
  const oppSide = metsIsHome ? 'away' : 'home'
  const oppTeam = metsIsHome ? away : home
  const oppName = oppTeam.teamName || oppTeam.abbr || 'OPP'

  const activeBatters = (activeTeam === 'mets' ? boxscore?.[metsSide] : boxscore?.[oppSide])?.batters || []
  const activePitchers = (activeTeam === 'mets' ? boxscore?.[metsSide] : boxscore?.[oppSide])?.pitchers || []

  const maxInning = Math.max(9, ...(linescore?.innings?.map(i => i.num) || [9]))
  const inningNums = Array.from({ length: maxInning }, (_, i) => i + 1)
  const inningMap = Object.fromEntries((linescore?.innings || []).map(i => [i.num, i]))

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
        {(() => {
          const bc = broadcastInfo(broadcast)
          if (!bc) return null
          const Tag = bc.href ? 'a' : 'span'
          const linkProps = bc.href ? { href: bc.href, target: '_blank', rel: 'noopener noreferrer' } : {}
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
        <div className="live-team">
          <img
            src={logoUrl(away.abbr)}
            alt={away.teamName || away.abbr}
            className="live-team-logo"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <span className="live-team-name">{away.teamName || away.abbr}</span>
        </div>

        <div className="live-scores">
          <span className={`live-score${away.score > home.score ? ' live-score--lead' : ''}`}>{away.score}</span>
          <span className="live-scores-sep">–</span>
          <span className={`live-score${home.score > away.score ? ' live-score--lead' : ''}`}>{home.score}</span>
        </div>

        <div className="live-team live-team--home">
          <img
            src={logoUrl(home.abbr)}
            alt={home.teamName || home.abbr}
            className="live-team-logo"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <span className="live-team-name">{home.teamName || home.abbr}</span>
        </div>
      </div>

      {/* Venue */}
      {venue && <div className="live-venue">{venue}</div>}

      {/* Game info: diamond + BSO on left, inning + batter/pitcher on right */}
      <div className="live-gameinfo">
        <div className="live-gameinfo-left">
          <BasesDiamond first={runners.first} second={runners.second} third={runners.third} />
          <div className="live-bso">
            <BSORow label="B" filled={balls} total={4} colorClass="ball" />
            <BSORow label="S" filled={strikes} total={3} colorClass="strike" />
            <BSORow label="O" filled={outs} total={3} colorClass="out" />
          </div>
        </div>
        <div className="live-gameinfo-right">
          <div className="live-inning-row">
            <span className="live-inning-arrow">{isTop ? '▲' : '▼'}</span>
            <span className="live-inning-text">{inningOrdinal}</span>
          </div>
          {batter && (
            <div className="live-player-row">
              <span className="live-player-label">BAT</span>
              <span className="live-player-name">{initLast(batter)}</span>
              {batterStats && (
                <span className="live-player-stats">{batterStats.h}-{batterStats.ab}</span>
              )}
            </div>
          )}
          {pitcher && (
            <div className="live-player-row">
              <span className="live-player-label">PIT</span>
              <span className="live-player-name">{initLast(pitcher)}</span>
              {pitcherStats && (
                <span className="live-player-stats">{pitcherStats.ip} IP, {pitcherStats.er} ER, {pitcherStats.h}H, {pitcherStats.k}K, {pitcherStats.pc}P</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toggles */}
      <div className="live-boxscore-bar">
        <button className="live-boxscore-toggle" onClick={() => setShowScoringPlays(s => !s)}>
          {showScoringPlays ? 'Hide Scoring Plays ▲' : 'Scoring Plays ▼'}
        </button>
      </div>
      <div className="live-boxscore-bar live-boxscore-bar--tight">
        <button className="live-boxscore-toggle" onClick={() => setShowBoxScore(s => !s)}>
          {showBoxScore ? 'Hide Box Score ▲' : 'Box Score ▼'}
        </button>
      </div>
      <div className="live-boxscore-bar live-boxscore-bar--tight">
        <button className="live-boxscore-toggle" onClick={() => setShowManagerCard(s => !s)}>
          {showManagerCard ? "Hide Manager's Card ▲" : "Manager's Card ▼"}
        </button>
      </div>

      {/* Scoring Plays */}
      {showScoringPlays && (
        <div className="live-boxscore">
          {(!scoringPlays || scoringPlays.length === 0) ? (
            <div className="live-sp-empty">No scoring plays yet</div>
          ) : (
            <div className="live-sp-list">
              {scoringPlays.map((sp, i) => {
                const metsScored = metsIsHome ? sp.half === 'bottom' : sp.half === 'top'
                const metsS = metsIsHome ? sp.homeScore : sp.awayScore
                const oppS  = metsIsHome ? sp.awayScore : sp.homeScore
                const metsAbbr = (metsIsHome ? home : away).abbr
                const oppAbbr  = (metsIsHome ? away : home).abbr
                return (
                  <div key={i} className={`live-sp-row${metsScored ? ' live-sp-row--mets' : ' live-sp-row--opp'}`}>
                    <span className="live-sp-inning">
                      {sp.half === 'top' ? '▲' : '▼'}{sp.inning}
                    </span>
                    <span className="live-sp-desc">{sp.desc}</span>
                    <span className="live-sp-score">
                      {metsAbbr} {metsS}, {oppAbbr} {oppS}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Box score */}
      {showBoxScore && (
        <div className="live-boxscore">
          {/* Linescore */}
          <div className="live-linescore-wrap">
            <table className="live-linescore">
              <thead>
                <tr>
                  <th className="live-ls-team-col"></th>
                  {inningNums.map(n => <th key={n} className="live-ls-num-col">{n}</th>)}
                  <th className="live-ls-rhe-col">R</th>
                  <th className="live-ls-rhe-col">H</th>
                  <th className="live-ls-rhe-col">E</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="live-ls-team-col">{away.abbr}</td>
                  {inningNums.map(n => (
                    <td key={n} className="live-ls-num-col">{inningMap[n]?.away ?? ''}</td>
                  ))}
                  <td className="live-ls-rhe-col live-ls-rhe">{linescore?.totals?.away?.r ?? 0}</td>
                  <td className="live-ls-rhe-col">{linescore?.totals?.away?.h ?? 0}</td>
                  <td className="live-ls-rhe-col">{linescore?.totals?.away?.e ?? 0}</td>
                </tr>
                <tr>
                  <td className="live-ls-team-col">{home.abbr}</td>
                  {inningNums.map(n => (
                    <td key={n} className="live-ls-num-col">{inningMap[n]?.home ?? ''}</td>
                  ))}
                  <td className="live-ls-rhe-col live-ls-rhe">{linescore?.totals?.home?.r ?? 0}</td>
                  <td className="live-ls-rhe-col">{linescore?.totals?.home?.h ?? 0}</td>
                  <td className="live-ls-rhe-col">{linescore?.totals?.home?.e ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Team tabs */}
          <div className="live-bs-tabs">
            <button
              className={`live-bs-tab${activeTeam === 'mets' ? ' live-bs-tab--active' : ''}`}
              onClick={() => setActiveTeam('mets')}
            >
              Mets
            </button>
            <button
              className={`live-bs-tab${activeTeam === 'opp' ? ' live-bs-tab--active' : ''}`}
              onClick={() => setActiveTeam('opp')}
            >
              {oppName}
            </button>
          </div>

          {/* Batting */}
          {activeBatters.length > 0 && (
            <>
              <div className="live-bs-section-label">Batting</div>
              <div className="live-bs-table-wrap">
                <table className="live-bs-table">
                  <thead>
                    <tr>
                      <th className="live-bs-name-col">Batter</th>
                      <th>AB</th><th>R</th><th>H</th><th>RBI</th><th>HR</th><th>BB</th><th>HBP</th><th>SO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBatters.map((b, i) => (
                      <tr key={i}>
                        <td className="live-bs-name-col">{b.name}</td>
                        <td>{b.ab}</td><td>{b.r}</td><td>{b.h}</td>
                        <td>{b.rbi}</td><td>{b.hr}</td><td>{b.bb}</td><td>{b.hbp}</td><td>{b.so}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pitching */}
          {activePitchers.length > 0 && (
            <>
              <div className="live-bs-section-label">Pitching</div>
              <div className="live-bs-table-wrap">
                <table className="live-bs-table">
                  <thead>
                    <tr>
                      <th className="live-bs-name-col">Pitcher</th>
                      <th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>HBP</th><th>SO</th><th>PC</th><th>ERA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePitchers.map((p, i) => (
                      <tr key={i}>
                        <td className="live-bs-name-col">{p.name}</td>
                        <td>{p.ip}</td><td>{p.h}</td><td>{p.r}</td>
                        <td>{p.er}</td><td>{p.bb}</td><td>{p.hbp}</td><td>{p.so}</td><td>{p.pc}</td><td>{p.era}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Manager's Card */}
      {showManagerCard && (() => {
        const activeSide = activeTeam === 'mets' ? metsSide : oppSide
        const mgr = managers?.[activeSide]
        const bench = mgr?.bench || []
        const bullpen = mgr?.pitchers || []
        const hitSplits = managerSplits?.[activeSide]?.hitting || {}
        const pitSplits = managerSplits?.[activeSide]?.pitching || {}
        const rotation = new Set(managerSplits?.[activeSide]?.rotation || [])
        const season = managerSplits?.season
        const splitLabel = season ? `${season} Stats` : ''
        const fmt = v => v != null ? v : '—'
        const bullpenFiltered = bullpen.filter(p => !rotation.has(p.id))
        return (
          <div className="live-boxscore">
            {/* Team tabs */}
            <div className="live-bs-tabs">
              <button
                className={`live-bs-tab${activeTeam === 'mets' ? ' live-bs-tab--active' : ''}`}
                onClick={() => setActiveTeam('mets')}
              >
                Mets
              </button>
              <button
                className={`live-bs-tab${activeTeam === 'opp' ? ' live-bs-tab--active' : ''}`}
                onClick={() => setActiveTeam('opp')}
              >
                {oppName}
              </button>
            </div>

            {splitsLoading && <div className="live-mc-loading">Loading split stats…</div>}

            {/* Bench */}
            <div className="live-bs-section-label">
              Bench{splitLabel && <span className="live-mc-season"> ({splitLabel})</span>}
            </div>
            <div className="live-bs-table-wrap">
              <table className="live-bs-table live-mc-table">
                <thead>
                  <tr>
                    <th className="live-bs-name-col">Player</th>
                    <th className="live-mc-sm">POS</th>
                    <th className="live-mc-sm">B</th>
                    <th className="live-mc-split">vsLHP</th>
                    <th className="live-mc-split">vsRHP</th>
                  </tr>
                </thead>
                <tbody>
                  {bench.length === 0
                    ? <tr><td colSpan={5} className="live-mc-empty">—</td></tr>
                    : bench.map((p, i) => {
                      const s = hitSplits[p.id] || {}
                      return (
                        <tr key={i} className={p.used ? 'live-mc-used' : ''}>
                          <td className="live-bs-name-col">{p.name}</td>
                          <td className="live-mc-sm">{p.pos}</td>
                          <td className={`live-mc-sm${p.bats === 'L' ? ' live-mc-l' : p.bats === 'S' ? ' live-mc-s' : ''}`}>{p.bats}</td>
                          <td className="live-mc-split">{fmt(s.vl)}</td>
                          <td className="live-mc-split">{fmt(s.vr)}</td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>

            {/* Bullpen */}
            <div className="live-bs-section-label">
              Bullpen{splitLabel && <span className="live-mc-season"> ({splitLabel})</span>}
            </div>
            <div className="live-bs-table-wrap">
              <table className="live-bs-table live-mc-table">
                <thead>
                  <tr>
                    <th className="live-bs-name-col">Pitcher</th>
                    <th className="live-mc-sm">THR</th>
                    <th className="live-mc-split">vsLHH</th>
                    <th className="live-mc-split">vsRHH</th>
                  </tr>
                </thead>
                <tbody>
                  {bullpenFiltered.length === 0
                    ? <tr><td colSpan={4} className="live-mc-empty">—</td></tr>
                    : bullpenFiltered.map((p, i) => {
                      const s = pitSplits[p.id] || {}
                      return (
                        <tr key={i} className={p.used ? 'live-mc-used' : ''}>
                          <td className="live-bs-name-col">{p.name}</td>
                          <td className={`live-mc-sm${p.throws === 'L' ? ' live-mc-l' : ''}`}>{p.throws}</td>
                          <td className="live-mc-split">{fmt(s.vl)}</td>
                          <td className="live-mc-split">{fmt(s.vr)}</td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

import { useState, useEffect } from 'react'

const MLB_LOGO = 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png'

function Division({ division, highlightAbbr, showDivHeader }) {
  return (
    <>
      {showDivHeader && (
        <div className="standings-div-header">
          <span className="standings-div-name">{division.name}</span>
        </div>
      )}
      {division.teams.map(team => {
        const isMets = team.abbreviation === highlightAbbr
        const streakClass = team.streak?.startsWith('W') ? 'standings-streak--w' : 'standings-streak--l'
        return (
          <div key={team.abbreviation} className={`standings-row${isMets ? ' standings-row--mets' : ''}`}>
            {team.logo
              ? <img className="standings-logo" src={team.logo} alt={team.abbreviation} onError={e => { e.currentTarget.style.display = 'none' }} />
              : <span style={{ width: 20 }} />
            }
            <span className="standings-name">{team.name}</span>
            <span className="standings-w">{team.wins}</span>
            <span className="standings-l">{team.losses}</span>
            <span className="standings-pct">{team.pct}</span>
            <span className="standings-gb">{team.gamesBehind}</span>
            <span className="standings-gb standings-wcgb">{team.wildCardGB}</span>
            <span className="standings-l10">{team.lastTen}</span>
            <span className={`standings-strk${team.streak?.startsWith('W') ? ' standings-streak--w' : team.streak ? ' standings-streak--l' : ''}`}>{team.streak}</span>
          </div>
        )
      })}
    </>
  )
}

function LeaguePanel({ label, divisions, highlightAbbr, className }) {
  const showDivHeaders = divisions.length > 1
  return (
    <div className={`standings-panel${className ? ` ${className}` : ''}`}>
      <div className="standings-col-header">
        <span />
        <span className="standings-col-label standings-col-div-label">{label}</span>
        <span className="standings-col-label">W</span>
        <span className="standings-col-label">L</span>
        <span className="standings-col-label">PCT</span>
        <span className="standings-col-label">GB</span>
        <span className="standings-col-label">WCGB</span>
        <span className="standings-col-label">L10</span>
        <span className="standings-col-label">STRK</span>
      </div>
      <div className="standings-list">
        {divisions.map(div => (
          <Division key={div.name} division={div} highlightAbbr={highlightAbbr} showDivHeader={showDivHeaders} />
        ))}
      </div>
    </div>
  )
}

export default function StandingsCard({ hideHeader }) {
  const [standings, setStandings] = useState(null)
  const [league, setLeague] = useState('nl')
  const [showFull, setShowFull] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/standings')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (data?.nl) setStandings(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !standings) return null

  // Default: East divisions only. Full: all divisions.
  const nlDivisions = showFull ? standings.nl : [standings.nl[0]]
  const alDivisions = showFull ? standings.al : [standings.al[0]]

  return (
    <div className="standings-card">
      <div className="standings-header">
        {!hideHeader && (
          <img
            src={MLB_LOGO}
            alt="MLB"
            className="standings-header-logo"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <span className="standings-header-title">{hideHeader ? 'Standings' : 'MLB Standings'}</span>
        {/* Tabs shown on mobile only (hidden on desktop via CSS) */}
        <div className="standings-league-tabs">
          <button
            className={`standings-league-tab${league === 'nl' ? ' standings-league-tab--active' : ''}`}
            onClick={() => setLeague('nl')}
          >NL</button>
          <button
            className={`standings-league-tab${league === 'al' ? ' standings-league-tab--active' : ''}`}
            onClick={() => setLeague('al')}
          >AL</button>
        </div>
      </div>

      {/* Mobile: single panel based on selected tab */}
      <div className="standings-mobile">
        <LeaguePanel
          label={league === 'nl'
            ? (showFull ? 'National League' : 'NL East')
            : (showFull ? 'American League' : 'AL East')}
          divisions={league === 'nl' ? nlDivisions : alDivisions}
          highlightAbbr={league === 'nl' ? 'NYM' : ''}
        />
      </div>

      {/* Desktop: both leagues side by side */}
      <div className="standings-desktop">
        <LeaguePanel
          label={showFull ? 'National League' : 'NL East'}
          divisions={nlDivisions}
          highlightAbbr="NYM"
          className="standings-panel--nl"
        />
        <LeaguePanel
          label={showFull ? 'American League' : 'AL East'}
          divisions={alDivisions}
          highlightAbbr=""
          className="standings-panel--al"
        />
      </div>

      {/* Show full standings toggle */}
      <button className="standings-toggle" onClick={() => setShowFull(s => !s)}>
        {showFull ? 'Hide Full Standings' : 'Show Full Standings'}
        <svg viewBox="0 0 24 24" fill="none" className={`lg-toggle-chevron${showFull ? ' lg-toggle-chevron--open' : ''}`}>
          <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

import { useState, useEffect } from 'react'

const MLB_LOGO = 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png'

function Division({ division, highlightAbbr }) {
  return (
    <>
      <div className="standings-div-header">
        <span className="standings-div-name">{division.name}</span>
      </div>
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
          </div>
        )
      })}
    </>
  )
}

export default function StandingsCard() {
  const [standings, setStandings] = useState(null)
  const [league, setLeague] = useState('nl')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/standings')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (data?.nl) setStandings(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !standings) return null

  const divisions = league === 'nl' ? standings.nl : standings.al

  return (
    <div className="standings-card">
      <div className="standings-header">
        <img
          src={MLB_LOGO}
          alt="MLB"
          className="standings-header-logo"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span className="standings-header-title">MLB Standings</span>
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

      <div className="standings-col-header">
        <span />
        <span className="standings-col-label" style={{ textAlign: 'left' }}>Team</span>
        <span className="standings-col-label">W</span>
        <span className="standings-col-label">L</span>
        <span className="standings-col-label">PCT</span>
        <span className="standings-col-label">GB</span>
        <span className="standings-col-label">WCGB</span>
      </div>

      <div className="standings-list">
        {divisions.map(division => (
          <Division
            key={division.name}
            division={division}
            highlightAbbr={league === 'nl' ? 'NYM' : ''}
          />
        ))}
      </div>
    </div>
  )
}

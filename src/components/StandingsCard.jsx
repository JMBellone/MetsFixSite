import { useState, useEffect } from 'react'

export default function StandingsCard() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/standings')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (data?.nlEast) setTeams(data.nlEast) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading || error || teams.length === 0) return null

  return (
    <div className="standings-card">
      <div className="standings-header">
        <span className="standings-title">NL East Standings</span>
      </div>
      <div className="standings-col-header">
        <span className="standings-col-label" style={{ textAlign: 'left' }}>Team</span>
        <span />
        <span className="standings-col-label">W</span>
        <span className="standings-col-label">L</span>
        <span className="standings-col-label">PCT</span>
        <span className="standings-col-label">GB</span>
      </div>
      <div className="standings-list">
        {teams.map(team => {
          const isMets = team.abbreviation === 'NYM'
          const streakClass = team.streak?.startsWith('W')
            ? 'standings-streak--w'
            : 'standings-streak--l'
          return (
            <div
              key={team.abbreviation}
              className={`standings-row${isMets ? ' standings-row--mets' : ''}`}
            >
              {team.logo
                ? <img className="standings-logo" src={team.logo} alt={team.abbreviation} />
                : <span style={{ width: 20 }} />
              }
              <span className="standings-name">{team.name}</span>
              <span className="standings-w">{team.wins}</span>
              <span className="standings-l">{team.losses}</span>
              <span className="standings-pct">{team.pct}</span>
              <span className={`standings-streak ${streakClass}`}>{team.streak || team.gamesBehind}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

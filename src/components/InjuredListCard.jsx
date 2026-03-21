import { useState, useEffect } from 'react'

const MLB_LOGO = 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png'

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function InjuredListCard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/injuries')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setPlayers(data.players || []); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="option-dates-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  if (error || !players.length) return null

  return (
    <div className="option-dates-card">
      <table className="option-dates-table">
        <thead>
          <tr>
            <th className="option-dates-title-row" colSpan={4}>
              <img
                src={MLB_LOGO}
                alt="MLB"
                className="option-dates-logo"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
              Injured List
            </th>
          </tr>
          <tr>
            <th className="option-dates-th">Player</th>
            <th className="option-dates-th option-dates-th--center">IL</th>
            <th className="option-dates-th">Injury</th>
            <th className="option-dates-th option-dates-th--center">Since</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={`${p.name}-${p.datePlaced}`} className="option-dates-row">
              <td className="option-dates-td option-dates-name">{p.name}</td>
              <td className="option-dates-td option-dates-pos">{p.ilType}</td>
              <td className="option-dates-td option-dates-injury">{p.injury}</td>
              <td className="option-dates-td option-dates-date">{fmtDate(p.datePlaced)}</td>
            </tr>
          ))}
          <tr className="option-dates-row">
            <td className="option-dates-td" colSpan={4}>
              <a
                href="https://www.mlb.com/mets/news/mets-injuries-and-roster-moves"
                target="_blank"
                rel="noopener noreferrer"
                className="il-detail-link"
              >
                👉 Detailed Mets Injury and Transaction News
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

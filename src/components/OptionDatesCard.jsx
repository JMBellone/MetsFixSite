import { useState, useEffect } from 'react'

const MILB_LOGO = 'https://www.milb.com/assets/images/milb-logo.png'

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isEligible(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const eligible = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return eligible <= today
}

export default function OptionDatesCard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/transactions')
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
                src={MILB_LOGO}
                alt="MiLB"
                className="option-dates-logo"
                onError={e => { e.currentTarget.src = 'https://www.google.com/s2/favicons?domain=milb.com&sz=64' }}
              />
              Option Dates
            </th>
          </tr>
          <tr>
            <th className="option-dates-th">Player</th>
            <th className="option-dates-th option-dates-th--center">Pos</th>
            <th className="option-dates-th option-dates-th--center">Optioned</th>
            <th className="option-dates-th option-dates-th--center">Eligible</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => {
            const eligible = isEligible(p.eligibleDate)
            return (
              <tr
                key={`${p.name}-${p.dateOptioned}`}
                className={`option-dates-row${eligible ? ' option-dates-row--eligible' : ''}`}
              >
                <td className="option-dates-td option-dates-name">{p.name}</td>
                <td className="option-dates-td option-dates-pos">{p.position}</td>
                <td className="option-dates-td option-dates-date">{fmtDate(p.dateOptioned)}</td>
                <td className={`option-dates-td option-dates-date${eligible ? ' option-dates-date--eligible' : ''}`}>
                  {fmtDate(p.eligibleDate)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="option-dates-note">
        * 15 days for pitchers · 10 days for position players
      </p>
    </div>
  )
}

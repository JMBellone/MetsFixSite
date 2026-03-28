import { useState, useEffect } from 'react'
import './LineupsCard.css'

// Always render two lines so every row is the same height
function VsCell({ vs }) {
  return (
    <span className="lc-vs">
      <span className="lc-vs-ops">{vs && vs.ab > 0 ? vs.ops : '—'}</span>
      <span className="lc-vs-ab">{vs && vs.ab > 0 ? `${vs.ab} AB` : '\u00A0'}</span>
    </span>
  )
}

function TeamColumn({ team, vsStarter }) {
  return (
    <div className="lc-team">
      <div className="lc-team-hdr">
        <img src={team.logo} alt={team.abbr} className="lc-team-logo"
          onError={e => { e.currentTarget.style.display = 'none' }} />
        <div className="lc-team-info">
          <span className="lc-team-name">{team.name}</span>
          {vsStarter && (
            <span className="lc-vs-label">vs {vsStarter.name}</span>
          )}
        </div>
      </div>

      <div className="lc-scroll">
        <table className="lc-table">
          <thead>
            <tr>
              <th className="lc-th lc-th-order">#</th>
              <th className="lc-th lc-th-name">BATTER</th>
              <th className="lc-th lc-th-bats">B</th>
              <th className="lc-th lc-th-pos">POS</th>
              <th className="lc-th lc-th-vs">OPS vs SP</th>
            </tr>
          </thead>
          <tbody>
            {team.lineup.map(p => (
              <tr key={p.id}>
                <td className="lc-td lc-td-order">{p.batOrder}</td>
                <td className="lc-td lc-td-name">{p.name}</td>
                <td className={`lc-td lc-td-bats${p.bats === 'L' ? ' lc-bats-l' : p.bats === 'S' ? ' lc-bats-s' : ''}`}>{p.bats}</td>
                <td className="lc-td lc-td-pos">{p.pos}</td>
                <td className="lc-td lc-td-vs"><VsCell vs={p.vs} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function LineupsCard({ onPosted }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTeam, setActiveTeam] = useState('mets')

  useEffect(() => {
    fetch('/api/lineups')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false); if (d.posted) onPosted?.(true) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !data || !data.posted) return null

  const metsTeam = data.metsHome ? data.home : data.away
  const oppTeam  = data.metsHome ? data.away : data.home

  return (
    <div className="lc-card">
      <div className="lc-card-header">
        <span className="lc-card-title">📝 Today's Lineups</span>
      </div>

      <div className="lc-mobile-tabs">
        <button
          className={`lc-mobile-tab${activeTeam === 'mets' ? ' lc-mobile-tab--active' : ''}`}
          onClick={() => setActiveTeam('mets')}
        >
          <img src={metsTeam.logo} alt="" className="lc-tab-logo"
            onError={e => { e.currentTarget.style.display = 'none' }} />
          {metsTeam.shortName}
        </button>
        <button
          className={`lc-mobile-tab${activeTeam === 'opp' ? ' lc-mobile-tab--active' : ''}`}
          onClick={() => setActiveTeam('opp')}
        >
          <img src={oppTeam.logo} alt="" className="lc-tab-logo"
            onError={e => { e.currentTarget.style.display = 'none' }} />
          {oppTeam.shortName}
        </button>
      </div>

      <div className={activeTeam !== 'mets' ? 'lc-team-hidden-mobile' : ''}>
        <TeamColumn team={metsTeam} vsStarter={oppTeam.starter} />
      </div>
      <div className="lc-divider lc-divider--desktop" />
      <div className={activeTeam !== 'opp' ? 'lc-team-hidden-mobile' : ''}>
        <TeamColumn team={oppTeam} vsStarter={metsTeam.starter} />
      </div>
    </div>
  )
}

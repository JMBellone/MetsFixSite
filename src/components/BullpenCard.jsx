import { useEffect, useState } from 'react'
import './BullpenCard.css'

const TEAM_LOGOS = {
  NYM: 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png',
  PIT: 'https://a.espncdn.com/i/teamlogos/mlb/500/pit.png',
}

const OPP_COLORS = {
  NYM: '#002D72', NYY: '#003087', BOS: '#BD3039', TOR: '#134A8E',
  BAL: '#DF4601', TB: '#092C5C', CLE: '#E31937', CWS: '#27251F',
  DET: '#0C2340', KC: '#004687', MIN: '#002B5C', HOU: '#002D62',
  LAA: '#BA0021', OAK: '#003831', SEA: '#0C2C56', TEX: '#003278',
  PIT: '#27251F', PHI: '#E81828', ATL: '#CE1141', MIA: '#00A3E0',
  WSH: '#AB0003', CHC: '#0E3386', CIN: '#C6011F', MIL: '#12284B',
  STL: '#C41E3A', ARI: '#A71930', COL: '#333366', LAD: '#005A9C',
  SD: '#2F241D', SF: '#FD5A1E',
}

function headshotUrl(id) {
  if (!id) return null
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_180,q_auto:best/v1/people/${id}/headshot/67/current`
}

function pcClass(n) {
  if (n >= 35) return 'bc-pc-high'
  if (n >= 20) return 'bc-pc-mid'
  return 'bc-pc-low'
}

function TeamSection({ data, abbr }) {
  if (!data) return null
  const { starters, bullpen, upcomingDates, recentDates, todayStarter } = data
  const hs = todayStarter?.id ? headshotUrl(todayStarter.id) : null

  return (
    <div className="bc-team">
      <div className="bc-logo-row">
        <img src={TEAM_LOGOS[abbr]} alt={abbr} className="bc-logo" />
        {todayStarter && (
          <div className="bc-today">
            {hs && (
              <img
                src={hs}
                alt={todayStarter.name}
                className="bc-today-headshot"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <div className="bc-today-text">
              <span className="bc-today-label">Today's Starter</span>
              <span className="bc-today-name">{todayStarter.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Starters */}
      <div className="bc-scroll">
        <table className="bc-table">
          <thead>
            <tr>
              <th className="bc-th bc-th-name bc-th-section">STARTERS</th>
              <th className="bc-th bc-th-arm">Throws</th>
              {upcomingDates.map(d => (
                <th key={d.dateStr} className="bc-th bc-th-day">{d.dayAbbr}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {starters.map((p, i) => (
              <tr key={p.id ?? i}>
                <td className="bc-td bc-td-name">{p.name}</td>
                <td className={`bc-td bc-td-arm${p.throws === 'LHP' ? ' bc-lhp' : ''}`}>{p.throws}</td>
                {upcomingDates.map(d => {
                  const start = p.schedule?.find(s => s.dateStr === d.dateStr)
                  return (
                    <td key={d.dateStr} className="bc-td bc-td-day bc-cell-empty">
                      {start && (
                        <span className="bc-opp-chip" style={{ background: OPP_COLORS[start.opp] || '#444' }}>
                          {start.opp}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bullpen */}
      <div className="bc-scroll bc-bullpen-scroll">
        <table className="bc-table">
          <thead>
            <tr>
              <th className="bc-th bc-th-name bc-th-section">BULLPEN</th>
              <th className="bc-th bc-th-arm">Throws</th>
              {recentDates.map(d => (
                <th key={d.dateStr} className="bc-th bc-th-day bc-th-ago" title={d.dateStr}>
                  {d.dayAbbr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bullpen.map((p, i) => (
              <tr key={p.id ?? i}>
                <td className="bc-td bc-td-name">{p.name}</td>
                <td className={`bc-td bc-td-arm${p.throws === 'LHP' ? ' bc-lhp' : ''}`}>{p.throws}</td>
                {recentDates.map(d => {
                  const pc = p.usage?.[d.dateStr]
                  return (
                    <td key={d.dateStr} className={`bc-td bc-td-day ${pc ? pcClass(pc) : 'bc-cell-empty'}`}>
                      {pc || ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BullpenCard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bullpen')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bc-card">
        <div className="bc-team">
          <div className="skeleton" style={{ height: 44, marginBottom: 10, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 180, borderRadius: 6, marginTop: 12 }} />
        </div>
        <div className="bc-divider" />
        <div className="bc-team">
          <div className="skeleton" style={{ height: 44, marginBottom: 10, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 180, borderRadius: 6, marginTop: 12 }} />
        </div>
      </div>
    )
  }

  if (!data || data.error) return null

  return (
    <div className="bc-card">
      <TeamSection data={data.mets}    abbr="NYM" />
      <div className="bc-divider" />
      <TeamSection data={data.pirates} abbr="PIT" />
    </div>
  )
}

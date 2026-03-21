import { useState, useEffect } from 'react'

const TABS = ['Hitters', 'Starters', 'Relievers']

const HITTER_COLS = [
  { key: 'name', label: 'Name', left: true },
  { key: 'g',   label: 'G' },
  { key: 'ab',  label: 'AB' },
  { key: 'avg', label: 'AVG' },
  { key: 'obp', label: 'OBP' },
  { key: 'slg', label: 'SLG' },
  { key: 'ops', label: 'OPS' },
  { key: 'hr',  label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'sb',  label: 'SB' },
]

const STARTER_COLS = [
  { key: 'name', label: 'Name', left: true },
  { key: 'gs',   label: 'GS' },
  { key: 'ip',   label: 'IP' },
  { key: 'era',  label: 'ERA' },
  { key: 'whip', label: 'WHIP' },
  { key: 'w',    label: 'W' },
  { key: 'l',    label: 'L' },
  { key: 'k',    label: 'K' },
  { key: 'bb',   label: 'BB' },
]

const RELIEVER_COLS = [
  { key: 'name', label: 'Name', left: true },
  { key: 'g',    label: 'G' },
  { key: 'ip',   label: 'IP' },
  { key: 'era',  label: 'ERA' },
  { key: 'whip', label: 'WHIP' },
  { key: 'k',    label: 'K' },
  { key: 'bb',   label: 'BB' },
  { key: 'sv',   label: 'SV' },
  { key: 'hld',  label: 'HLD' },
]

function lastName(fullName) {
  if (!fullName) return ''
  const parts = fullName.trim().split(' ')
  return parts.length > 1 ? parts.slice(1).join(' ') : fullName
}

const PREVIEW = 8

export default function MetsStatsCard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Hitters')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch('/api/metsstats')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="stats-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  if (!data) return null

  const allRows = tab === 'Hitters' ? data.hitters : tab === 'Starters' ? data.starters : data.relievers
  const cols = tab === 'Hitters' ? HITTER_COLS : tab === 'Starters' ? STARTER_COLS : RELIEVER_COLS
  const rows = showAll ? allRows : allRows.slice(0, PREVIEW)

  return (
    <div className="stats-card">
      <div className="stats-header">
        <img
          src="https://www.google.com/s2/favicons?domain=mlb.com&sz=32"
          alt=""
          className="stats-header-icon"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span className="stats-title">Mets Stats</span>
        {data.isSpring && <span className="stats-badge">Spring Training</span>}
      </div>

      <div className="stats-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`stats-tab${tab === t ? ' stats-tab--active' : ''}`}
            onClick={() => { setTab(t); setShowAll(false) }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="stats-table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c.key} className={`stats-th${c.left ? ' stats-th--left' : ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`stats-row${i % 2 === 1 ? ' stats-row--alt' : ''}`}>
                {cols.map(c => (
                  <td key={c.key} className={`stats-td${c.left ? ' stats-td--left' : ''}`}>
                    {c.key === 'name' ? lastName(row.name) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allRows.length > PREVIEW && (
        <button className="stats-show-more" onClick={() => setShowAll(v => !v)}>
          {showAll ? 'Show Less' : `Show All ${allRows.length}`}
        </button>
      )}
    </div>
  )
}

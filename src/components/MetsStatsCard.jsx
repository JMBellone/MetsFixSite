import { useState, useEffect, useMemo } from 'react'

const TABS = ['Hitters', 'Starters', 'Relievers']

const HITTER_COLS = [
  { key: 'name', label: 'Name', left: true,  defaultDir: 'asc' },
  { key: 'g',   label: 'G',                  defaultDir: 'desc' },
  { key: 'ab',  label: 'AB',                 defaultDir: 'desc' },
  { key: 'avg', label: 'AVG',                defaultDir: 'desc' },
  { key: 'obp', label: 'OBP',                defaultDir: 'desc' },
  { key: 'slg', label: 'SLG',                defaultDir: 'desc' },
  { key: 'ops', label: 'OPS',                defaultDir: 'desc' },
  { key: 'hr',  label: 'HR',                 defaultDir: 'desc' },
  { key: 'rbi', label: 'RBI',                defaultDir: 'desc' },
  { key: 'sb',  label: 'SB',                 defaultDir: 'desc' },
]

const STARTER_COLS = [
  { key: 'name', label: 'Name', left: true,  defaultDir: 'asc' },
  { key: 'gs',   label: 'GS',                defaultDir: 'desc' },
  { key: 'ip',   label: 'IP',                defaultDir: 'desc' },
  { key: 'era',  label: 'ERA',               defaultDir: 'asc' },
  { key: 'whip', label: 'WHIP',              defaultDir: 'asc' },
  { key: 'w',    label: 'W',                 defaultDir: 'desc' },
  { key: 'l',    label: 'L',                 defaultDir: 'desc' },
  { key: 'k',    label: 'K',                 defaultDir: 'desc' },
  { key: 'bb',   label: 'BB',                defaultDir: 'desc' },
]

const RELIEVER_COLS = [
  { key: 'name', label: 'Name', left: true,  defaultDir: 'asc' },
  { key: 'g',    label: 'G',                 defaultDir: 'desc' },
  { key: 'ip',   label: 'IP',                defaultDir: 'desc' },
  { key: 'era',  label: 'ERA',               defaultDir: 'asc' },
  { key: 'whip', label: 'WHIP',              defaultDir: 'asc' },
  { key: 'k',    label: 'K',                 defaultDir: 'desc' },
  { key: 'bb',   label: 'BB',                defaultDir: 'desc' },
  { key: 'sv',   label: 'SV',                defaultDir: 'desc' },
  { key: 'hld',  label: 'HLD',               defaultDir: 'desc' },
]

// Default sort column per tab
const DEFAULT_SORT = { Hitters: 'ab', Starters: 'ip', Relievers: 'ip' }

function lastName(fullName) {
  if (!fullName) return ''
  const parts = fullName.trim().split(' ')
  return parts.length > 1 ? parts.slice(1).join(' ') : fullName
}

function toNum(val) {
  if (val == null || val === '—' || val === '' || val === '-') return null
  const n = parseFloat(String(val).replace(/^\./, '0.'))
  return isNaN(n) ? null : n
}

function sortRows(rows, col, dir) {
  return [...rows].sort((a, b) => {
    const av = a[col]
    const bv = b[col]

    // Name: alphabetical by last name
    if (col === 'name') {
      const al = lastName(av).toLowerCase()
      const bl = lastName(bv).toLowerCase()
      return dir === 'asc' ? al.localeCompare(bl) : bl.localeCompare(al)
    }

    // Numeric / rate stats
    const an = toNum(av)
    const bn = toNum(bv)

    // Null values always sort to the bottom
    if (an === null && bn === null) return 0
    if (an === null) return 1
    if (bn === null) return -1

    return dir === 'asc' ? an - bn : bn - an
  })
}

const PREVIEW = 8

export default function MetsStatsCard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Hitters')
  const [showAll, setShowAll] = useState(false)
  const [sortCol, setSortCol] = useState(DEFAULT_SORT['Hitters'])
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    fetch('/api/metsstats')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function switchTab(t) {
    setTab(t)
    setShowAll(false)
    setSortCol(DEFAULT_SORT[t])
    setSortDir('desc')
  }

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      const colDef = cols.find(c => c.key === col)
      setSortCol(col)
      setSortDir(colDef?.defaultDir ?? 'desc')
    }
  }

  if (loading) return (
    <div className="stats-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  if (!data) return null

  const baseRows = tab === 'Hitters' ? data.hitters : tab === 'Starters' ? data.starters : data.relievers
  const cols = tab === 'Hitters' ? HITTER_COLS : tab === 'Starters' ? STARTER_COLS : RELIEVER_COLS
  const allRows = sortRows(baseRows, sortCol, sortDir)
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
            onClick={() => switchTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="stats-table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              {cols.map(c => {
                const active = sortCol === c.key
                return (
                  <th
                    key={c.key}
                    className={`stats-th stats-th--sortable${c.left ? ' stats-th--left' : ''}${active ? ' stats-th--active' : ''}`}
                    onClick={() => handleSort(c.key)}
                  >
                    {c.label}
                    <span className="stats-sort-icon">
                      {active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ' ⬍'}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`stats-row${i % 2 === 1 ? ' stats-row--alt' : ''}`}>
                {cols.map(c => (
                  <td key={c.key} className={`stats-td${c.left ? ' stats-td--left' : ''}${sortCol === c.key ? ' stats-td--active' : ''}`}>
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

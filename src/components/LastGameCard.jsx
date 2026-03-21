import { useState, useEffect } from 'react'

function logoUrl(abbr) {
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${abbr.toLowerCase()}.png`
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function shortName(full) {
  return full.replace(/^([A-Z][a-z]*)(?:\s[A-Z]\.?)?\s+/, m => {
    const parts = m.trim().split(/\s+/)
    return parts[0][0] + '. '
  })
}

function StatCell({ val }) {
  return <td className="lg-td lg-stat">{val ?? '-'}</td>
}

function BattingTable({ team, batters, totals }) {
  return (
    <div className="lg-batting">
      <table className="lg-table">
        <thead>
          <tr>
            <th className="lg-th lg-th-name">{team} Batting</th>
            <th className="lg-th lg-stat">AB</th>
            <th className="lg-th lg-stat">R</th>
            <th className="lg-th lg-stat">H</th>
            <th className="lg-th lg-stat">RBI</th>
            <th className="lg-th lg-stat">BB</th>
            <th className="lg-th lg-stat">K</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((b, i) => (
            <tr key={i} className={`lg-row${b.battingOrder % 100 !== 0 ? ' lg-row--sub' : ''}`}>
              <td className="lg-td lg-name">
                <span className="lg-player-name">{shortName(b.name)}</span>
                <span className="lg-player-pos">{b.pos}</span>
              </td>
              <StatCell val={b.ab} />
              <StatCell val={b.r} />
              <StatCell val={b.h} />
              <StatCell val={b.rbi} />
              <StatCell val={b.bb} />
              <StatCell val={b.k} />
            </tr>
          ))}
          {totals && (
            <tr className="lg-row lg-row--totals">
              <td className="lg-td lg-name lg-totals-label">Totals</td>
              <StatCell val={totals.ab} />
              <StatCell val={totals.r} />
              <StatCell val={totals.h} />
              <StatCell val={totals.rbi} />
              <StatCell val={totals.bb} />
              <StatCell val={totals.k} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function PitchingTable({ team, pitchers }) {
  if (!pitchers.length) return null
  return (
    <div className="lg-pitching">
      <table className="lg-table">
        <thead>
          <tr>
            <th className="lg-th lg-th-name">{team} Pitching</th>
            <th className="lg-th lg-stat">IP</th>
            <th className="lg-th lg-stat">H</th>
            <th className="lg-th lg-stat">R</th>
            <th className="lg-th lg-stat">ER</th>
            <th className="lg-th lg-stat">BB</th>
            <th className="lg-th lg-stat">K</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((p, i) => (
            <tr key={i} className="lg-row">
              <td className="lg-td lg-name">
                <span className="lg-player-name">{shortName(p.name)}</span>
                {p.note && <span className="lg-pitcher-note">{p.note}</span>}
              </td>
              <td className="lg-td lg-stat">{p.ip}</td>
              <StatCell val={p.h} />
              <StatCell val={p.r} />
              <StatCell val={p.er} />
              <StatCell val={p.bb} />
              <StatCell val={p.k} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LastGameCard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [metsTab, setMetsTab] = useState(true) // mobile: true=Mets, false=opponent

  useEffect(() => {
    fetch('/api/lastgame')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="lg-card">
      <div className="option-dates-skeleton" />
    </div>
  )
  if (!data?.game) return null

  const { game, linescore, boxscore } = data
  const metsWon = game.metsIsHome
    ? game.home.score > game.away.score
    : game.away.score > game.home.score

  const metsBox = game.metsIsHome ? boxscore.home : boxscore.away
  const oppBox  = game.metsIsHome ? boxscore.away : boxscore.home
  const metsName = game.metsIsHome ? game.home.name : game.away.name
  const oppName  = game.metsIsHome ? game.away.name : game.home.name
  const metsAbbr = game.metsIsHome ? game.home.abbr : game.away.abbr
  const oppAbbr  = game.metsIsHome ? game.away.abbr : game.home.abbr

  // For linescore: away row then home row
  const awayRow = linescore.innings.map(i => i.away)
  const homeRow = linescore.innings.map(i => i.home)

  const gameLabel = game.gameType === 'S' ? 'Spring Training' : 'Final'

  return (
    <div className="lg-card">
      {/* Header */}
      <div className="lg-header">
        <svg className="lg-header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" fill="none"/>
          <path d="M7.5 12c0-1.5.8-2.8 2-3.6M16.5 12c0 1.5-.8 2.8-2 3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M12 4.5c1 .6 1.8 2 2 4M12 19.5c-1-.6-1.8-2-2-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span className="lg-header-label">Last Game</span>
      </div>

      {/* Score */}
      <div className="lg-score-section">
        {/* Away */}
        <div className={`lg-score-team${!game.metsIsHome && metsWon ? ' lg-score-team--winner' : (!game.metsIsHome ? '' : '')}`}>
          <img
            src={logoUrl(game.away.abbr)}
            alt={game.away.abbr}
            className="lg-team-logo"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <span className="lg-team-abbr">{game.away.abbr}</span>
          <span className={`lg-score-num${game.away.score > game.home.score ? ' lg-score-num--winner' : ''}`}>
            {game.away.score}
          </span>
        </div>

        {/* Center */}
        <div className="lg-score-center">
          <span className="lg-status">{gameLabel}</span>
          <span className="lg-score-date">{fmtDate(game.date)}</span>
          {game.venue && <span className="lg-venue">{game.venue}</span>}
        </div>

        {/* Home */}
        <div className={`lg-score-team${game.metsIsHome && metsWon ? ' lg-score-team--winner' : ''}`}>
          <span className={`lg-score-num${game.home.score > game.away.score ? ' lg-score-num--winner' : ''}`}>
            {game.home.score}
          </span>
          <span className="lg-team-abbr">{game.home.abbr}</span>
          <img
            src={logoUrl(game.home.abbr)}
            alt={game.home.abbr}
            className="lg-team-logo"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      </div>

      {/* Linescore */}
      <div className="lg-linescore-wrap">
        <table className="lg-linescore">
          <thead>
            <tr>
              <th className="lg-ls-th lg-ls-team" />
              {linescore.innings.map(inn => (
                <th key={inn.num} className="lg-ls-th">{inn.num}</th>
              ))}
              <th className="lg-ls-th lg-ls-sep" />
              <th className="lg-ls-th">R</th>
              <th className="lg-ls-th">H</th>
              <th className="lg-ls-th">E</th>
            </tr>
          </thead>
          <tbody>
            <tr className="lg-ls-row">
              <td className="lg-ls-td lg-ls-team">{game.away.abbr}</td>
              {awayRow.map((runs, i) => (
                <td key={i} className="lg-ls-td">{runs ?? '-'}</td>
              ))}
              <td className="lg-ls-td lg-ls-sep" />
              <td className="lg-ls-td lg-ls-total">{linescore.away.runs}</td>
              <td className="lg-ls-td lg-ls-total">{linescore.away.hits}</td>
              <td className="lg-ls-td">{linescore.away.errors}</td>
            </tr>
            <tr className="lg-ls-row">
              <td className={`lg-ls-td lg-ls-team${game.metsIsHome ? ' lg-ls-mets' : ''}`}>{game.home.abbr}</td>
              {homeRow.map((runs, i) => (
                <td key={i} className="lg-ls-td">{runs ?? 'x'}</td>
              ))}
              <td className="lg-ls-td lg-ls-sep" />
              <td className="lg-ls-td lg-ls-total">{linescore.home.runs}</td>
              <td className="lg-ls-td lg-ls-total">{linescore.home.hits}</td>
              <td className="lg-ls-td">{linescore.home.errors}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Box score — mobile tabs */}
      <div className="lg-boxscore-tabs">
        <button
          className={`lg-tab${metsTab ? ' lg-tab--active' : ''}`}
          onClick={() => setMetsTab(true)}
        >
          {metsAbbr}
        </button>
        <button
          className={`lg-tab${!metsTab ? ' lg-tab--active' : ''}`}
          onClick={() => setMetsTab(false)}
        >
          {oppAbbr}
        </button>
      </div>

      {/* Box score tables — mobile: one at a time, desktop: side by side */}
      <div className="lg-boxscore-wrap">
        <div className={`lg-boxscore-panel${!metsTab ? ' lg-boxscore-panel--hidden' : ''}`}>
          <BattingTable team={metsAbbr} batters={metsBox.batters} totals={metsBox.totals} />
          <PitchingTable team={metsAbbr} pitchers={metsBox.pitchers} />
        </div>
        <div className={`lg-boxscore-panel${metsTab ? ' lg-boxscore-panel--hidden' : ''}`}>
          <BattingTable team={oppAbbr} batters={oppBox.batters} totals={oppBox.totals} />
          <PitchingTable team={oppAbbr} pitchers={oppBox.pitchers} />
        </div>
      </div>
    </div>
  )
}

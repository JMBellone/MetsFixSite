// api/scores.js — MLB Scores: live / final / upcoming

const NL_EAST_IDS = new Set([121, 143, 144, 146, 120]) // NYM, PHI, ATL, MIA, WSH

const TEAM_INFO = {
  108: { abbr: 'LAA', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/laa.png' },
  109: { abbr: 'ARI', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/ari.png' },
  110: { abbr: 'BAL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bal.png' },
  111: { abbr: 'BOS', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png' },
  112: { abbr: 'CHC', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chc.png' },
  113: { abbr: 'CIN', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cin.png' },
  114: { abbr: 'CLE', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cle.png' },
  115: { abbr: 'COL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/col.png' },
  116: { abbr: 'DET', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/det.png' },
  117: { abbr: 'HOU', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png' },
  118: { abbr: 'KC',  logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/kc.png' },
  119: { abbr: 'LAD', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png' },
  120: { abbr: 'WSH', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png' },
  121: { abbr: 'NYM', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png' },
  133: { abbr: 'OAK', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/oak.png' },
  134: { abbr: 'PIT', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/pit.png' },
  135: { abbr: 'SD',  logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png' },
  136: { abbr: 'SEA', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png' },
  137: { abbr: 'SF',  logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sf.png' },
  138: { abbr: 'STL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/stl.png' },
  139: { abbr: 'TB',  logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png' },
  140: { abbr: 'TEX', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tex.png' },
  141: { abbr: 'TOR', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tor.png' },
  142: { abbr: 'MIN', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/min.png' },
  143: { abbr: 'PHI', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png' },
  144: { abbr: 'ATL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png' },
  145: { abbr: 'CWS', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chw.png' },
  146: { abbr: 'MIA', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mia.png' },
  147: { abbr: 'NYY', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png' },
  158: { abbr: 'MIL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mil.png' },
}

function todayET() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

function hourET() {
  return parseInt(
    new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }),
    10
  )
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
  })
}

async function fetchGames(dateStr) {
  const r = await fetch(
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}&hydrate=team,linescore`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!r.ok) return []
  const data = await r.json()

  const games = []
  for (const dateEntry of (data.dates || [])) {
    for (const g of (dateEntry.games || [])) {
      const homeId = g.teams?.home?.team?.id
      const awayId = g.teams?.away?.team?.id
      const homeMeta = TEAM_INFO[homeId] || { abbr: '?', logo: '' }
      const awayMeta = TEAM_INFO[awayId] || { abbr: '?', logo: '' }

      const abstract = g.status?.abstractGameState
      const detailed = g.status?.detailedState || ''

      let status = 'preview'
      if (abstract === 'Final') status = 'final'
      else if (abstract === 'Live') status = 'live'
      else if (detailed.toLowerCase().includes('postponed')) status = 'postponed'
      else if (detailed.toLowerCase().includes('suspend')) status = 'suspended'

      const inning = g.linescore?.currentInning ?? null
      const inningHalf = g.linescore?.inningHalf ?? null

      const homeScore = g.teams?.home?.score ?? null
      const awayScore = g.teams?.away?.score ?? null
      const homeWin = status === 'final' && homeScore !== null && homeScore > awayScore
      const awayWin = status === 'final' && awayScore !== null && awayScore > homeScore

      games.push({
        gamePk: g.gamePk,
        status,
        inning,
        inningHalf,
        startTime: status === 'preview' ? formatTime(g.gameDate) : null,
        away: { id: awayId, abbr: awayMeta.abbr, logo: awayMeta.logo, score: awayScore, win: awayWin },
        home: { id: homeId, abbr: homeMeta.abbr, logo: homeMeta.logo, score: homeScore, win: homeWin },
        isNLEast: NL_EAST_IDS.has(homeId) || NL_EAST_IDS.has(awayId),
      })
    }
  }

  // Sort: live → final → preview/other
  const priority = { live: 0, final: 1, preview: 2, postponed: 3, suspended: 3 }
  return games.sort((a, b) => (priority[a.status] ?? 2) - (priority[b.status] ?? 2))
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  const todayStr = todayET()
  const hour = hourET()

  let games = await fetchGames(todayStr)
  const anyActiveToday = games.some(g => g.status === 'live' || g.status === 'final')

  let displayLabel = 'Today'
  if (hour < 12 && !anyActiveToday) {
    games = await fetchGames(addDays(todayStr, -1))
    displayLabel = 'Yesterday'
  }

  const isLive = games.some(g => g.status === 'live')
  const allFinal = games.length > 0 && games.every(g => g.status === 'final' || g.status === 'postponed' || g.status === 'suspended')
  const cacheSeconds = isLive ? 30 : allFinal ? 3600 : 300
  res.setHeader('Cache-Control', `s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`)

  return res.status(200).json({ displayLabel, games })
}

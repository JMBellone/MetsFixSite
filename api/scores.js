// api/scores.js — MLB Scores: live / final / upcoming

const NL_EAST_IDS = new Set([121, 143, 144, 146, 120]) // NYM, PHI, ATL, MIA, WSH

const TEAM_INFO = {
  108: { name: 'Angels',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/laa.png' },
  109: { name: 'D-backs',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/ari.png' },
  110: { name: 'Orioles',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bal.png' },
  111: { name: 'Red Sox',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png' },
  112: { name: 'Cubs',      logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chc.png' },
  113: { name: 'Reds',      logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cin.png' },
  114: { name: 'Guardians', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cle.png' },
  115: { name: 'Rockies',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/col.png' },
  116: { name: 'Tigers',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/det.png' },
  117: { name: 'Astros',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png' },
  118: { name: 'Royals',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/kc.png' },
  119: { name: 'Dodgers',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png' },
  120: { name: 'Nationals', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png' },
  121: { name: 'Mets',      logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png' },
  133: { name: 'Athletics', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/oak.png' },
  134: { name: 'Pirates',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/pit.png' },
  135: { name: 'Padres',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png' },
  136: { name: 'Mariners',  logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png' },
  137: { name: 'Giants',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sf.png' },
  138: { name: 'Cardinals', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/stl.png' },
  139: { name: 'Rays',      logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png' },
  140: { name: 'Rangers',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tex.png' },
  141: { name: 'Blue Jays', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tor.png' },
  142: { name: 'Twins',     logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/min.png' },
  143: { name: 'Phillies',  logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png' },
  144: { name: 'Braves',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png' },
  145: { name: 'White Sox', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chw.png' },
  146: { name: 'Marlins',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mia.png' },
  147: { name: 'Yankees',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png' },
  158: { name: 'Brewers',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mil.png' },
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
      const homeMeta = TEAM_INFO[homeId] || { name: '?', logo: '' }
      const awayMeta = TEAM_INFO[awayId] || { name: '?', logo: '' }

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
        away: { id: awayId, name: awayMeta.name, logo: awayMeta.logo, score: awayScore, win: awayWin },
        home: { id: homeId, name: homeMeta.name, logo: homeMeta.logo, score: homeScore, win: homeWin },
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

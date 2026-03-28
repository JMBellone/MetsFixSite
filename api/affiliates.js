// api/affiliates.js — Mets minor-league affiliate scores / upcoming games

const AFFILIATES = [
  { id: 552, sportId: 11, name: 'Syracuse',   abbr: 'SYR' },
  { id: 505, sportId: 12, name: 'Binghamton', abbr: 'BNG' },
  { id: 453, sportId: 13, name: 'Brooklyn',   abbr: 'BKN' },
  { id: 507, sportId: 14, name: 'St. Lucie',  abbr: 'SLM' },
]

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

function shortName(fullName) {
  const words = fullName.trim().split(' ')
  return words[words.length - 1]
}

async function fetchAffiliateGames(dateStr) {
  const results = await Promise.all(
    AFFILIATES.map(async (affiliate) => {
      try {
        const r = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?teamId=${affiliate.id}&sportId=${affiliate.sportId}&date=${dateStr}&hydrate=team,linescore`,
          { signal: AbortSignal.timeout(8000) }
        )
        if (!r.ok) return null
        const data = await r.json()
        const games = (data.dates || []).flatMap(d => d.games || [])
        if (!games.length) return null

        const g = games[0]
        const isHome = g.teams?.home?.team?.id === affiliate.id
        const oppTeam = isHome ? g.teams?.away?.team : g.teams?.home?.team

        const abstract = g.status?.abstractGameState
        const detailed = (g.status?.detailedState || '').toLowerCase()

        let status = 'preview'
        if (abstract === 'Final') status = 'final'
        else if (abstract === 'Live') status = 'live'
        else if (detailed.includes('postponed')) status = 'postponed'
        else if (detailed.includes('suspend')) status = 'suspended'

        const homeScore = g.teams?.home?.score ?? null
        const awayScore = g.teams?.away?.score ?? null
        const metsScore = isHome ? homeScore : awayScore
        const oppScore  = isHome ? awayScore : homeScore
        const inning     = g.linescore?.currentInning ?? null
        const inningHalf = g.linescore?.inningHalf ?? null

        const metsWin = status === 'final' && metsScore !== null && metsScore > oppScore
        const oppWin  = status === 'final' && oppScore  !== null && oppScore  > metsScore

        return {
          affiliateId: affiliate.id,
          name:   affiliate.name,
          abbr:   affiliate.abbr,
          status,
          inning,
          inningHalf,
          isHome,
          startTime: status === 'preview' ? formatTime(g.gameDate) : null,
          mets: { score: metsScore, win: metsWin },
          opp:  { name: shortName(oppTeam?.name || '?'), score: oppScore, win: oppWin },
        }
      } catch {
        return null
      }
    })
  )
  return results.filter(Boolean)
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Content-Type', 'application/json')

  const todayStr = todayET()
  const hour = hourET()

  let games = await fetchAffiliateGames(todayStr)
  const anyActiveToday = games.some(g => g.status === 'live' || g.status === 'final')

  let displayLabel = 'Today'
  if (hour < 12 && !anyActiveToday) {
    games = await fetchAffiliateGames(addDays(todayStr, -1))
    displayLabel = 'Yesterday'
  }

  const isLive   = games.some(g => g.status === 'live')
  const allFinal = games.length > 0 && games.every(g => g.status === 'final' || g.status === 'postponed' || g.status === 'suspended')
  const cacheSeconds = isLive ? 30 : allFinal ? 3600 : 300
  res.setHeader('Cache-Control', `s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`)

  return res.status(200).json({ displayLabel, games })
}

// api/syracuse.js — Syracuse Mets upcoming schedule via MLB Stats API
const TEAM_ID = 552
const OPENING_DATE = '2026-03-27'

function teamAbbr(name) {
  return name.split(' ')[0].substring(0, 3).toUpperCase()
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    const startDate = todayKey < OPENING_DATE ? OPENING_DATE : todayKey
    const endDate = new Date(new Date(startDate + 'T12:00:00').getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const r = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?teamId=${TEAM_ID}&sportId=11&startDate=${startDate}&endDate=${endDate}`
    )
    if (!r.ok) throw new Error(`MLB API error ${r.status}`)
    const data = await r.json()

    const games = (data.dates || [])
      .flatMap(d => d.games || [])
      .filter(g => g.status.abstractGameState !== 'Final')
      .slice(0, 10)
      .map(g => {
        const isHome = g.teams.home.team.id === TEAM_ID
        const opponent = isHome ? g.teams.away.team : g.teams.home.team
        return {
          id: g.gamePk,
          date: g.gameDate,
          officialDate: g.officialDate,
          isHome,
          opponent: opponent.name,
          opponentAbbr: teamAbbr(opponent.name),
        }
      })

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json({ games })
  } catch (err) {
    console.error('[syracuse]', err.message)
    return res.status(500).json({ error: err.message })
  }
}

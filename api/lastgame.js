// api/lastgame.js — Most recent completed Mets game with linescore + box score

const METS_ID = 121

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')

  const fmt = d => d.toISOString().split('T')[0]
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 30)

  try {
    // Find last completed Mets game (spring training + regular season)
    const schedRes = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?teamId=${METS_ID}&sportId=1&gameType=S,R,E&startDate=${fmt(startDate)}&endDate=${fmt(today)}`
    )
    if (!schedRes.ok) throw new Error(`Schedule ${schedRes.status}`)
    const schedData = await schedRes.json()

    const games = (schedData.dates || []).flatMap(d => d.games || [])
    const completed = games.filter(g => g.status.abstractGameState === 'Final')
    if (!completed.length) return res.status(200).json({ game: null })

    const last = completed[completed.length - 1]
    const gamePk = last.gamePk
    const homeTeam = last.teams.home.team
    const awayTeam = last.teams.away.team
    const metsIsHome = homeTeam.id === METS_ID

    // Fetch linescore + boxscore in parallel
    const [lsRes, bsRes] = await Promise.all([
      fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/linescore`),
      fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`),
    ])
    const [lsData, bsData] = await Promise.all([lsRes.json(), bsRes.json()])

    // Linescore — inning-by-inning
    const innings = (lsData.innings || []).map(inn => ({
      num: inn.num,
      away: inn.away?.runs ?? null,
      home: inn.home?.runs ?? null,
    }))

    // Box score — extract batting and pitching for each team
    function getBatters(teamData) {
      const players = teamData.players || {}
      return (teamData.batters || [])
        .map(id => {
          const p = players[`ID${id}`]
          if (!p) return null
          const s = p.stats?.batting || {}
          return {
            name: p.person.fullName,
            pos: p.position?.abbreviation || '',
            battingOrder: parseInt(p.battingOrder || '0', 10),
            ab: s.atBats ?? null,
            r: s.runs ?? null,
            h: s.hits ?? null,
            rbi: s.rbi ?? null,
            bb: s.baseOnBalls ?? null,
            k: s.strikeOuts ?? null,
          }
        })
        .filter(Boolean)
    }

    function getPitchers(teamData) {
      const players = teamData.players || {}
      return (teamData.pitchers || [])
        .map(id => {
          const p = players[`ID${id}`]
          if (!p) return null
          const s = p.stats?.pitching || {}
          return {
            name: p.person.fullName,
            note: s.note || '',
            ip: s.inningsPitched ?? '-',
            h: s.hits ?? null,
            r: s.runs ?? null,
            er: s.earnedRuns ?? null,
            bb: s.baseOnBalls ?? null,
            k: s.strikeOuts ?? null,
          }
        })
        .filter(Boolean)
    }

    function getTotals(teamData) {
      const s = teamData.teamStats?.batting || {}
      return {
        ab: s.atBats ?? null,
        r: s.runs ?? null,
        h: s.hits ?? null,
        rbi: s.rbi ?? null,
        bb: s.baseOnBalls ?? null,
        k: s.strikeOuts ?? null,
      }
    }

    res.status(200).json({
      game: {
        gamePk,
        date: last.officialDate || fmt(today),
        venue: last.venue?.name || '',
        gameType: last.gameType,
        home: {
          id: homeTeam.id,
          name: homeTeam.name,
          abbr: homeTeam.abbreviation,
          score: last.teams.home.score ?? 0,
        },
        away: {
          id: awayTeam.id,
          name: awayTeam.name,
          abbr: awayTeam.abbreviation,
          score: last.teams.away.score ?? 0,
        },
        metsIsHome,
      },
      linescore: {
        innings,
        home: {
          runs: lsData.teams?.home?.runs ?? last.teams.home.score ?? 0,
          hits: lsData.teams?.home?.hits ?? 0,
          errors: lsData.teams?.home?.errors ?? 0,
        },
        away: {
          runs: lsData.teams?.away?.runs ?? last.teams.away.score ?? 0,
          hits: lsData.teams?.away?.hits ?? 0,
          errors: lsData.teams?.away?.errors ?? 0,
        },
      },
      boxscore: {
        home: {
          batters: getBatters(bsData.teams.home),
          pitchers: getPitchers(bsData.teams.home),
          totals: getTotals(bsData.teams.home),
        },
        away: {
          batters: getBatters(bsData.teams.away),
          pitchers: getPitchers(bsData.teams.away),
          totals: getTotals(bsData.teams.away),
        },
      },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// api/livegame.js — Live Mets game state

const METS_ID = 121

module.exports = async function handler(req, res) {
  // Short cache — live data
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=10')

  const today = new Date().toISOString().split('T')[0]

  try {
    const schedRes = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?teamId=${METS_ID}&sportId=1&gameType=S,R,E&date=${today}`
    )
    if (!schedRes.ok) return res.status(200).json({ isLive: false })
    const schedData = await schedRes.json()

    const games = (schedData.dates || []).flatMap(d => d.games || [])
    const liveGame = games.find(g => g.status.abstractGameState === 'Live')

    if (!liveGame) return res.status(200).json({ isLive: false })

    const gamePk = liveGame.gamePk
    const metsIsHome = liveGame.teams.home.team.id === METS_ID

    // Fetch linescore and boxscore in parallel
    const [lsRes, bsRes] = await Promise.all([
      fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/linescore`),
      fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`),
    ])
    const lsData = lsRes.ok ? await lsRes.json() : {}
    const bsData = bsRes.ok ? await bsRes.json() : null

    const homeAbbr = bsData?.teams?.home?.team?.abbreviation || ''
    const awayAbbr = bsData?.teams?.away?.team?.abbreviation || ''
    const homeName = bsData?.teams?.home?.team?.name || liveGame.teams.home.team.name
    const awayName = bsData?.teams?.away?.team?.name || liveGame.teams.away.team.name

    const offense = lsData.offense || {}
    const defense = lsData.defense || {}

    return res.status(200).json({
      isLive: true,
      status: liveGame.status.detailedState || 'In Progress',
      gamePk,
      metsIsHome,
      home: {
        id: liveGame.teams.home.team.id,
        name: homeName,
        abbr: homeAbbr,
        score: liveGame.teams.home.score ?? 0,
      },
      away: {
        id: liveGame.teams.away.team.id,
        name: awayName,
        abbr: awayAbbr,
        score: liveGame.teams.away.score ?? 0,
      },
      inning: lsData.currentInning ?? 0,
      inningOrdinal: lsData.currentInningOrdinal ?? '',
      inningHalf: lsData.inningHalf ?? '',
      outs: lsData.outs ?? 0,
      balls: lsData.balls ?? 0,
      strikes: lsData.strikes ?? 0,
      runners: {
        first: !!offense.first,
        second: !!offense.second,
        third: !!offense.third,
      },
      batter: offense.batter?.fullName || null,
      pitcher: defense.pitcher?.fullName || null,
    })
  } catch (e) {
    console.warn('[livegame]', e.message)
    return res.status(200).json({ isLive: false })
  }
}

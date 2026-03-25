// api/livegame.js — Live Mets game state

const METS_ID = 121

function buildBatters(bsData, side) {
  const team = bsData?.teams?.[side]
  if (!team) return []
  return (team.batters || []).map(id => {
    const p = team.players?.[`ID${id}`]
    if (!p) return null
    const s = p.stats?.batting || {}
    return {
      name: p.person?.fullName || '',
      pos: p.position?.abbreviation || '',
      ab: s.atBats ?? 0,
      r: s.runs ?? 0,
      h: s.hits ?? 0,
      rbi: s.rbi ?? 0,
      hr: s.homeRuns ?? 0,
      bb: s.baseOnBalls ?? 0,
      so: s.strikeOuts ?? 0,
    }
  }).filter(Boolean)
}

function buildPitchers(bsData, side) {
  const team = bsData?.teams?.[side]
  if (!team) return []
  return (team.pitchers || []).map(id => {
    const p = team.players?.[`ID${id}`]
    if (!p) return null
    const s = p.stats?.pitching || {}
    return {
      name: p.person?.fullName || '',
      ip: s.inningsPitched ?? '0.0',
      h: s.hits ?? 0,
      r: s.runs ?? 0,
      er: s.earnedRuns ?? 0,
      bb: s.baseOnBalls ?? 0,
      so: s.strikeOuts ?? 0,
      era: p.seasonStats?.pitching?.era ?? '-',
    }
  }).filter(Boolean)
}

async function buildGameData(gamePk, metsIsHome, liveGame) {
  const [lsRes, bsRes] = await Promise.all([
    fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/linescore`),
    fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`),
  ])
  const lsData = lsRes.ok ? await lsRes.json() : {}
  const bsData = bsRes.ok ? await bsRes.json() : null

  // Derive metsIsHome from boxscore when not provided (debug mode)
  const resolvedMetsIsHome = metsIsHome ?? (bsData?.teams?.home?.team?.id === METS_ID)

  const homeTeam = bsData?.teams?.home?.team || {}
  const awayTeam = bsData?.teams?.away?.team || {}

  const offense = lsData.offense || {}
  const defense = lsData.defense || {}

  const isTop = lsData.inningHalf === 'Top'
  const batterTeamSide = isTop ? 'away' : 'home'
  const pitcherTeamSide = isTop ? 'home' : 'away'

  const batterId = offense.batter?.id
  const pitcherId = defense.pitcher?.id

  const batterRaw = batterId && bsData
    ? bsData.teams?.[batterTeamSide]?.players?.[`ID${batterId}`]?.stats?.batting
    : null
  const pitcherRaw = pitcherId && bsData
    ? bsData.teams?.[pitcherTeamSide]?.players?.[`ID${pitcherId}`]?.stats?.pitching
    : null

  const innings = (lsData.innings || []).map(ing => ({
    num: ing.num,
    away: ing.away?.runs ?? '',
    home: ing.home?.runs ?? '',
  }))

  let broadcast = null
  if (liveGame) {
    const bcs = liveGame.broadcasts || []
    const nationalTV = bcs.find(b => b.type === 'TV' && b.isNational)
    const localTV    = bcs.find(b => b.type === 'TV' && !b.isNational)
    const streaming  = bcs.find(b => b.type !== 'TV' && b.name !== 'MLB.TV' && b.name !== 'Radio')
    const mlbTV      = bcs.find(b => b.name === 'MLB.TV')
    broadcast = (nationalTV || localTV || streaming || mlbTV)?.name || null
  }

  return {
    isLive: true,
    broadcast,
    status: liveGame?.status?.detailedState || (lsData.currentInning ? 'In Progress' : 'Final'),
    gamePk,
    metsIsHome: resolvedMetsIsHome,
    home: {
      id: liveGame?.teams?.home?.team?.id ?? bsData?.teams?.home?.team?.id ?? 0,
      name: homeTeam.name || liveGame?.teams?.home?.team?.name || '',
      teamName: homeTeam.teamName || homeTeam.abbreviation || '',
      abbr: homeTeam.abbreviation || '',
      score: liveGame?.teams?.home?.score ?? lsData.teams?.home?.runs ?? 0,
    },
    away: {
      id: liveGame?.teams?.away?.team?.id ?? bsData?.teams?.away?.team?.id ?? 0,
      name: awayTeam.name || liveGame?.teams?.away?.team?.name || '',
      teamName: awayTeam.teamName || awayTeam.abbreviation || '',
      abbr: awayTeam.abbreviation || '',
      score: liveGame?.teams?.away?.score ?? lsData.teams?.away?.runs ?? 0,
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
    batterStats: batterRaw ? {
      ab: batterRaw.atBats ?? 0,
      h: batterRaw.hits ?? 0,
      hr: batterRaw.homeRuns ?? 0,
      rbi: batterRaw.rbi ?? 0,
      bb: batterRaw.baseOnBalls ?? 0,
    } : null,
    pitcherStats: pitcherRaw ? {
      ip: pitcherRaw.inningsPitched ?? '0.0',
      er: pitcherRaw.earnedRuns ?? 0,
      h: pitcherRaw.hits ?? 0,
      bb: pitcherRaw.baseOnBalls ?? 0,
      k: pitcherRaw.strikeOuts ?? 0,
    } : null,
    linescore: {
      innings,
      totals: {
        home: {
          r: lsData.teams?.home?.runs ?? 0,
          h: lsData.teams?.home?.hits ?? 0,
          e: lsData.teams?.home?.errors ?? 0,
        },
        away: {
          r: lsData.teams?.away?.runs ?? 0,
          h: lsData.teams?.away?.hits ?? 0,
          e: lsData.teams?.away?.errors ?? 0,
        },
      },
    },
    boxscore: {
      home: { batters: buildBatters(bsData, 'home'), pitchers: buildPitchers(bsData, 'home') },
      away: { batters: buildBatters(bsData, 'away'), pitchers: buildPitchers(bsData, 'away') },
    },
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  // Debug/test mode: bypass schedule and load a specific gamePk
  const debugGamePk = req.query?.gamePk
  if (debugGamePk) {
    res.setHeader('Cache-Control', 'no-store')
    try {
      const data = await buildGameData(parseInt(debugGamePk, 10), null, null)
      return res.status(200).json(data)
    } catch (e) {
      console.warn('[livegame debug]', e.message)
      return res.status(200).json({ isLive: false })
    }
  }

  const today = new Date().toISOString().split('T')[0]

  try {
    const schedRes = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?teamId=${METS_ID}&sportId=1&gameType=S,R,E&date=${today}&hydrate=broadcasts(all)`
    )
    if (!schedRes.ok) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
      return res.status(200).json({ isLive: false })
    }
    const schedData = await schedRes.json()

    const games = (schedData.dates || []).flatMap(d => d.games || [])
    const liveGame = games.find(g => g.status.abstractGameState === 'Live')

    if (!liveGame) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
      return res.status(200).json({ isLive: false })
    }

    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=10')

    const gamePk = liveGame.gamePk
    const metsIsHome = liveGame.teams.home.team.id === METS_ID

    const data = await buildGameData(gamePk, metsIsHome, liveGame)
    return res.status(200).json(data)
  } catch (e) {
    console.warn('[livegame]', e.message)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
    return res.status(200).json({ isLive: false })
  }
}

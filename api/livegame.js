// api/livegame.js — Live Mets game state

const METS_ID = 121
const ESPN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json',
}

// Fetch broadcast from ESPN for a specific date (same logic as schedule card)
// Uses dates=YYYYMMDD to return only that day's games — much smaller than full season
async function fetchEspnBroadcastForDate(dateKey) {
  const dateParam = dateKey.replace(/-/g, '')
  const r = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/21/schedule?dates=${dateParam}`,
    { headers: ESPN_HEADERS }
  )
  if (!r.ok) return null
  const data = await r.json()
  const event = (data.events || []).find(e =>
    new Date(e.date).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) === dateKey
  )
  if (!event) return null
  const bcs = event.competitions?.[0]?.broadcasts || []
  const nationalTV = bcs.find(b => b.type?.shortName === 'TV' && b.market?.type === 'National')
  const localTV    = bcs.find(b => b.type?.shortName === 'TV' && b.market?.type !== 'National')
  const streaming  = bcs.find(b => b.type?.shortName === 'Streaming' && b.media?.shortName !== 'MLB.TV')
  const mlbTV      = bcs.find(b => b.media?.shortName === 'MLB.TV')
  return (nationalTV || localTV || streaming || mlbTV)?.media?.shortName || null
}

// MLB Stats API broadcast fallback — filtered to Mets-relevant networks only
const METS_LOCAL = new Set(['SNY', 'WPIX'])
function mlbBroadcastFallback(bcs) {
  const nationalTV  = bcs.find(b => b.type === 'TV' && b.isNational)
  const metsLocalTV = bcs.find(b => b.type === 'TV' && !b.isNational && METS_LOCAL.has(b.name))
  const streaming   = bcs.find(b => b.type !== 'TV' && b.name !== 'MLB.TV' && b.name !== 'Radio')
  const mlbTV       = bcs.find(b => b.name === 'MLB.TV')
  return (nationalTV || metsLocalTV || streaming || mlbTV)?.name || null
}

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

function buildBench(bsData, side, handMap) {
  const team = bsData?.teams?.[side]
  if (!team) return []
  const battingOrderSet = new Set(team.battingOrder || [])
  const usedSubIds = (team.batters || []).filter(id => !battingOrderSet.has(id))
  const used = usedSubIds.map(id => {
    const p = team.players?.[`ID${id}`]
    if (!p || p.position?.abbreviation === 'P') return null
    return { name: p.person?.fullName || '', pos: p.position?.abbreviation || '', bats: handMap[id]?.batSide || '', used: true }
  }).filter(Boolean)
  const available = (team.bench || []).map(id => {
    const p = team.players?.[`ID${id}`]
    if (!p) return null
    return { name: p.person?.fullName || '', pos: p.position?.abbreviation || '', bats: handMap[id]?.batSide || '', used: false }
  }).filter(Boolean)
  return [...used, ...available]
}

function buildManagerPitchers(bsData, side, handMap) {
  const team = bsData?.teams?.[side]
  if (!team) return []
  const used = (team.pitchers || []).map(id => {
    const p = team.players?.[`ID${id}`]
    if (!p) return null
    return { name: p.person?.fullName || '', throws: handMap[id]?.pitchHand || '', used: true }
  }).filter(Boolean)
  const available = (team.bullpen || []).map(id => {
    const p = team.players?.[`ID${id}`]
    if (!p) return null
    return { name: p.person?.fullName || '', throws: handMap[id]?.pitchHand || '', used: false }
  }).filter(Boolean)
  return [...used, ...available]
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
      pc: s.numberOfPitches ?? 0,
      era: p.seasonStats?.pitching?.era ?? '-',
    }
  }).filter(Boolean)
}

async function fetchHandMap(ids) {
  if (!ids.length) return {}
  try {
    const url = `https://statsapi.mlb.com/api/v1/people?personIds=${ids.join(',')}`
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!r.ok) return {}
    const d = await r.json()
    return Object.fromEntries((d.people || []).map(p => [
      p.id,
      { batSide: p.batSide?.code || '', pitchHand: p.pitchHand?.code || '' }
    ]))
  } catch { return {} }
}

async function buildGameData(gamePk, metsIsHome, liveGame, broadcast) {
  const [lsRes, bsRes] = await Promise.all([
    fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/linescore`),
    fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`),
  ])
  const lsData = lsRes.ok ? await lsRes.json() : {}
  const bsData = bsRes.ok ? await bsRes.json() : null

  // Fetch hand data for bench/bullpen players (not included in boxscore by default)
  const managerIds = ['home', 'away'].flatMap(side => {
    const team = bsData?.teams?.[side]
    if (!team) return []
    return [
      ...(team.bench || []),
      ...(team.bullpen || []),
      ...(team.batters || []).filter(id => !new Set(team.battingOrder || []).has(id)),
      ...(team.pitchers || []),
    ]
  })
  const handMap = await fetchHandMap([...new Set(managerIds)])

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

  return {
    isLive: true,
    broadcast,
    status: liveGame?.status?.detailedState || (lsData.currentInning ? 'In Progress' : 'Final'),
    venue: liveGame?.venue?.name || null,
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
      pc: pitcherRaw.numberOfPitches ?? 0,
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
    managers: {
      home: { bench: buildBench(bsData, 'home', handMap), pitchers: buildManagerPitchers(bsData, 'home', handMap) },
      away: { bench: buildBench(bsData, 'away', handMap), pitchers: buildManagerPitchers(bsData, 'away', handMap) },
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
      const schedPkRes = await fetch(`https://statsapi.mlb.com/api/v1/schedule?gamePks=${debugGamePk}&hydrate=broadcasts(all)`)
      const schedPkData = schedPkRes.ok ? await schedPkRes.json() : {}
      const debugGame = (schedPkData.dates || []).flatMap(d => d.games || [])[0] || null
      const metsIsHome = debugGame ? debugGame.teams.home.team.id === METS_ID : null
      const gameDate = debugGame?.officialDate || new Date().toISOString().split('T')[0]
      const broadcast = await fetchEspnBroadcastForDate(gameDate).catch(() => null)
        || mlbBroadcastFallback(debugGame?.broadcasts || [])
      const data = await buildGameData(parseInt(debugGamePk, 10), metsIsHome, debugGame, broadcast)
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
    // Fetch ESPN broadcast (same source as schedule card) in parallel with game data
    const [broadcast, data] = await Promise.all([
      fetchEspnBroadcastForDate(today).catch(() => null),
      buildGameData(gamePk, metsIsHome, liveGame, null),
    ])
    data.broadcast = broadcast || mlbBroadcastFallback(liveGame.broadcasts || [])

    return res.status(200).json(data)
  } catch (e) {
    console.warn('[livegame]', e.message)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
    return res.status(200).json({ isLive: false })
  }
}

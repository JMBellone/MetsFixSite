// api/lineups.js — Today's Mets game lineups with career vsPlayer matchup stats

const ESPN_LOGO = abbr => {
  const m = { NYM:'nym',NYY:'nyy',BOS:'bos',TOR:'tor',BAL:'bal',TB:'tb',CLE:'cle',
    CWS:'cws',DET:'det',KC:'kc',MIN:'min',HOU:'hou',LAA:'laa',OAK:'oak',SEA:'sea',
    TEX:'tex',PIT:'pit',PHI:'phi',ATL:'atl',MIA:'mia',WSH:'wsh',CHC:'chc',CIN:'cin',
    MIL:'mil',STL:'stl',ARI:'ari',COL:'col',LAD:'lad',SD:'sd',SF:'sf' }
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${m[abbr] || abbr.toLowerCase()}.png`
}

async function vsPlayer(batterId, pitcherId) {
  if (!batterId || !pitcherId) return null
  try {
    const url = `https://statsapi.mlb.com/api/v1/people/${batterId}/stats?stats=vsPlayer&opposingPlayerId=${pitcherId}&group=hitting`
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!r.ok) return null
    const d = await r.json()
    const s = d.stats?.[0]?.splits?.[0]?.stat
    if (!s || !s.atBats) return null
    return { avg: s.avg || '.000', ab: s.atBats || 0, h: s.hits || 0, hr: s.homeRuns || 0, rbi: s.rbi || 0 }
  } catch { return null }
}

function todayET() {
  const parts = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/')
  return `${parts[2]}-${parts[0]}-${parts[1]}`
}

function buildLineup(teamData, order) {
  return order.slice(0, 9).map(pid => {
    const p = teamData.players?.[`ID${pid}`]
    if (!p) return null
    const full = p.person?.fullName || ''
    const lastName = full.includes(' ') ? full.split(' ').slice(1).join(' ') : full
    return {
      id: pid,
      name: full,
      lastName,
      pos: p.position?.abbreviation || '',
      batOrder: Math.round(parseInt(p.battingOrder || '100', 10) / 100),
    }
  }).filter(Boolean)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const today = todayET()

    // Schedule → gamePk + probable pitchers
    const schedR = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?teamId=121&date=${today}&sportId=1&hydrate=probablePitcher`
    )
    if (!schedR.ok) throw new Error('schedule fetch failed')
    const sched = await schedR.json()

    const games = sched.dates?.[0]?.games || []
    const game = games.find(g => g.status?.abstractGameState !== 'Final') || games[0]

    if (!game) {
      res.setHeader('Cache-Control', 's-maxage=300')
      return res.status(200).json({ posted: false, reason: 'no_game' })
    }

    if (game.status?.abstractGameState === 'Final') {
      res.setHeader('Cache-Control', 's-maxage=300')
      return res.status(200).json({ posted: false, reason: 'final' })
    }

    const { gamePk } = game
    const probableAway = game.teams?.away?.probablePitcher
    const probableHome = game.teams?.home?.probablePitcher

    // Live feed → batting orders + confirmed starters (works pre-game and in-game)
    const feedR = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`)
    if (!feedR.ok) throw new Error('live feed fetch failed')
    const feed = await feedR.json()

    const awayData = feed.liveData?.boxscore?.teams?.away
    const homeData = feed.liveData?.boxscore?.teams?.home

    const awayOrder = awayData?.battingOrder || []
    const homeOrder = homeData?.battingOrder || []

    if (!awayOrder.length || !homeOrder.length) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
      return res.status(200).json({ posted: false, reason: 'not_posted' })
    }

    // Starting pitcher: use boxscore pitchers[0] if available, else probable pitcher
    const awayStarterId = awayData?.pitchers?.[0] || probableAway?.id
    const homeStarterId = homeData?.pitchers?.[0] || probableHome?.id

    function starterName(teamData, probablePitcher, starterId) {
      if (!starterId) return null
      const boxName = teamData?.players?.[`ID${starterId}`]?.person?.fullName
      return { id: starterId, name: boxName || probablePitcher?.fullName || '' }
    }

    const awayStarter = starterName(awayData, probableAway, awayStarterId)
    const homeStarter = starterName(homeData, probableHome, homeStarterId)

    const awayLineup = buildLineup(awayData, awayOrder)
    const homeLineup = buildLineup(homeData, homeOrder)

    // vsPlayer stats: away batters vs home starter, home batters vs away starter
    const [awayVs, homeVs] = await Promise.all([
      Promise.all(awayLineup.map(p => vsPlayer(p.id, homeStarterId))),
      Promise.all(homeLineup.map(p => vsPlayer(p.id, awayStarterId))),
    ])

    const attachVs = (lineup, vsArr) => lineup.map((p, i) => ({ ...p, vs: vsArr[i] }))

    const metsHome = homeData?.team?.id === 121

    const teamInfo = (teamData) => ({
      id: teamData?.team?.id,
      name: teamData?.team?.name || '',
      abbr: teamData?.team?.abbreviation || '',
      logo: ESPN_LOGO(teamData?.team?.abbreviation || ''),
    })

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')
    return res.status(200).json({
      posted: true,
      gamePk,
      metsHome,
      away: { ...teamInfo(awayData), starter: awayStarter, lineup: attachVs(awayLineup, awayVs) },
      home: { ...teamInfo(homeData), starter: homeStarter, lineup: attachVs(homeLineup, homeVs) },
    })
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=60')
    return res.status(500).json({ error: e.message })
  }
}

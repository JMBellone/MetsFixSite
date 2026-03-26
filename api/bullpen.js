// api/bullpen.js — Pitching availability chart for Mets + Pirates

const METS_ID = 121
const PIRATES_ID = 134

function todayET() {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  return new Date(s + 'T00:00:00')
}

function fmt(d) {
  return d.toISOString().split('T')[0]
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function dayLabel(dateStr, todayStr) {
  if (dateStr === todayStr) return 'Today'
  return new Date(dateStr + 'T12:00:00Z')
    .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
    .toUpperCase()
}

async function fetchTeamData(teamId) {
  const today = todayET()
  const todayStr = fmt(today)
  const pastStr = fmt(addDays(today, -5))
  const futureStr = fmt(addDays(today, 5))

  const [rosterRes, pastRes, futureRes] = await Promise.all([
    fetch(`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&hydrate=person`),
    fetch(`https://statsapi.mlb.com/api/v1/schedule?teamId=${teamId}&sportId=1&startDate=${pastStr}&endDate=${todayStr}&gameType=S,R,E`),
    fetch(`https://statsapi.mlb.com/api/v1/schedule?teamId=${teamId}&sportId=1&startDate=${todayStr}&endDate=${futureStr}&gameType=S,R,E&hydrate=probablePitcher`),
  ])

  const roster     = rosterRes.ok  ? await rosterRes.json()  : {}
  const pastSched  = pastRes.ok    ? await pastRes.json()    : {}
  const futureSched = futureRes.ok ? await futureRes.json()  : {}

  // Build pitcher map from active roster
  const pitcherMap = {}
  for (const p of (roster.roster || [])) {
    if (p.position?.type !== 'Pitcher' && p.position?.abbreviation !== 'P') continue
    pitcherMap[p.person.id] = {
      id: p.person.id,
      name: p.person.fullName,
      throws: p.person?.pitchHand?.code === 'L' ? 'LHP' : 'RHP',
    }
  }

  // Find recent completed games
  const pastGames = (pastSched.dates || []).flatMap(d =>
    (d.games || [])
      .filter(g => g.status?.abstractGameState === 'Final')
      .map(g => ({ gamePk: g.gamePk, date: d.date, homeId: g.teams?.home?.team?.id }))
  )

  // Fetch boxscores in parallel
  const boxscores = await Promise.all(
    pastGames.map(async g => {
      try {
        const r = await fetch(`https://statsapi.mlb.com/api/v1/game/${g.gamePk}/boxscore`)
        return { ...g, bs: r.ok ? await r.json() : null }
      } catch {
        return { ...g, bs: null }
      }
    })
  )

  // Extract pitch usage; first pitcher in array = starter
  const pitcherUsage = {}
  const recentStarterIds = new Set()

  for (const { date, homeId, bs } of boxscores) {
    if (!bs) continue
    const side = homeId === teamId ? 'home' : 'away'
    const team = bs.teams?.[side]
    if (!team) continue

    const ids = team.pitchers || []
    if (ids[0]) recentStarterIds.add(ids[0])

    for (const pid of ids) {
      const player = team.players?.[`ID${pid}`]
      if (!player) continue
      const pc = player.stats?.pitching?.numberOfPitches ?? 0
      if (pc > 0) {
        pitcherUsage[pid] ??= {}
        pitcherUsage[pid][date] = pc
        // Add pitcher if not already in roster map (e.g. call-ups)
        if (!pitcherMap[pid]) {
          pitcherMap[pid] = {
            id: pid,
            name: player.person?.fullName ?? `Player ${pid}`,
            throws: player.person?.pitchHand?.code === 'L' ? 'LHP' : 'RHP',
          }
        }
      }
    }
  }

  // Upcoming probable pitchers
  const upcomingSchedule = {}
  const upcomingDates = []

  for (const dateEntry of (futureSched.dates || [])) {
    const ds = dateEntry.date
    upcomingDates.push({ dateStr: ds, dayAbbr: dayLabel(ds, todayStr) })

    for (const game of (dateEntry.games || [])) {
      const side = game.teams?.home?.team?.id === teamId ? 'home' : 'away'
      const oppSide = side === 'home' ? 'away' : 'home'
      const oppAbbr = game.teams?.[oppSide]?.team?.abbreviation || '?'
      const pp = game.teams?.[side]?.probablePitcher
      if (pp?.id) {
        upcomingSchedule[pp.id] ??= []
        upcomingSchedule[pp.id].push({ dateStr: ds, dayAbbr: dayLabel(ds, todayStr), opp: oppAbbr })
        if (!pitcherMap[pp.id]) {
          pitcherMap[pp.id] = { id: pp.id, name: pp.fullName, throws: 'RHP' }
        }
      }
    }
  }

  // Starters = upcoming probable pitchers + recent game starters
  const starterIds = new Set([
    ...Object.keys(upcomingSchedule).map(Number),
    ...recentStarterIds,
  ])

  const starters = Object.values(pitcherMap)
    .filter(p => starterIds.has(p.id))
    .map(p => ({ ...p, schedule: upcomingSchedule[p.id] || [] }))
    .sort((a, b) => {
      const ad = a.schedule[0]?.dateStr || 'Z'
      const bd = b.schedule[0]?.dateStr || 'Z'
      return ad < bd ? -1 : ad > bd ? 1 : a.name.localeCompare(b.name)
    })

  const bullpen = Object.values(pitcherMap)
    .filter(p => !starterIds.has(p.id))
    .map(p => ({ ...p, usage: pitcherUsage[p.id] || {} }))
    .sort((a, b) => {
      // Sort: pitchers who appeared recently first, then alphabetical
      const aRecent = Math.max(0, ...Object.keys(a.usage).map(d => new Date(d).getTime()))
      const bRecent = Math.max(0, ...Object.keys(b.usage).map(d => new Date(d).getTime()))
      return bRecent - aRecent || a.name.localeCompare(b.name)
    })

  // Recent dates with labels (past 5 days, most recent first)
  const recentDates = Array.from({ length: 5 }, (_, i) => {
    const ds = fmt(addDays(today, -(i + 1)))
    return { dateStr: ds, dayAbbr: dayLabel(ds, todayStr) }
  })

  return {
    starters,
    bullpen,
    upcomingDates: upcomingDates.slice(0, 5),
    recentDates,
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  try {
    const [mets, pirates] = await Promise.all([
      fetchTeamData(METS_ID),
      fetchTeamData(PIRATES_ID),
    ])
    return res.status(200).json({ mets, pirates })
  } catch (e) {
    console.warn('[bullpen]', e.message)
    return res.status(500).json({ error: e.message })
  }
}

// api/bullpen.js — Pitching availability chart for Mets + Pirates

const METS_ID = 121
const PIRATES_ID = 134

// Opening Day 2026 bullpen rosters (order = depth chart order)
const FIXED_BULLPENS = {
  [METS_ID]: [
    { name: 'Devin Williams',   throws: 'RHP' },
    { name: 'Luke Weaver',      throws: 'RHP' },
    { name: 'Brooks Raley',     throws: 'LHP' },
    { name: 'Luis García',      throws: 'RHP' },
    { name: 'Huascar Brazobán', throws: 'RHP' },
    { name: 'Tobias Myers',     throws: 'RHP' },
    { name: 'Richard Lovelady', throws: 'LHP' },
    { name: 'Sean Manaea',      throws: 'LHP' },
  ],
  [PIRATES_ID]: [
    { name: 'Dennis Santana',   throws: 'RHP' },
    { name: 'Gregory Soto',     throws: 'LHP' },
    { name: 'Isaac Mattson',    throws: 'RHP' },
    { name: 'Justin Lawrence',  throws: 'RHP' },
    { name: 'Mason Montgomery', throws: 'LHP' },
    { name: 'Yohan Ramírez',    throws: 'RHP' },
    { name: 'Hunter Barco',     throws: 'LHP' },
    { name: 'José Urquidy',     throws: 'RHP' },
  ],
}

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

// Normalize for name matching (strip accents, lowercase)
function norm(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
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

  const roster      = rosterRes.ok  ? await rosterRes.json()  : {}
  const pastSched   = pastRes.ok    ? await pastRes.json()    : {}
  const futureSched = futureRes.ok  ? await futureRes.json()  : {}

  // Build name→id map and id→pitcher map from roster
  const nameToId = {}
  const pitcherMap = {}
  for (const p of (roster.roster || [])) {
    if (p.position?.type !== 'Pitcher' && p.position?.abbreviation !== 'P') continue
    pitcherMap[p.person.id] = {
      id: p.person.id,
      name: p.person.fullName,
      throws: p.person?.pitchHand?.code === 'L' ? 'LHP' : 'RHP',
    }
    nameToId[norm(p.person.fullName)] = p.person.id
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
        if (!pitcherMap[pid]) {
          pitcherMap[pid] = {
            id: pid,
            name: player.person?.fullName ?? `Player ${pid}`,
            throws: player.person?.pitchHand?.code === 'L' ? 'LHP' : 'RHP',
          }
          nameToId[norm(player.person?.fullName)] = pid
        }
      }
    }
  }

  // Upcoming probable pitchers (starters)
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

  // Bullpen: use fixed Opening Day roster, match to IDs for pitch counts
  const bullpen = (FIXED_BULLPENS[teamId] || []).map(p => {
    const id = nameToId[norm(p.name)]
    return {
      id: id ?? null,
      name: p.name,
      throws: p.throws,
      usage: id ? (pitcherUsage[id] || {}) : {},
    }
  })

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

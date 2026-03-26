// api/bullpen.js — Pitching availability chart for Mets + Pirates

const METS_ID = 121
const PIRATES_ID = 134

// Static team ID → abbreviation map (avoids hydration issues)
const TEAM_ABBR = {
  108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC',
  113: 'CIN', 114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU',
  118: 'KC',  119: 'LAD', 120: 'WSH', 121: 'NYM', 133: 'OAK',
  134: 'PIT', 135: 'SD',  136: 'SEA', 137: 'SF',  138: 'STL',
  139: 'TB',  140: 'TEX', 141: 'TOR', 142: 'MIN', 143: 'PHI',
  144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL',
}

// Opening Day 2026 starting rotations
const FIXED_STARTERS = {
  [METS_ID]: [
    { name: 'Freddy Peralta',   throws: 'RHP' },
    { name: 'David Peterson',   throws: 'LHP' },
    { name: 'Nolan McLean',     throws: 'RHP' },
    { name: 'Clay Holmes',      throws: 'RHP' },
    { name: 'Kodai Senga',      throws: 'RHP' },
  ],
  [PIRATES_ID]: [
    { name: 'Paul Skenes',        throws: 'RHP' },
    { name: 'Mitch Keller',       throws: 'RHP' },
    { name: 'Carmen Mlodzinski',  throws: 'RHP' },
    { name: 'Braxton Ashcraft',   throws: 'RHP' },
    { name: 'Bubba Chandler',     throws: 'RHP' },
  ],
}

// Opening Day 2026 bullpen rosters (depth-chart order)
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

  // Build name→id map from active roster
  const nameToId = {}
  for (const p of (roster.roster || [])) {
    if (p.position?.type !== 'Pitcher' && p.position?.abbreviation !== 'P') continue
    nameToId[norm(p.person.fullName)] = p.person.id
  }

  // Recent completed games
  const pastGames = (pastSched.dates || []).flatMap(d =>
    (d.games || [])
      .filter(g => g.status?.abstractGameState === 'Final')
      .map(g => ({ gamePk: g.gamePk, date: d.date, homeId: g.teams?.home?.team?.id }))
  )

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

  // Pitch counts from boxscores; update nameToId with any missing players
  const pitcherUsage = {}

  for (const { date, homeId, bs } of boxscores) {
    if (!bs) continue
    const side = homeId === teamId ? 'home' : 'away'
    const team = bs.teams?.[side]
    if (!team) continue

    for (const pid of (team.pitchers || [])) {
      const player = team.players?.[`ID${pid}`]
      if (!player) continue
      const pc = player.stats?.pitching?.numberOfPitches ?? 0
      if (pc > 0) {
        pitcherUsage[pid] ??= {}
        pitcherUsage[pid][date] = pc
        const fn = player.person?.fullName
        if (fn && !nameToId[norm(fn)]) nameToId[norm(fn)] = pid
      }
    }
  }

  // Upcoming probable pitchers → schedule map { id: [{dateStr, opp}] }
  const upcomingSchedule = {}

  for (const dateEntry of (futureSched.dates || [])) {
    const ds = dateEntry.date
    for (const game of (dateEntry.games || [])) {
      const side = game.teams?.home?.team?.id === teamId ? 'home' : 'away'
      const oppSide = side === 'home' ? 'away' : 'home'
      const oppTeamId = game.teams?.[oppSide]?.team?.id
      const oppAbbr = TEAM_ABBR[oppTeamId] || game.teams?.[oppSide]?.team?.abbreviation || '?'
      const pp = game.teams?.[side]?.probablePitcher
      if (pp?.id) {
        upcomingSchedule[pp.id] ??= []
        upcomingSchedule[pp.id].push({ dateStr: ds, opp: oppAbbr })
        if (pp.fullName) nameToId[norm(pp.fullName)] = pp.id
      }
    }
  }

  // Always show 5 consecutive calendar days starting today (includes off days)
  const upcomingDates = Array.from({ length: 5 }, (_, i) => {
    const ds = fmt(addDays(today, i))
    return { dateStr: ds, dayAbbr: dayLabel(ds, todayStr) }
  })

  // Build starters from fixed list + schedule from API
  const starters = (FIXED_STARTERS[teamId] || []).map(p => {
    const id = nameToId[norm(p.name)]
    return {
      id: id ?? null,
      name: p.name,
      throws: p.throws,
      schedule: id ? (upcomingSchedule[id] || []) : [],
    }
  })

  // Fetch 2026 season stats for starters with known IDs
  const starterIdsForStats = starters.filter(s => s.id).map(s => s.id)
  if (starterIdsForStats.length > 0) {
    try {
      const statsRes = await fetch(
        `https://statsapi.mlb.com/api/v1/people?personIds=${starterIdsForStats.join(',')}&hydrate=stats(type=season,group=pitching,season=2026)`
      )
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        const statsById = {}
        for (const person of (statsData.people || [])) {
          const s = (person.stats || []).find(st => st.type?.displayName === 'season')
          const stat = s?.splits?.[0]?.stat
          if (stat) {
            statsById[person.id] = {
              wins: stat.wins ?? 0,
              losses: stat.losses ?? 0,
              era: stat.era ?? '-',
            }
          }
        }
        starters.forEach(p => {
          Object.assign(p, p.id ? (statsById[p.id] || { wins: 0, losses: 0, era: '-' }) : { wins: 0, losses: 0, era: '-' })
        })
      }
    } catch { /* stats fetch failure is non-fatal */ }
  }

  // Build bullpen from fixed list + pitch counts from boxscores
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

  // Who starts today?
  const todayStarter = starters.find(s => s.schedule?.some(sc => sc.dateStr === todayStr)) || null

  return {
    starters,
    bullpen,
    upcomingDates,
    recentDates,
    todayStarter: todayStarter
      ? { id: todayStarter.id, name: todayStarter.name, throws: todayStarter.throws }
      : null,
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

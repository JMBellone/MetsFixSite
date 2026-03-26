// api/managerscard.js — Split stats for Manager's Card bench and bullpen players

function getSeason() {
  const etStr = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const [m, , y] = etStr.split('/')
  // Before May 1 use previous season (current season sample too small)
  return parseInt(m) < 5 ? parseInt(y) - 1 : parseInt(y)
}

function tomorrowET() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

async function fetchSplits(playerId, group, season) {
  try {
    const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=statSplits&group=${group}&season=${season}&sitCodes=vl,vr&sportId=1`
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return { vl: null, vr: null }
    const d = await r.json()
    const splits = d.stats?.[0]?.splits || []
    const vl = splits.find(s => s.split?.code === 'vl')?.stat
    const vr = splits.find(s => s.split?.code === 'vr')?.stat
    return { vl: vl?.ops ?? null, vr: vr?.ops ?? null }
  } catch { return { vl: null, vr: null } }
}

// Returns the player IDs of the next `numGames` probable starters for a team
async function fetchRotationIds(teamId, startDate, numGames = 4) {
  try {
    const end = new Date(startDate)
    end.setDate(end.getDate() + 25) // wide window to cover off-days
    const endDate = end.toISOString().split('T')[0]
    const url = `https://statsapi.mlb.com/api/v1/schedule?teamId=${teamId}&sportId=1&startDate=${startDate}&endDate=${endDate}&hydrate=probablePitcher&gameType=R,S,P`
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return new Set()
    const d = await r.json()
    const games = (d.dates || []).flatMap(dt => dt.games || [])
    const ids = new Set()
    for (const g of games) {
      if (ids.size >= numGames) break
      const isHome = g.teams?.home?.team?.id === teamId
      const starter = isHome
        ? g.teams?.home?.probablePitcher
        : g.teams?.away?.probablePitcher
      if (starter?.id) ids.add(starter.id)
    }
    return ids
  } catch { return new Set() }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { gamePk } = req.query
  if (!gamePk) return res.status(400).json({ error: 'gamePk required' })

  try {
    const bsRes = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`)
    if (!bsRes.ok) return res.status(500).json({ error: 'boxscore fetch failed' })
    const bsData = await bsRes.json()

    const season = getSeason()
    const tomorrow = tomorrowET()

    const homeTeamId = bsData.teams?.home?.team?.id
    const awayTeamId = bsData.teams?.away?.team?.id

    // Fetch rotation IDs for both teams in parallel
    const [homeRotation, awayRotation] = await Promise.all([
      homeTeamId ? fetchRotationIds(homeTeamId, tomorrow) : Promise.resolve(new Set()),
      awayTeamId ? fetchRotationIds(awayTeamId, tomorrow) : Promise.resolve(new Set()),
    ])
    const rotationBySide = { home: homeRotation, away: awayRotation }

    // Collect all players needing splits: bench hitters + bullpen pitchers (excluding rotation)
    const jobs = []
    for (const side of ['home', 'away']) {
      const team = bsData.teams?.[side]
      if (!team) continue
      const rotation = rotationBySide[side]
      const battingOrderSet = new Set(team.battingOrder || [])

      // Bench hitters: available bench + used substitutes (non-pitchers)
      const benchIds = new Set([
        ...(team.bench || []),
        ...(team.batters || []).filter(id => !battingOrderSet.has(id)),
      ])
      for (const id of benchIds) {
        const p = team.players?.[`ID${id}`]
        if (!p || p.position?.abbreviation === 'P') continue
        jobs.push({ id, group: 'hitting', side })
      }

      // All pitchers (used + bullpen), excluding upcoming rotation starters
      const pitcherIds = new Set([...(team.pitchers || []), ...(team.bullpen || [])])
      for (const id of pitcherIds) {
        if (rotation.has(id)) continue
        jobs.push({ id, group: 'pitching', side })
      }
    }

    // Fetch all splits in parallel
    const results = await Promise.all(jobs.map(j => fetchSplits(j.id, j.group, season)))

    // Build lookup: { home: { hitting: {id: {vl,vr}}, pitching: {id: {vl,vr}} }, away: {...} }
    const out = {
      season,
      home: { hitting: {}, pitching: {}, rotation: [...homeRotation] },
      away: { hitting: {}, pitching: {}, rotation: [...awayRotation] },
    }
    jobs.forEach(({ id, group, side }, i) => {
      out[side][group][id] = results[i]
    })

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    return res.status(200).json(out)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

// api/managerscard.js — Split stats for Manager's Card bench and bullpen players

function getSeason() {
  const etStr = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const [m, , y] = etStr.split('/')
  // Before May 1 use previous season (current season sample too small)
  return parseInt(m) < 5 ? parseInt(y) - 1 : parseInt(y)
}

async function fetchSplits(playerId, group, season) {
  try {
    const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=statSplits&group=${group}&season=${season}&sportId=1`
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return { vl: null, vr: null }
    const d = await r.json()
    const splits = d.stats?.[0]?.splits || []
    const vl = splits.find(s => s.split?.code === 'vl')?.stat
    const vr = splits.find(s => s.split?.code === 'vr')?.stat
    return { vl: vl?.ops ?? null, vr: vr?.ops ?? null }
  } catch { return { vl: null, vr: null } }
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

    // Collect all players needing splits: bench hitters + all pitchers, both teams
    const jobs = []
    for (const side of ['home', 'away']) {
      const team = bsData.teams?.[side]
      if (!team) continue
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

      // All pitchers (used + bullpen)
      const pitcherIds = new Set([...(team.pitchers || []), ...(team.bullpen || [])])
      for (const id of pitcherIds) {
        jobs.push({ id, group: 'pitching', side })
      }
    }

    // Fetch all splits in parallel
    const results = await Promise.all(jobs.map(j => fetchSplits(j.id, j.group, season)))

    // Build lookup: { home: { hitting: {id: {vl,vr}}, pitching: {id: {vl,vr}} }, away: {...} }
    const out = {
      season,
      home: { hitting: {}, pitching: {} },
      away: { hitting: {}, pitching: {} },
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

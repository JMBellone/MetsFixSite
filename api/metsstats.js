// api/metsstats.js — Mets season stats via MLB Stats API
// Shows spring training stats before 2026-03-26, regular season after

const METS_ID = 121
const OPENING_DAY = new Date('2026-03-26T00:00:00-05:00')
const BASE = 'https://statsapi.mlb.com/api/v1'

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`MLB API ${res.status}: ${url}`)
  return res.json()
}

function fmt(val, decimals = 0) {
  if (val == null || val === '' || val === '-') return '—'
  return val
}

module.exports = async function handler(req, res) {
  const isSpring = Date.now() < OPENING_DAY.getTime()
  const gameType = isSpring ? 'S' : 'R'
  const season = 2026

  try {
    const [hitData, pitchData] = await Promise.all([
      fetchJson(`${BASE}/stats?stats=season&group=hitting&season=${season}&gameType=${gameType}&teamId=${METS_ID}&playerPool=All`),
      fetchJson(`${BASE}/stats?stats=season&group=pitching&season=${season}&gameType=${gameType}&teamId=${METS_ID}&playerPool=All`),
    ])

    const pitchSplits = pitchData.stats?.[0]?.splits || []
    const pitcherIds = new Set(pitchSplits.map(s => s.player.id))

    // Hitters: appear in hitting stats but not pitching stats
    const hitSplits = hitData.stats?.[0]?.splits || []
    const hitters = hitSplits
      .filter(s => !pitcherIds.has(s.player.id))
      .map(s => ({
        id: s.player.id,
        name: s.player.fullName,
        g: s.stat.gamesPlayed ?? 0,
        ab: s.stat.atBats ?? 0,
        avg: fmt(s.stat.avg),
        obp: fmt(s.stat.obp),
        slg: fmt(s.stat.slg),
        ops: fmt(s.stat.ops),
        hr: s.stat.homeRuns ?? 0,
        rbi: s.stat.rbi ?? 0,
        sb: s.stat.stolenBases ?? 0,
        pa: s.stat.plateAppearances ?? 0,
      }))
      .filter(p => p.pa > 0)
      .sort((a, b) => b.pa - a.pa)

    // Starters: gamesStarted > 0; Relievers: gamesStarted === 0
    const starters = []
    const relievers = []
    for (const s of pitchSplits) {
      const gs = s.stat.gamesStarted ?? 0
      const entry = {
        id: s.player.id,
        name: s.player.fullName,
        g: s.stat.gamesPlayed ?? 0,
        gs,
        ip: fmt(s.stat.inningsPitched),
        era: fmt(s.stat.era),
        whip: fmt(s.stat.whip),
        w: s.stat.wins ?? 0,
        l: s.stat.losses ?? 0,
        k: s.stat.strikeOuts ?? 0,
        bb: s.stat.baseOnBalls ?? 0,
        sv: s.stat.saves ?? 0,
        hld: s.stat.holds ?? 0,
        ip_num: parseFloat(s.stat.inningsPitched) || 0,
      }
      if (gs > 0) starters.push(entry)
      else relievers.push(entry)
    }
    starters.sort((a, b) => b.ip_num - a.ip_num)
    relievers.sort((a, b) => b.g - a.g || b.ip_num - a.ip_num)
    starters.forEach(p => delete p.ip_num)
    relievers.forEach(p => delete p.ip_num)

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300')
    return res.status(200).json({ hitters, starters, relievers, isSpring })
  } catch (err) {
    console.error('[metsstats]', err.message)
    return res.status(500).json({ error: err.message })
  }
}

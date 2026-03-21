module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate')

  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 90)
  const fmt = d => d.toISOString().split('T')[0]

  try {
    const url = `https://statsapi.mlb.com/api/v1/transactions?teamId=121&startDate=${fmt(startDate)}&endDate=${fmt(today)}&sportId=1`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`MLB API ${r.status}`)
    const data = await r.json()
    const txns = data.transactions || []

    // Players who have been recalled after being optioned
    const returnedIds = new Set(
      txns
        .filter(t => ['CU', 'RCL'].includes(t.typeCode))
        .map(t => t.person?.id)
        .filter(Boolean)
    )

    // Collect OPT transactions, deduplicate by player (keep most recent)
    const byPlayer = new Map()
    for (const t of txns) {
      if (t.typeCode !== 'OPT') continue
      const pid = t.person?.id
      if (!pid) continue
      const existing = byPlayer.get(pid)
      if (!existing || t.date > existing.date) {
        byPlayer.set(pid, t)
      }
    }

    const PITCHER_RE = /\b(RHP|LHP|SP|RP)\b/
    // Description format: "New York Mets optioned RHP Alex Carrillo to Syracuse Mets."
    const POS_RE = /optioned\s+([A-Z0-9/]+)\s+/

    const players = [...byPlayer.values()]
      .filter(t => !returnedIds.has(t.person.id))
      .map(t => {
        const desc = t.description || ''
        const posMatch = desc.match(POS_RE)
        const position = posMatch ? posMatch[1] : '—'
        const isPitcher = PITCHER_RE.test(position)
        const days = isPitcher ? 15 : 10

        const eligible = new Date(t.date + 'T12:00:00Z')
        eligible.setDate(eligible.getDate() + days)

        return {
          name: t.person.fullName,
          position,
          isPitcher,
          dateOptioned: t.date,
          eligibleDate: eligible.toISOString().split('T')[0],
        }
      })
      .sort((a, b) => b.dateOptioned.localeCompare(a.dateOptioned))

    res.status(200).json({ players })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

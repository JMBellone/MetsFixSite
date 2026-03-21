module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400')

  const today = new Date()
  const fmt = d => d.toISOString().split('T')[0]

  try {
    const url = `https://statsapi.mlb.com/api/v1/transactions?teamId=121&startDate=2026-02-01&endDate=${fmt(today)}&sportId=1`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`MLB API ${r.status}`)
    const data = await r.json()
    const txns = data.transactions || []

    // Players reinstated from IL (returned to active roster)
    const reinstatedIds = new Set(
      txns
        .filter(t => {
          const desc = (t.description || '').toLowerCase()
          return t.typeCode === 'SC' && desc.includes('reinstated')
        })
        .map(t => t.person?.id)
        .filter(Boolean)
    )

    // IL placements and transfers — only "placed on" or "transferred to" the injured list
    // Deduplicate by player, keeping most recent (handles 10-day → 60-day transfers)
    const byPlayer = new Map()
    for (const t of txns) {
      if (t.typeCode !== 'SC') continue
      const desc = (t.description || '').toLowerCase()
      const isPlacement = desc.includes('injured list') &&
        (desc.includes('placed') || desc.includes('transferred'))
      if (!isPlacement) continue
      const pid = t.person?.id
      if (!pid) continue
      const existing = byPlayer.get(pid)
      if (!existing || t.date > existing.date) {
        byPlayer.set(pid, t)
      }
    }

    const IL_RE = /(\d+)-day injured list[^.]*\.?\s*(.*)/i

    const players = [...byPlayer.values()]
      .filter(t => !reinstatedIds.has(t.person.id))
      .map(t => {
        const desc = t.description || ''
        const ilMatch = desc.match(IL_RE)
        const ilType = ilMatch ? `${ilMatch[1]}-Day IL` : 'IL'
        const injury = ilMatch?.[2]?.replace(/\.$/, '').trim() || '—'
        return {
          name: t.person.fullName,
          ilType,
          injury,
          datePlaced: t.date,
        }
      })
      .sort((a, b) => b.datePlaced.localeCompare(a.datePlaced))

    res.status(200).json({ players })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

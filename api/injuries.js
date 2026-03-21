module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate')

  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 180)
  const fmt = d => d.toISOString().split('T')[0]

  try {
    const url = `https://statsapi.mlb.com/api/v1/transactions?teamId=121&startDate=${fmt(startDate)}&endDate=${fmt(today)}&sportId=1`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`MLB API ${r.status}`)
    const data = await r.json()
    const txns = data.transactions || []

    // Players reinstated/returned from IL
    const returnedIds = new Set(
      txns
        .filter(t => {
          const desc = (t.description || '').toLowerCase()
          return t.typeCode === 'SC' && (desc.includes('reinstated') || desc.includes('activated from'))
        })
        .map(t => t.person?.id)
        .filter(Boolean)
    )

    // IL placements: SC transactions with "injured list" in description
    // Deduplicate by player — keep most recent placement
    const byPlayer = new Map()
    for (const t of txns) {
      if (t.typeCode !== 'SC') continue
      const desc = (t.description || '').toLowerCase()
      if (!desc.includes('injured list')) continue
      const pid = t.person?.id
      if (!pid) continue
      const existing = byPlayer.get(pid)
      if (!existing || t.date > existing.date) {
        byPlayer.set(pid, t)
      }
    }

    const IL_RE = /(\d+)-day injured list[^.]*\.?\s*(.*)/i
    const POS_RE = /(?:placed|transferred)\s+([A-Z/]+)\s+/i

    const players = [...byPlayer.values()]
      .filter(t => !returnedIds.has(t.person.id))
      .map(t => {
        const desc = t.description || ''
        const ilMatch = desc.match(IL_RE)
        const ilType = ilMatch ? `${ilMatch[1]}-Day IL` : 'IL'
        const injury = ilMatch?.[2]?.replace(/\.$/, '').trim() || '—'
        const posMatch = desc.match(POS_RE)
        const position = posMatch ? posMatch[1] : '—'
        return {
          name: t.person.fullName,
          position,
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

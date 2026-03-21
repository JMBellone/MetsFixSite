const GIST_URL = 'https://gist.githubusercontent.com/JMBellone/007dbef06df9d25265503d4e2afd61c9/raw/daily.json'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Short cache so updates go live within ~30 seconds
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate')

  try {
    const r = await fetch(`${GIST_URL}?t=${Date.now()}`)
    if (!r.ok) throw new Error(`Gist fetch ${r.status}`)
    const raw = await r.text()
    const data = JSON.parse(raw)

    // Support both formats:
    // Array format: [{topic, summary, players, source, status, game_result}, ...]
    // Simple format: {text, image, date}
    if (Array.isArray(data)) {
      res.status(200).json({ type: 'topics', items: data })
    } else {
      res.status(200).json({
        type: 'note',
        text: data.text || '',
        image: data.image || '',
        date: data.date || '',
      })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

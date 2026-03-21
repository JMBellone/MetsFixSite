const GIST_URL = 'https://gist.githubusercontent.com/JMBellone/007dbef06df9d25265503d4e2afd61c9/raw/daily.json'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Short cache so updates go live within ~30 seconds
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate')

  try {
    const r = await fetch(`${GIST_URL}?t=${Date.now()}`)
    if (!r.ok) throw new Error(`Gist fetch ${r.status}`)
    // Strip bare control characters (e.g. literal newlines inside string values)
    // before parsing so the Gist editor doesn't need to be perfect JSON
    const raw = await r.text()
    const cleaned = raw.replace(/[\r\n\t]/g, ' ')
    const data = JSON.parse(cleaned)
    res.status(200).json({
      text: data.text || '',
      image: data.image || '',
      date: data.date || '',
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

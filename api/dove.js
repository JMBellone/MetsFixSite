// api/dove.js — Latest video from Ernest Dove's YouTube channel
const CHANNEL_ID = 'UCcE1axu98_t_3r3S-Uw-0Zg'

function decodeEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`)
    if (!r.ok) throw new Error(`YouTube RSS ${r.status}`)
    const xml = await r.text()

    const entries = []
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g
    let m
    while ((m = entryRe.exec(xml)) !== null) {
      const entry = m[1]
      const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]
      const title = decodeEntities(
        (entry.match(/<media:title[^>]*>([^<]+)<\/media:title>/) ||
         entry.match(/<title>([^<]+)<\/title>/) || [])[1] || ''
      )
      const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] || ''
      const thumbMatch = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/)
      const thumbnail = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      if (videoId && title) entries.push({ videoId, title, published, thumbnail })
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400')
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json({ video: entries[0] || null })
  } catch (err) {
    console.error('[dove]', err.message)
    return res.status(500).json({ error: err.message })
  }
}

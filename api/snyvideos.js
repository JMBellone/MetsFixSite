const CHANNEL_ID = 'UCL_OEjsHTwsHK6WKWs7s7Uw'

function decodeEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate')

  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`)
    if (!r.ok) throw new Error(`YouTube RSS ${r.status}`)
    const xml = await r.text()

    const METS_TERMS = ['mets', 'citi field', 'lindor', 'soto', 'alonso', 'baty', 'nimmo', 'mendoza', 'new york mets']
    const isMets = (t) => { const lc = t.toLowerCase(); return METS_TERMS.some(kw => lc.includes(kw)) }

    const allEntries = []
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g
    let m
    while ((m = entryRe.exec(xml)) !== null) {
      const entry = m[1]
      const videoId   = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]
      const title     = decodeEntities((entry.match(/<media:title[^>]*>([^<]+)<\/media:title>/) || entry.match(/<title>([^<]+)<\/title>/) || [])[1])
      const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] || ''
      const thumbMatch = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/)
      const thumbnail = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      if (videoId && title && isMets(title)) allEntries.push({ videoId, title, published, thumbnail })
    }
    const videos = allEntries.slice(0, 5)

    res.status(200).json({ videos })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// api/metsvideo.js — Latest non-Short video from the Mets YouTube channel

const CHANNEL_ID = 'UCgIMbGazP0uBDy9JVCqBUaA'

function decodeEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function isShort(title) {
  const lc = title.toLowerCase()
  return lc.includes('#shorts') || lc.includes('#short')
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const feedRes = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    if (!feedRes.ok) throw new Error(`YouTube RSS ${feedRes.status}`)
    const xml = await feedRes.text()

    const entryRe = /<entry>([\s\S]*?)<\/entry>/g
    let m
    while ((m = entryRe.exec(xml)) !== null) {
      const entry = m[1]
      const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]
      const rawTitle = (entry.match(/<media:title[^>]*>([^<]+)<\/media:title>/) || entry.match(/<title>([^<]+)<\/title>/) || [])[1]
      const title = decodeEntities(rawTitle)
      const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] || ''
      const thumbMatch = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/)
      const thumbnail = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

      if (!videoId || !title) continue
      if (isShort(title)) continue

      return res.status(200).json({ video: { videoId, title, published, thumbnail } })
    }

    return res.status(200).json({ video: null })
  } catch (e) {
    console.warn('[metsvideo]', e.message)
    return res.status(200).json({ video: null })
  }
}

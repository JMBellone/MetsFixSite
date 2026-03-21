const CHANNEL_ID = 'UCL_OEjsHTwsHK6WKWs7s7Uw'

// Team/venue/staff terms that are always relevant
const BASE_TERMS = ['mets', 'citi field', 'new york mets', 'mendoza', 'stearns']

function decodeEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

async function fetchRosterTerms() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const r = await fetch(
      'https://statsapi.mlb.com/api/v1/teams/121/roster?rosterType=active',
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    if (!r.ok) return []
    const data = await r.json()
    // Extract both last name and full name tokens for each player
    return (data.roster || []).flatMap(p => {
      const full = (p.person?.fullName || '').toLowerCase()
      const parts = full.split(' ')
      // include last name and full name so e.g. "Pete Alonso" and "alonso" both match
      return parts.length >= 2 ? [full, parts[parts.length - 1]] : [full]
    })
  } catch {
    return []
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400')

  try {
    // Fetch YouTube feed and roster in parallel
    const [feedRes, rosterTerms] = await Promise.all([
      fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`),
      fetchRosterTerms(),
    ])

    if (!feedRes.ok) throw new Error(`YouTube RSS ${feedRes.status}`)
    const xml = await feedRes.text()

    const allTerms = [...BASE_TERMS, ...rosterTerms]
    const isMets = (title) => {
      const lc = title.toLowerCase()
      return allTerms.some(kw => lc.includes(kw))
    }

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

    res.status(200).json({ videos: allEntries.slice(0, 6) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// api/mlbnews.js — 7 most recent non-Mets articles from MLB.com

const METS_TERMS = ['mets', 'new york mets', '/mets/']

function isMets(title, link) {
  const t = (title + ' ' + link).toLowerCase()
  return METS_TERMS.some(kw => t.includes(kw))
}

function decode(str) {
  return (str || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseItems(xml) {
  const items = []
  const re = /<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi
  let m
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    const get = (tag) => {
      const cr = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i').exec(block)
      if (cr) return cr[1].trim()
      const pr = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block)
      return pr ? pr[1].trim() : ''
    }
    const title = decode(get('title'))
    let link = decode(get('link')) || decode(get('guid'))
    if (!link) {
      const al = /<link[^>]+href=["']([^"']+)["'][^>]*>/i.exec(block)
      if (al) link = al[1]
    }
    const pubStr = get('pubDate') || get('published') || ''
    if (!title || !link) continue
    if (isMets(title, link)) continue
    let pubDate = null
    if (pubStr) {
      const d = new Date(pubStr.replace(/\bEDT\b/, '-0400').replace(/\bEST\b/, '-0500'))
      if (!isNaN(d.getTime())) pubDate = d.toISOString()
    }
    // Extract image: MLB custom <image href>, media:content, media:thumbnail, enclosure, or <img>
    let image = null
    const mlbImg = /<image[^>]+href=["']([^"']+)["'][^>]*/i.exec(block)
    if (mlbImg) image = mlbImg[1]
    if (!image) {
      const mc = /<media:content[^>]+url=["']([^"']+)["'][^>]*/i.exec(block)
      if (mc) image = mc[1]
    }
    if (!image) {
      const mt = /<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*/i.exec(block)
      if (mt) image = mt[1]
    }
    if (!image) {
      const enc = /<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["'][^>]*/i.exec(block)
        || /<enclosure[^>]+type=["']image[^"']*["'][^>]+url=["']([^"']+)["'][^>]*/i.exec(block)
      if (enc) image = enc[1]
    }
    if (!image) {
      const desc = get('description') || get('content:encoded') || get('content') || ''
      const imgTag = /<img[^>]+src=["']([^"']+)["'][^>]*/i.exec(desc)
      if (imgTag) image = imgTag[1]
    }
    items.push({ title, link, pubDate, image })
  }
  return items
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const r = await fetch('https://www.mlb.com/feeds/news/rss.xml', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    clearTimeout(timeout)
    if (!r.ok) throw new Error(`Feed error ${r.status}`)
    const xml = await r.text()
    const articles = parseItems(xml).slice(0, 7)

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=120')
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json({ articles })
  } catch (err) {
    console.error('[mlbnews]', err.message)
    return res.status(500).json({ error: err.message })
  }
}

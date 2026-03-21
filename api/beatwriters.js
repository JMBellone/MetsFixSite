// api/beatwriters.js — Mets beat coverage from NJ.com & NY Post (Mike Puma)

const FEEDS = [
  { url: 'https://www.nj.com/arc/outboundfeeds/rss/category/mets/?outputType=xml', source: 'NJ.com' },
  { url: 'https://nypost.com/author/mike-puma/feed/', source: 'NY Post' },
]

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
    let pubDate = null
    if (pubStr) {
      const d = new Date(pubStr.replace(/\bEDT\b/, '-0400').replace(/\bEST\b/, '-0500'))
      if (!isNaN(d.getTime())) pubDate = d.toISOString()
    }
    let image = null
    const mc = /<media:content[^>]+url=["']([^"']+)["'][^>]*/i.exec(block)
    if (mc) image = mc[1]
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
      const cdataContent = block.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      const imgTag = /<img[^>]+src=["']([^"']+)["'][^>]*/i.exec(cdataContent)
      if (imgTag) image = imgTag[1]
    }
    items.push({ title, link, pubDate, image })
  }
  return items
}

async function fetchFeed(feed) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const xml = await res.text()
    return parseItems(xml).map(a => ({ ...a, source: feed.source }))
  } catch {
    return []
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const settled = await Promise.allSettled(FEEDS.map(fetchFeed))
  const all = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  all.sort((a, b) => {
    if (!a.pubDate && !b.pubDate) return 0
    if (!a.pubDate) return 1
    if (!b.pubDate) return -1
    return new Date(b.pubDate) - new Date(a.pubDate)
  })

  const seen = new Set()
  const deduped = all.filter(a => {
    const key = a.title.toLowerCase().slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=120')
  res.setHeader('Content-Type', 'application/json')
  return res.status(200).json({ articles: deduped.slice(0, 10) })
}

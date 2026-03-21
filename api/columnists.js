// api/columnists.js — Joel Sherman (NY Post) & John Harper (SNY)

const FEEDS = [
  { url: 'https://nypost.com/author/joel-sherman/feed/', source: 'NY Post', author: 'Joel Sherman' },
  { url: 'https://sny.tv/author/john-harper/feed/', source: 'SNY', author: 'John Harper' },
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
    items.push({ title, link, pubDate })
  }
  return items
}

async function fetchFeed(feed) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 7000)
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
    return parseItems(xml).map(a => ({ ...a, source: feed.source, author: feed.author }))
  } catch {
    return []
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60')

  const settled = await Promise.allSettled(FEEDS.map(fetchFeed))
  const all = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  all.sort((a, b) => {
    if (!a.pubDate && !b.pubDate) return 0
    if (!a.pubDate) return 1
    if (!b.pubDate) return -1
    return new Date(b.pubDate) - new Date(a.pubDate)
  })

  res.status(200).json({ articles: all.slice(0, 10) })
}

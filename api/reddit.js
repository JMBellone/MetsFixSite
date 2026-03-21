// api/reddit.js — /r/NewYorkMets newest posts via RSS

function decode(str) {
  return (str || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseAtom(xml) {
  const items = []
  const re = /<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi
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
    const linkMatch = /<link[^>]+href=["']([^"']+)["'][^>]*>/i.exec(block)
    const link = linkMatch ? linkMatch[1] : decode(get('id'))
    const pubStr = get('updated') || get('published') || ''
    const author = decode(get('name') || get('author'))

    if (!title || !link) continue
    const tl = title.toLowerCase()
    if (tl.includes('game thread')) continue
    if (tl.includes('post game thread')) continue

    let pubDate = null
    if (pubStr) {
      const d = new Date(pubStr)
      if (!isNaN(d.getTime())) pubDate = d.toISOString()
    }

    items.push({ title, link, pubDate, author })
  }
  return items
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60')

  const urls = [
    'https://www.reddit.com/r/NewYorkMets/new.rss?limit=15',
    'https://old.reddit.com/r/NewYorkMets/new.rss?limit=15',
  ]

  for (const url of urls) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
      })
      clearTimeout(timeout)
      if (!response.ok) continue
      const xml = await response.text()
      const posts = parseAtom(xml).slice(0, 5).map((p, i) => ({ ...p, id: `reddit-${i}` }))
      if (posts.length > 0) {
        return res.status(200).json({ posts })
      }
    } catch (err) {
      console.warn(`[reddit] ${url} failed:`, err.message)
    }
  }

  return res.status(200).json({ posts: [] })
}

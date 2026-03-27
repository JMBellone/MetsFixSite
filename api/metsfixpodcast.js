const FEED_URL = 'https://api.substack.com/feed/podcast/174126/private/a3405160-c4c4-4b2e-9d28-13b1fea6dd8b.rss'

export default async function handler(req, res) {
  try {
    const feedRes = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, application/xml, */*' },
    })
    if (!feedRes.ok) throw new Error(`HTTP ${feedRes.status}`)
    const xml = await feedRes.text()

    const itemMatch = /<item>([\s\S]*?)<\/item>/i.exec(xml)
    if (!itemMatch) return res.status(200).json({ latest: null })

    const block = itemMatch[1]

    const get = (tag) => {
      const cdata = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i').exec(block)
      if (cdata) return cdata[1].trim()
      const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block)
      return plain ? plain[1].trim() : ''
    }

    const title = get('title')
    const link = get('link') || (/<guid[^>]*>([^<]+)<\/guid>/i.exec(block) || [])[1] || ''
    const pubDate = get('pubDate')

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
    return res.status(200).json({ latest: { title, link, pubDate } })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

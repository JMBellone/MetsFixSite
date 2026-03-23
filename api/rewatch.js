const INTRO_URL = 'https://1986-mets-rewatch.beehiiv.com/p/1986-mets-rewatch-newsletter-an-introduction'
const SITEMAP_URL = 'https://1986-mets-rewatch.beehiiv.com/sitemap.xml'

export default async function handler(req, res) {
  try {
    const sitemapRes = await fetch(SITEMAP_URL)
    const xml = await sitemapRes.text()

    // Parse all /p/ URLs with lastmod, excluding the static intro
    const entries = []
    const urlRegex = /<url>([\s\S]*?)<\/url>/g
    let match
    while ((match = urlRegex.exec(xml)) !== null) {
      const block = match[1]
      const loc = (block.match(/<loc>(.*?)<\/loc>/) || [])[1]
      const lastmod = (block.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1]
      if (loc && loc.includes('/p/') && loc !== INTRO_URL) {
        entries.push({ url: loc, lastmod: lastmod || '1970-01-01' })
      }
    }

    entries.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod))
    const latestEntry = entries[0]

    let latest = null
    if (latestEntry) {
      const articleRes = await fetch(latestEntry.url)
      const html = await articleRes.text()
      const titleMatch =
        html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/) ||
        html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/)
      const title = titleMatch
        ? titleMatch[1]
        : latestEntry.url.split('/p/')[1].replace(/-/g, ' ')
      latest = { title, url: latestEntry.url, pubDate: latestEntry.lastmod }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.json({ latest })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

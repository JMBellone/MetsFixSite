// api/fastcast.js — Latest MLB FastCast video from mlb.com/video/topic/fastcast

function decodeHtml(str) {
  return str
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')
  res.setHeader('Content-Type', 'application/json')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const pageRes = await fetch('https://www.mlb.com/video/topic/fastcast', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    clearTimeout(timeout)

    if (!pageRes.ok) return res.status(200).json({ video: null })
    const html = await pageRes.text()

    // Find the first href pointing to a fastcast video slug
    const hrefRe = /href="(\/video\/(fastcast[-a-z0-9]+))"/i
    const hrefMatch = hrefRe.exec(html)
    if (!hrefMatch) return res.status(200).json({ video: null })

    const link = `https://www.mlb.com${hrefMatch[1]}`
    const slug = hrefMatch[2]
    const hrefPos = hrefMatch.index

    // Scan forward from the href for the next <img tag and extract alt + src
    const afterHref = html.slice(hrefPos, hrefPos + 5000)
    const imgRe = /<img\s[^>]*src="(https:\/\/img\.mlbstatic\.com\/[^"]+)"[^>]*>/i
    const imgAltRe = /<img\s[^>]*alt="([^"]*)"[^>]*src="https:\/\/img\.mlbstatic\.com[^"]*"[^>]*>/i

    let thumbnail = null
    let title = slug.replace(/^fastcast-/, 'FastCast: ').replace(/-x[a-z0-9]+$/, '').replace(/-/g, ' ')

    const imgMatch = imgRe.exec(afterHref)
    if (imgMatch) thumbnail = imgMatch[1]

    const altMatch = imgAltRe.exec(afterHref)
    if (altMatch) title = decodeHtml(altMatch[1])

    // If alt wasn't in the same tag, try grabbing alt= from the img block
    if (!altMatch && imgMatch) {
      const imgTagStart = afterHref.lastIndexOf('<img', afterHref.indexOf(imgMatch[1]))
      const imgTagEnd = afterHref.indexOf('>', imgTagStart)
      const imgTag = afterHref.slice(imgTagStart, imgTagEnd + 1)
      const altInTag = /alt="([^"]*)"/.exec(imgTag)
      if (altInTag) title = decodeHtml(altInTag[1])
    }

    return res.status(200).json({ video: { slug, title, thumbnail, link } })
  } catch (e) {
    console.warn('[fastcast]', e.message)
    return res.status(200).json({ video: null })
  }
}

// api/fastcast.js — Latest MLB FastCast video from mlb.com/video/topic/fastcast

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

    // Try __NEXT_DATA__ first (Next.js embeds all page data as JSON)
    const nextDataMatch = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html)
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const videos = findVideosInNextData(nextData)
        if (videos.length > 0) {
          return res.status(200).json({ video: videos[0] })
        }
      } catch (_) {
        // fall through to HTML scraping
      }
    }

    // Fallback: parse HTML links to /video/fastcast-*
    // Pattern: <a href="/video/{slug}">...<img alt="{title}" src="{thumb}">
    const videoBlockRe = /<a[^>]+href="(\/video\/(fastcast[^"]+))"[^>]*>([\s\S]{0,1200}?)<\/a>/gi
    let match
    while ((match = videoBlockRe.exec(html)) !== null) {
      const [, link, slug, block] = match
      const titleMatch = /alt="([^"]+)"/i.exec(block)
      const thumbMatch = /src="(https:\/\/img\.mlbstatic\.com\/[^"]+)"/i.exec(block)
      if (titleMatch && thumbMatch) {
        return res.status(200).json({
          video: {
            slug,
            title: titleMatch[1],
            thumbnail: thumbMatch[1],
            link: `https://www.mlb.com${link}`,
          },
        })
      }
    }

    // Second fallback: look for slug + nearby thumbnail in raw HTML
    const slugRe = /\/video\/(fastcast[-a-z0-9]+)/i
    const slugMatch = slugRe.exec(html)
    if (slugMatch) {
      const slug = slugMatch[1]
      const thumbRe = /src="(https:\/\/img\.mlbstatic\.com\/[^"]+)"/i
      const thumbMatch = thumbRe.exec(html)
      return res.status(200).json({
        video: {
          slug,
          title: 'MLB FastCast',
          thumbnail: thumbMatch ? thumbMatch[1] : null,
          link: `https://www.mlb.com/video/${slug}`,
        },
      })
    }

    return res.status(200).json({ video: null })
  } catch (e) {
    console.warn('[fastcast]', e.message)
    return res.status(200).json({ video: null })
  }
}

function findVideosInNextData(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results
  if (Array.isArray(obj)) {
    obj.forEach(item => findVideosInNextData(item, results))
    return results
  }
  // Look for video objects with a slug that starts with "fastcast"
  const slug = obj.slug || obj.videoId || obj.id || ''
  if (typeof slug === 'string' && slug.startsWith('fastcast')) {
    const title = obj.title || obj.headline || obj.blurb || 'MLB FastCast'
    // Find best thumbnail
    let thumbnail = null
    const cuts = obj.image?.cuts || obj.thumbnail?.cuts || obj.keywordsAll?.find?.(k => k.type === 'thumbnail')?.cuts
    if (cuts && typeof cuts === 'object') {
      const sizes = Object.values(cuts)
      const best = sizes.find(c => c?.width >= 600) || sizes[0]
      thumbnail = best?.src || best?.url || null
    }
    if (!thumbnail) {
      thumbnail = obj.image?.src || obj.thumbnail?.src || obj.thumbnailUrl || null
    }
    results.push({
      slug,
      title: typeof title === 'string' ? title : title?.default || 'MLB FastCast',
      thumbnail,
      link: `https://www.mlb.com/video/${slug}`,
    })
    return results
  }
  Object.values(obj).forEach(val => findVideosInNextData(val, results))
  return results
}

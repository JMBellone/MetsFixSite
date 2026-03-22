// api/opponent.js — 3 most recent MLB.com articles about the Mets' next opponent

const METS_ID = 121

function decodeHtmlEntities(str) {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&[a-z]+;/gi, '')
}

function stripTags(str) {
  if (!str) return ''
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseRSS(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const get = (tag) => {
      const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i')
      const cm = cdataRe.exec(block)
      if (cm) return cm[1].trim()
      const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
      const pm = plainRe.exec(block)
      return pm ? pm[1].trim() : ''
    }

    const title = decodeHtmlEntities(stripTags(get('title')))
    const link = decodeHtmlEntities(stripTags(get('link'))) || decodeHtmlEntities(stripTags(get('guid')))
    if (!title || !link) continue

    const pubDateStr = get('pubDate') || get('published') || ''
    let pubDate = null
    if (pubDateStr) {
      const d = new Date(pubDateStr)
      if (!isNaN(d.getTime())) pubDate = d
    }

    let image = null
    const mlbImage = /<image[^>]+href=["']([^"']+)["'][^>]*/i.exec(block)
    const mediaContent = /<media:content[^>]+url=["']([^"']+)["'][^>]*/i.exec(block)
    const mediaThumbnail = /<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*/i.exec(block)
    const isImageUrl = (u) => u && !u.includes('youtube.com') && !u.includes('1x1') && !u.startsWith('data:')
    if (mlbImage && isImageUrl(mlbImage[1])) image = mlbImage[1]
    else if (mediaContent && isImageUrl(mediaContent[1])) image = mediaContent[1]
    else if (mediaThumbnail && isImageUrl(mediaThumbnail[1])) image = mediaThumbnail[1]

    items.push({ title, link, pubDate, image })
  }
  return items
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400')
  res.setHeader('Content-Type', 'application/json')

  try {
    const today = new Date()
    const openingDay = new Date('2026-03-26')
    const startDate = today < openingDay ? openingDay : today
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)
    const fmt = d => d.toISOString().split('T')[0]

    // Get next upcoming regular season game
    const schedRes = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?teamId=${METS_ID}&sportId=1&gameType=R&startDate=${fmt(startDate)}&endDate=${fmt(endDate)}`
    )
    if (!schedRes.ok) return res.status(200).json({ articles: [], opponent: null })
    const schedData = await schedRes.json()

    const games = (schedData.dates || []).flatMap(d => d.games || [])
    const nextGame = games.find(g => g.status.abstractGameState !== 'Final')
    if (!nextGame) return res.status(200).json({ articles: [], opponent: null })

    const metsIsHome = nextGame.teams.home.team.id === METS_ID
    const opponentTeam = metsIsHome ? nextGame.teams.away.team : nextGame.teams.home.team
    const opponentId = opponentTeam.id
    const opponentName = opponentTeam.name

    // Get teamName for MLB.com URL slug (e.g. "Pirates" → "pirates", "Red Sox" → "redsox")
    const teamRes = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/${opponentId}?fields=teams,teamName,name`
    )
    if (!teamRes.ok) return res.status(200).json({ articles: [], opponent: opponentName })
    const teamData = await teamRes.json()
    const teamName = teamData.teams?.[0]?.teamName
    if (!teamName) return res.status(200).json({ articles: [], opponent: opponentName })
    const slug = teamName.toLowerCase().replace(/[-\s]/g, '')

    // Fetch opponent's MLB.com RSS feed
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const feedRes = await fetch(`https://www.mlb.com/${slug}/feeds/news/rss.xml`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    clearTimeout(timeout)
    if (!feedRes.ok) return res.status(200).json({ articles: [], opponent: opponentName })
    const xml = await feedRes.text()

    const articles = parseRSS(xml).slice(0, 3).map(a => ({
      title: a.title,
      link: a.link,
      image: a.image || null,
      pubDate: a.pubDate?.toISOString() || null,
    }))

    return res.status(200).json({ articles, opponent: opponentName })
  } catch (e) {
    console.warn('[opponent]', e.message)
    return res.status(200).json({ articles: [], opponent: null })
  }
}

// api/reddit.js — /r/NewYorkMets newest posts

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch('https://www.reddit.com/r/NewYorkMets/new.json?limit=10', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MetsFixSite/1.0 (mets news aggregator)',
        'Accept': 'application/json',
      },
    })
    clearTimeout(timeout)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()

    const posts = (data?.data?.children || [])
      .map(({ data: p }) => ({
        id: p.id,
        title: p.title,
        link: `https://www.reddit.com${p.permalink}`,
        pubDate: new Date(p.created_utc * 1000).toISOString(),
        score: p.score,
        numComments: p.num_comments,
        flair: p.link_flair_text || null,
      }))
      .filter(p => !p.title.toLowerCase().includes('[game thread]') && !p.title.toLowerCase().includes('[post game]'))
      .slice(0, 5)

    return res.status(200).json({ posts })
  } catch (err) {
    console.warn('[reddit] fetch failed:', err.message)
    return res.status(200).json({ posts: [] })
  }
}

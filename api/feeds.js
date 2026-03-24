// api/feeds.js — Mets news aggregator
// Fetches all Mets RSS sources, filters to last 96h, sorts by recency.

const SEVENTY_TWO_HOURS_MS = 96 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const FEEDS = [
  // The Metropolitan Substack — 30-day window (newsletters are infrequent)
  {
    url: 'https://themetropolitan.substack.com/feed',
    source: 'The Metropolitan',
    team: 'metropolitan',
    paywalled: false,
    authority: 4,
    cutoffMs: THIRTY_DAYS_MS,
  },
  {
    url: 'https://www.mlb.com/mets/feeds/news/rss.xml',
    source: 'MLB.com',
    team: 'mets',
    paywalled: false,
    authority: 4,
  },
  // The Athletic — 7-day window to avoid stale cache gaps
  {
    url: 'https://www.nytimes.com/athletic/rss/tag/new-york-mets/',
    source: 'The Athletic',
    team: 'mets',
    paywalled: true,
    authority: 3,
    cutoffMs: SEVEN_DAYS_MS,
  },
  {
    url: 'https://sny.tv/mets-feed',
    source: 'SNY',
    team: 'mets',
    paywalled: false,
    authority: 4,
  },
  {
    url: 'https://nypost.com/tag/new-york-mets/feed/',
    source: 'NY Post',
    team: 'mets',
    paywalled: false,
    authority: 2,
  },
  {
    url: 'https://blogs.fangraphs.com/category/teams/mets/feed',
    source: 'FanGraphs',
    team: 'mets',
    paywalled: false,
    authority: 2,
  },
  {
    url: 'https://www.espn.com/espn/rss/mlb/news',
    source: 'ESPN',
    team: 'mets',
    paywalled: false,
    authority: 2,
    // Keep Jeff Passan always; keep Castillo / Schoenfield / Gonzalez only when Mets are mentioned
    filterFn: (item) => {
      const creator = (item.creator || '').toLowerCase()
      if (creator.includes('jeff passan') || creator.includes('kiley mcdaniel')) return true
      const mentionsMets =
        item.title.toLowerCase().includes('mets') ||
        (item.description || '').toLowerCase().includes('mets')
      return mentionsMets && (
        creator.includes('jorge castillo') ||
        creator.includes('david schoenfield') ||
        creator.includes('alden gonzalez')
      )
    },
  },
  {
    url: 'https://www.newsday.com/api/rss/recent',
    source: 'Newsday',
    team: 'mets',
    paywalled: true,
    authority: 1,
    // General feed — only keep articles that mention Mets
    requiredKeyword: 'mets',
  },
];

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, '');
}

function stripTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractText(value) {
  if (!value) return '';
  if (typeof value === 'string') return decodeHtmlEntities(stripTags(value));
  if (typeof value === 'object' && value._text) return decodeHtmlEntities(stripTags(value._text));
  return decodeHtmlEntities(stripTags(String(value)));
}

function normalizeTimezone(str) {
  return str
    .replace(/\bEDT\b/, '-0400')
    .replace(/\bEST\b/, '-0500')
    .replace(/\bCDT\b/, '-0500')
    .replace(/\bCST\b/, '-0600')
    .replace(/\bMDT\b/, '-0600')
    .replace(/\bMST\b/, '-0700')
    .replace(/\bPDT\b/, '-0700')
    .replace(/\bPST\b/, '-0800');
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const get = (tag) => {
      const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
      const cdataMatch = cdataRe.exec(block);
      if (cdataMatch) return cdataMatch[1].trim();
      const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const plainMatch = plainRe.exec(block);
      return plainMatch ? plainMatch[1].trim() : '';
    };

    const title = extractText(get('title'));
    let link = extractText(get('link')) || extractText(get('guid'));
    if (!link) {
      const atomLink = /<link[^>]+href=["']([^"']+)["'][^>]*>/i.exec(block);
      if (atomLink) link = atomLink[1];
    }

    const pubDateStr = get('pubDate') || get('published') || get('updated') || get('dc:date') || '';
    const description = extractText(get('description') || get('summary') || get('content:encoded') || get('media:description'));

    if (!title || !link) continue;

    let pubDate = null;
    if (pubDateStr) {
      const d = new Date(normalizeTimezone(pubDateStr));
      if (!isNaN(d.getTime())) pubDate = d;
    }

    let image = null;
    const mediaContent = /<media:content[^>]+url=["']([^"']+)["'][^>]*>/i.exec(block);
    const mediaThumbnail = /<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/i.exec(block);
    const enclosure = /<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image[^"']*["'][^>]*>/i.exec(block)
      || /<enclosure[^>]+type=["']image[^"']*["'][^>]*url=["']([^"']+)["'][^>]*>/i.exec(block);
    const mlbImage = /<image[^>]+href=["']([^"']+)["'][^>]*>/i.exec(block);
    const cdataContent = block.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
    const cdataImg = /<img[^>]+src=["']([^"']+)["'][^>]*>/i.exec(cdataContent);

    const isImageUrl = (url) => url && !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('pixel') && !url.includes('1x1') && !url.startsWith('data:');

    if (mediaContent && isImageUrl(mediaContent[1])) image = mediaContent[1];
    else if (mediaThumbnail && isImageUrl(mediaThumbnail[1])) image = mediaThumbnail[1];
    else if (enclosure && isImageUrl(enclosure[1])) image = enclosure[1];
    else if (mlbImage && isImageUrl(mlbImage[1])) image = mlbImage[1];
    else if (cdataImg && isImageUrl(cdataImg[1])) image = cdataImg[1];

    const creator = get('dc:creator') || get('author') || ''
    items.push({ title, link, pubDate, description, image, creator });
  }

  return items;
}

async function fetchFeed(feedConfig) {
  const { url, source, paywalled, authority } = feedConfig;
  const results = [];

  let xml;
  let fetchError = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=300',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (err) {
    fetchError = err.message;
    console.warn(`[feeds] Failed to fetch ${source}: ${err.message}`);
    return { articles: results, error: fetchError, source };
  }

  const cutoff = Date.now() - (feedConfig.cutoffMs || SEVENTY_TWO_HOURS_MS);
  const items = parseRSS(xml);
  let filtered = 0;

  for (const item of items) {
    if (!item.pubDate) continue;
    if (item.pubDate.getTime() < cutoff) { filtered++; continue; }
    if (item.link && item.link.includes('mets-injuries-and-roster-moves')) continue;
    if (feedConfig.requiredKeyword) {
      const kw = feedConfig.requiredKeyword.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(kw);
      const inLink  = item.link.toLowerCase().includes(kw);
      if (!inTitle && !inLink) continue;
    }
    if (feedConfig.filterFn && !feedConfig.filterFn(item)) continue;

    results.push({
      id: `${source}-${Buffer.from(item.link).toString('base64').replace(/=/g, '')}`,
      team: feedConfig.team || 'mets',
      source,
      paywalled,
      authority,
      title: item.title,
      description: item.description || '',
      image: item.image || null,
      link: item.link,
      pubDate: item.pubDate.toISOString(),
      creator: item.creator || '',
    });
  }

  return { articles: results, error: null, source, total: items.length, kept: results.length, filtered };
}

// Sources whose RSS feeds omit images — fetch og:image from the article page as fallback
const OG_IMAGE_SOURCES = new Set(['Newsday', 'The Athletic', 'ESPN'])

async function fetchOgImage(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const html = await res.text()
    const match =
      html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'that', 'this', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i',
  'his', 'her', 'their', 'our', 'my', 'as', 'with', 'from', 'by', 'about',
  'into', 'after', 'who', 'which', 'what', 'him', 'hes', 'not', 'up',
  'out', 'if', 'how', 'all', 'just', 'now', 'more', 'than', 'also', 'off',
]);

function tokenizeTitle(title) {
  return new Set(
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

const SIMILARITY_THRESHOLD = 0.35;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const settled = await Promise.allSettled(FEEDS.map(fetchFeed));
  const feedResults = settled.map((r) => (r.status === 'fulfilled' ? r.value : { articles: [], error: 'Promise rejected', source: '?' }));
  const allArticles = feedResults.flatMap((r) => r.articles);

  const feedDiagnostics = feedResults.map(({ source, error, total, kept, filtered }) => ({
    source, error: error || null, total, kept, filtered,
  }));

  // Deduplicate by semantic title similarity (Jaccard ≥ 0.35 = same story).
  // Sort by authority DESC first so highest-quality source wins the collision.
  const sortedForDedup = [...allArticles].sort((a, b) => {
    if (b.authority !== a.authority) return b.authority - a.authority;
    return new Date(b.pubDate) - new Date(a.pubDate);
  });

  const keptTokens = [];
  const deduped = [];
  for (const article of sortedForDedup) {
    const tokens = tokenizeTitle(article.title);
    const isDupe = keptTokens.some(kt => jaccardSimilarity(tokens, kt) >= SIMILARITY_THRESHOLD);
    if (!isDupe) {
      deduped.push(article);
      keptTokens.push(tokens);
    }
  }

  deduped.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Fetch og:image for sources whose feeds don't include images (up to 15, 5 at a time)
  const needsImage = deduped.filter(a => !a.image && OG_IMAGE_SOURCES.has(a.source)).slice(0, 15);
  for (let i = 0; i < needsImage.length; i += 5) {
    const batch = needsImage.slice(i, i + 5);
    const images = await Promise.all(batch.map(a => fetchOgImage(a.link)));
    batch.forEach((a, j) => { if (images[j]) a.image = images[j]; });
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ articles: deduped, feedDiagnostics });
};

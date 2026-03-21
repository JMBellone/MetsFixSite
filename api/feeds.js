// api/feeds.js — Mets news aggregator
// Fetches all Mets RSS sources, filters to last 72h, sorts by recency.

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const FEEDS = [
  // The Metropolitan Substack — 30-day window (newsletters are infrequent)
  {
    url: 'https://themetropolitan.substack.com/feed',
    source: 'The Metropolitan',
    team: 'metropolitan',
    paywalled: false,
    authority: 3,
    cutoffMs: THIRTY_DAYS_MS,
  },
  {
    url: 'https://www.mlb.com/mets/feeds/news/rss.xml',
    source: 'MLB.com',
    team: 'mets',
    paywalled: false,
    authority: 3,
  },
  {
    url: 'https://www.nytimes.com/athletic/rss/tag/new-york-mets/',
    source: 'The Athletic',
    team: 'mets',
    paywalled: true,
    authority: 3,
  },
  {
    url: 'https://sny.tv/mets-feed',
    source: 'SNY',
    team: 'mets',
    paywalled: false,
    authority: 2,
  },
  {
    url: 'https://nypost.com/tag/new-york-mets/feed/',
    source: 'NY Post',
    team: 'mets',
    paywalled: false,
    authority: 1,
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

    items.push({ title, link, pubDate, description, image });
  }

  return items;
}

async function fetchFeed(feedConfig) {
  const { url, source, paywalled, authority } = feedConfig;
  const results = [];

  let xml;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (err) {
    console.warn(`[feeds] Failed to fetch ${source}: ${err.message}`);
    return results;
  }

  const cutoff = Date.now() - (feedConfig.cutoffMs || SEVENTY_TWO_HOURS_MS);
  const items = parseRSS(xml);

  for (const item of items) {
    if (!item.pubDate) continue;
    if (item.pubDate.getTime() < cutoff) continue;
    if (item.link && item.link.includes('mets-injuries-and-roster-moves')) continue;

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
    });
  }

  return results;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const settled = await Promise.allSettled(FEEDS.map(fetchFeed));
  const allArticles = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // Deduplicate by title (case-insensitive prefix match)
  const seen = new Set();
  const deduped = allArticles.filter(a => {
    const key = a.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ articles: deduped });
};

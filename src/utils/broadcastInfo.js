export const BROADCAST_MAP = {
  'SNY':         { label: 'SNY',           domain: 'sny.tv',        href: 'https://www.mlb.com/live-stream-games/subscribe' },
  'WPIX':        { label: 'WPIX (MLB.TV)', domain: 'wpix.com',      href: 'https://www.mlb.com/live-stream-games/subscribe' },
  'ESPN':        { label: 'ESPN',          domain: 'espn.com',      href: 'https://www.espn.com/watch/' },
  'ESPN2':       { label: 'ESPN2',         domain: 'espn.com',      href: 'https://www.espn.com/watch/' },
  'NBC':         { label: 'NBC',           domain: 'nbc.com',       href: 'https://www.peacocktv.com' },
  'FS1':         { label: 'FS1',           domain: 'foxsports.com', href: 'https://www.foxsports.com/live' },
  'TBS':         { label: 'TBS',           domain: 'tbs.com',       href: 'https://www.tbs.com/watchtbs' },
  'Apple TV+':   { label: 'Apple TV+',     domain: 'tv.apple.com',  href: 'https://tv.apple.com' },
  'Peacock':     { label: 'Peacock',       domain: 'peacocktv.com', href: 'https://www.peacocktv.com' },
  'MLB Network': { label: 'MLB Network',   domain: 'mlb.com',       href: 'https://www.mlb.com/network' },
  'MLB.TV':      { label: 'MLB.TV',        domain: 'mlb.com',       href: 'https://www.mlb.com/live-stream-games/subscribe' },
}

export function broadcastInfo(raw) {
  if (!raw) return null
  return BROADCAST_MAP[raw] || { label: raw, domain: null, href: null }
}

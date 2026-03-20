// api/standings.js — MLB NL East standings via ESPN public API

function parseDivision(div) {
  const entries = div.standings?.entries || [];
  return entries.map(entry => {
    const stats = {};
    for (const s of entry.stats || []) stats[s.name] = s;
    return {
      abbreviation: entry.team?.abbreviation || '',
      name: entry.team?.shortDisplayName || entry.team?.displayName || '',
      logo: entry.team?.logos?.[0]?.href || '',
      wins: Math.round(stats.wins?.value ?? 0),
      losses: Math.round(stats.losses?.value ?? 0),
      pct: stats.winPercent?.displayValue || stats.leagueWinPercent?.displayValue || '',
      gamesBehind: stats.gamesBehind?.displayValue || '-',
      homeRecord: (stats.Home || stats.home)?.displayValue || '',
      roadRecord: (stats.Road || stats.road || stats.Away || stats.away)?.displayValue || '',
      streak: stats.streak?.displayValue || '',
    };
  }).sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/v2/sports/baseball/mlb/standings',
      { signal: AbortSignal.timeout(8000), headers: { 'Accept': 'application/json' } }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // MLB structure: data.children = [AL, NL], each with .children = [divisions]
    const nlLeague = data.children?.find(c => c.name?.toLowerCase().includes('national'));
    const nlEastDiv = nlLeague?.children?.find(c => c.name?.toLowerCase().includes('east'));

    if (!nlEastDiv) throw new Error('NL East division not found in API response');

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ nlEast: parseDivision(nlEastDiv) });
  } catch (err) {
    console.error('[standings]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

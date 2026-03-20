// api/standings.js — MLB standings via MLB Stats API (all 6 divisions + WCGB)

const DIVISION_ORDER = {
  nl: [204, 205, 203], // NL East, Central, West
  al: [201, 202, 200], // AL East, Central, West
};

const DIVISION_NAMES = {
  204: 'NL East', 205: 'NL Central', 203: 'NL West',
  201: 'AL East', 202: 'AL Central', 200: 'AL West',
};

const TEAM_META = {
  // NL East
  121: { abbr: 'NYM', name: 'Mets',      logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png' },
  143: { abbr: 'PHI', name: 'Phillies',  logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png' },
  144: { abbr: 'ATL', name: 'Braves',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png' },
  146: { abbr: 'MIA', name: 'Marlins',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mia.png' },
  120: { abbr: 'WSH', name: 'Nationals', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png' },
  // NL Central
  112: { abbr: 'CHC', name: 'Cubs',      logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chc.png' },
  113: { abbr: 'CIN', name: 'Reds',      logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cin.png' },
  158: { abbr: 'MIL', name: 'Brewers',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mil.png' },
  134: { abbr: 'PIT', name: 'Pirates',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/pit.png' },
  138: { abbr: 'STL', name: 'Cardinals', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/stl.png' },
  // NL West
  109: { abbr: 'ARI', name: 'D-backs',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/ari.png' },
  115: { abbr: 'COL', name: 'Rockies',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/col.png' },
  119: { abbr: 'LAD', name: 'Dodgers',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png' },
  135: { abbr: 'SDP', name: 'Padres',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png' },
  137: { abbr: 'SFG', name: 'Giants',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sf.png' },
  // AL East
  110: { abbr: 'BAL', name: 'Orioles',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bal.png' },
  111: { abbr: 'BOS', name: 'Red Sox',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png' },
  147: { abbr: 'NYY', name: 'Yankees',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png' },
  139: { abbr: 'TBR', name: 'Rays',      logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png' },
  141: { abbr: 'TOR', name: 'Blue Jays', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tor.png' },
  // AL Central
  145: { abbr: 'CWS', name: 'White Sox', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chw.png' },
  114: { abbr: 'CLE', name: 'Guardians', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cle.png' },
  116: { abbr: 'DET', name: 'Tigers',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/det.png' },
  118: { abbr: 'KCR', name: 'Royals',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/kc.png' },
  142: { abbr: 'MIN', name: 'Twins',     logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/min.png' },
  // AL West
  117: { abbr: 'HOU', name: 'Astros',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png' },
  108: { abbr: 'LAA', name: 'Angels',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/laa.png' },
  133: { abbr: 'OAK', name: 'Athletics', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/oak.png' },
  136: { abbr: 'SEA', name: 'Mariners',  logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png' },
  140: { abbr: 'TEX', name: 'Rangers',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tex.png' },
};

function formatGB(val) {
  if (!val || val === '-') return '—';
  return val;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const season = new Date().getFullYear();

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason`,
      { signal: AbortSignal.timeout(8000), headers: { 'Accept': 'application/json' } }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // Index records by division ID
    const byDivision = {};
    for (const record of data.records || []) {
      const divId = record.division?.id;
      if (!divId) continue;
      byDivision[divId] = record.teamRecords.map(tr => {
        const meta = TEAM_META[tr.team.id] || { abbr: '', name: tr.team.name, logo: '' };
        return {
          abbreviation: meta.abbr,
          name: meta.name,
          logo: meta.logo,
          wins: tr.wins,
          losses: tr.losses,
          pct: tr.leagueRecord?.pct || '',
          gamesBehind: formatGB(tr.gamesBack),
          wildCardGB: formatGB(tr.wildCardGamesBack),
          streak: tr.streak?.streakCode || '',
        };
      });
    }

    const buildLeague = (order) =>
      order.map(divId => ({
        name: DIVISION_NAMES[divId],
        teams: byDivision[divId] || [],
      }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      nl: buildLeague(DIVISION_ORDER.nl),
      al: buildLeague(DIVISION_ORDER.al),
    });
  } catch (err) {
    console.error('[standings]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

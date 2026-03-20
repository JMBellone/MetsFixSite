// api/standings.js — MLB NL East standings via MLB Stats API

const NL_EAST_DIVISION_ID = 204;

const TEAM_META = {
  121: { abbr: 'NYM', name: 'Mets',      logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png' },
  143: { abbr: 'PHI', name: 'Phillies',  logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png' },
  144: { abbr: 'ATL', name: 'Braves',    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png' },
  146: { abbr: 'MIA', name: 'Marlins',   logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mia.png' },
  120: { abbr: 'WSH', name: 'Nationals', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png' },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const season = new Date().getFullYear();

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/standings?leagueId=104&season=${season}&standingsTypes=regularSeason`,
      { signal: AbortSignal.timeout(8000), headers: { 'Accept': 'application/json' } }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const nlEastRecord = data.records?.find(r => r.division?.id === NL_EAST_DIVISION_ID);
    if (!nlEastRecord) throw new Error('NL East not found in API response');

    const nlEast = nlEastRecord.teamRecords.map(tr => {
      const meta = TEAM_META[tr.team.id] || { abbr: '', name: tr.team.name, logo: '' };
      return {
        abbreviation: meta.abbr,
        name: meta.name,
        logo: meta.logo,
        wins: tr.wins,
        losses: tr.losses,
        pct: tr.leagueRecord?.pct || '',
        gamesBehind: tr.gamesBack === '-' ? '—' : tr.gamesBack,
        streak: tr.streak?.streakCode || '',
      };
    });

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ nlEast });
  } catch (err) {
    console.error('[standings]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

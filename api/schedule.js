// api/schedule.js — Mets upcoming schedule via ESPN public API
// ESPN MLB team ID for the New York Mets is 21

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const r = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/21/schedule',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );
    if (!r.ok) throw new Error(`ESPN API error ${r.status}`);
    const data = await r.json();

    const events = data.events || [];
    const upcoming = events
      .filter(e => e.competitions?.[0]?.status?.type?.state === 'pre')
      .slice(0, 10)
      .map(e => {
        const comp = e.competitions[0];
        const ours = comp.competitors.find(c => c.team.abbreviation === 'NYM');
        const opponent = comp.competitors.find(c => c.team.abbreviation !== 'NYM');
        const broadcast = comp.broadcasts?.[0]?.names?.[0] || null;
        const venue = comp.venue?.fullName || null;
        const opponentTeam = opponent?.team || {};
        const opponentLogo = opponentTeam.logo || opponentTeam.logos?.[0]?.href || null;

        const metsProb = ours?.probables?.[0]?.athlete?.shortName || null
        const oppProb  = opponent?.probables?.[0]?.athlete?.shortName || null

        return {
          id: e.id,
          date: e.date,
          opponent: opponentTeam.displayName || '',
          opponentAbbr: opponentTeam.abbreviation || '',
          opponentLogo,
          isHome: ours?.homeAway === 'home',
          broadcast,
          venue,
          metsStarter: metsProb,
          oppStarter: oppProb,
        };
      });

    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ games: upcoming });
  } catch (err) {
    console.error('[schedule]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

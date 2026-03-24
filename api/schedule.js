// api/schedule.js — Mets upcoming schedule via ESPN public API
// ESPN MLB team ID for the New York Mets is 21

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const r = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/21/schedule?season=2026&seasontype=2',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );
    if (!r.ok) throw new Error(`ESPN API error ${r.status}`);
    const data = await r.json();

    const OPENING_DAY_KEY = '2026-03-26';
    const events = data.events || [];
    const upcoming = events
      .filter(e => {
        if (e.competitions?.[0]?.status?.type?.state !== 'pre') return false;
        const dateKey = new Date(e.date).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        return dateKey >= OPENING_DAY_KEY;
      })
      .slice(0, 10)
      .map(e => {
        const comp = e.competitions[0];
        const ours = comp.competitors.find(c => c.team.abbreviation === 'NYM');
        const opponent = comp.competitors.find(c => c.team.abbreviation !== 'NYM');
        // Pick best broadcast: national TV → local TV (SNY/WPIX) → streaming (non-MLB.TV) → MLB.TV
        const bcs = comp.broadcasts || []
        const nationalTV  = bcs.find(b => b.type?.shortName === 'TV'        && b.market?.type === 'National')
        const localTV     = bcs.find(b => b.type?.shortName === 'TV'        && b.market?.type !== 'National')
        const streaming   = bcs.find(b => b.type?.shortName === 'Streaming' && b.media?.shortName !== 'MLB.TV')
        const mlbTV       = bcs.find(b => b.media?.shortName === 'MLB.TV')
        const broadcast   = (nationalTV || localTV || streaming || mlbTV)?.media?.shortName || null
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

    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ games: upcoming });
  } catch (err) {
    console.error('[schedule]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

function faviconUrl(link) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(link).hostname}&sz=32` } catch { return '' }
}

const ARTICLES = [
  {
    title: 'New York Mets Top 45 Prospects',
    link: 'https://blogs.fangraphs.com/new-york-mets-top-45-prospects-2/',
    source: 'FanGraphs',
  },
  {
    title: 'Mets Top 30 Prospects for 2026 Season',
    link: 'https://sny.tv/articles/mets-top-30-prospects-2026-season',
    source: 'SNY',
  },
]

export default function ProspectArticlesCard() {
  return (
    <div className="team-news-card prospect-articles-card">
      <div className="latest-updates-header">
        <span className="latest-updates-title">Learn about this year's top prospects</span>
      </div>
      {ARTICLES.map((a, i) => (
        <div key={a.link}>
          {i > 0 && <div className="team-news-divider" />}
          <div className="sfe-headline-article">
            <div className="team-news-item-wrap">
              <a href={a.link} target="_blank" rel="noopener noreferrer" className="sfe-headline-link mlbnews-headline-row">
                <img src={faviconUrl(a.link)} alt="" className="mlbnews-article-icon"
                  onError={e => { e.currentTarget.style.display = 'none' }} />
                <span className="sfe-headline-title">{a.title}</span>
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

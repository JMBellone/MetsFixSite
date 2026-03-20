const SOURCE_DOMAINS = {
  'The Athletic': 'theathletic.com',
  'MLB.com': 'mlb.com',
  'SNY': 'sny.tv',
  'NY Post': 'nypost.com',
  'Mets Merized': 'metsmerizedonline.com',
  'Amazin Avenue': 'amazinavenue.com',
}

function faviconUrl(source) {
  const domain = SOURCE_DOMAINS[source]
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

function timeAgo(pubDate) {
  if (!pubDate) return ''
  const diffMs = Date.now() - new Date(pubDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function ArticleCard({ article, isRead, isNew, onRead, onRemove }) {
  return (
    <article className={`card${isRead ? ' card--read' : ''}`}>
      <button
        className="card-remove"
        onClick={e => { e.preventDefault(); onRemove?.(article.id) }}
        aria-label="Remove article"
      >✕</button>
      <div className="card-layout">
        {article.image && (
          <img
            className="card-image"
            src={article.image}
            alt=""
            loading="lazy"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <div className="card-inner">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="card-title"
            onClick={() => onRead(article.id)}
          >
            {article.title}
          </a>
          <div className="card-meta">
            <span className="source-label">
              {faviconUrl(article.source) && (
                <img
                  className="source-favicon"
                  src={faviconUrl(article.source)}
                  alt=""
                  width="14"
                  height="14"
                />
              )}
              {article.source}
            </span>
            <span className="time-ago">{timeAgo(article.pubDate)}</span>
            {isNew && !isRead && <span className="new-badge">New</span>}
            {article.paywalled && <span className="paywall-badge">Subscriber</span>}
          </div>
        </div>
      </div>
    </article>
  )
}

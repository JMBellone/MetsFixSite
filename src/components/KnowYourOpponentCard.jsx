function timeAgo(pubDate) {
  if (!pubDate) return ''
  const diffMs = Date.now() - new Date(pubDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function KnowYourOpponentCard({ articles, opponent, opponentAbbr }) {
  if (!articles?.length) return null

  return (
    <div className="mlbnews-card">
      <div className="mlbnews-header">
        {opponentAbbr && (
          <img
            src={`https://a.espncdn.com/i/teamlogos/mlb/500/${opponentAbbr}.png`}
            alt={opponent || ''}
            className="kyo-logo"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <span className="mlbnews-title">Know Your Opponent</span>
        {opponent && <span className="kyo-opponent">{opponent}</span>}
      </div>
      <div className="mlbnews-list">
        {articles.map((a, i) => (
          <a
            key={`${a.link}-${i}`}
            href={a.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mlbnews-row"
          >
            {a.image && (
              <img
                src={a.image}
                alt=""
                className="mlbnews-row-thumb"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <div className="mlbnews-row-body">
              <span className="mlbnews-row-title">{a.title}</span>
              <span className="mlbnews-row-meta">{timeAgo(a.pubDate)} · MLB.com</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

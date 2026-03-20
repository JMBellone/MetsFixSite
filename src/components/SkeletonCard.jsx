import './SkeletonCard.css'

export default function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="sk-image skeleton" />
      <div className="sk-body">
        <div className="skeleton sk-title-1" />
        <div className="skeleton sk-title-2" />
        <div className="sk-meta">
          <div className="skeleton sk-badge" />
          <div className="skeleton sk-time" />
        </div>
      </div>
    </div>
  )
}

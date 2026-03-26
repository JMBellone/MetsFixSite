import StandingsCard from './StandingsCard'
import ScoresCard from './ScoresCard'
import FastCastCard from './FastCastCard'
import './MLBSnapshotCard.css'

const MLB_LOGO = 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png'

export default function MLBSnapshotCard() {
  return (
    <div className="snapshot-card">
      <div className="snapshot-header">
        <img src={MLB_LOGO} alt="MLB" className="snapshot-logo" onError={e => { e.currentTarget.style.display = 'none' }} />
        <span className="snapshot-title">MLB Snapshot</span>
      </div>
      <StandingsCard hideHeader />
      <ScoresCard hideHeader />
      <FastCastCard hideHeader />
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import './AffiliatesCard.css'

function AffiliateRow({ game }) {
  const { name, abbr, isHome, status, inning, inningHalf, startTime, mets, opp } = game

  let statusEl
  if (status === 'live') {
    const half = inningHalf === 'Top' ? 'T' : inningHalf === 'Bottom' ? 'B' : 'M'
    statusEl = (
      <span className="af-status af-status--live">
        <span className="af-live-dot" />
        {half}{inning}
      </span>
    )
  } else if (status === 'final') {
    statusEl = <span className="af-status af-status--final">{inning && inning > 9 ? `F/${inning}` : 'Final'}</span>
  } else if (status === 'postponed') {
    statusEl = <span className="af-status af-status--ppd">PPD</span>
  } else if (status === 'suspended') {
    statusEl = <span className="af-status af-status--ppd">SUSP</span>
  } else {
    statusEl = <span className="af-status af-status--time">{startTime}</span>
  }

  const showScores = status !== 'preview'
  const metsDim = status === 'final' && !mets.win
  const oppDim  = status === 'final' && !opp.win

  return (
    <div className="af-row">
      <div className={`af-affiliate${metsDim ? ' af-dim' : ''}`}>
        <span className="af-badge">{abbr}</span>
        <span className="af-name">{name}</span>
      </div>

      <span className={`af-score${metsDim ? ' af-dim' : ''}`}>
        {showScores ? (mets.score ?? '') : ''}
      </span>

      <div className="af-mid">{statusEl}</div>

      <span className={`af-score af-score--opp${oppDim ? ' af-dim' : ''}`}>
        {showScores ? (opp.score ?? '') : ''}
      </span>

      <div className={`af-opp${oppDim ? ' af-dim' : ''}`}>
        <span className="af-opp-name">{opp.name}</span>
        <span className="af-ha">{isHome ? 'vs' : '@'}</span>
      </div>
    </div>
  )
}

export default function AffiliatesCard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch('/api/affiliates')
      if (!r.ok) return
      const d = await r.json()
      setData(d)
      setLoading(false)
      const isLive = d.games?.some(g => g.status === 'live')
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(fetchData, isLive ? 30000 : 300000)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    return () => clearInterval(intervalRef.current)
  }, [fetchData])

  if (loading || !data?.games?.length) return null

  return (
    <div className="af-card">
      <div className="af-header">
        <span className="af-header-title">AFFILIATES</span>
        <span className="af-header-date">{data.displayLabel}</span>
      </div>
      <div className="af-list">
        {data.games.map(g => <AffiliateRow key={g.affiliateId} game={g} />)}
      </div>
    </div>
  )
}

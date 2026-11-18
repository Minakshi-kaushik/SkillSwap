import { ArrowLeftRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Logo({ compact = false, light = false, to = '/', className = '' }) {
  return <Link className={`brand ${light ? 'brand-light' : ''} ${className}`} to={to} aria-label="SkillSwap home">
    <span className="brand-mark"><ArrowLeftRight size={21} strokeWidth={2.4} /></span>
    <span className="brand-copy"><strong>Skill<span>Swap</span></strong>{!compact && <small>Exchange. Learn. Grow.</small>}</span>
  </Link>
}

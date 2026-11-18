import { ArrowUpRight } from 'lucide-react'

export function PlaceholderPage({ title, description, eyebrow }) {
  return <section className="page-wrap"><div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><span className="status-pill">Foundation preview</span></div><div className="placeholder-card"><div className="placeholder-orb"><ArrowUpRight size={25} /></div><h2>A little more room to grow</h2><p>This page is ready for the next stage of SkillSwap. Its layout and navigation are in place.</p></div></section>
}

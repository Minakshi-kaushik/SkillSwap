import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Code2, Compass, Languages, MessageCircle, Palette, Search, Sparkles, Video, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/common/Button'

const categories = [
  { name: 'All areas', description: 'Browse the possibilities', Icon: Compass, color: 'sage' },
  { name: 'Creative & Design', description: 'Make, imagine, express', Icon: Palette, color: 'peach' },
  { name: 'Technology', description: 'Explore digital skills', Icon: Code2, color: 'sage' },
  { name: 'Languages', description: 'Communicate in new ways', Icon: Languages, color: 'lilac' },
  { name: 'Communication', description: 'Share ideas with clarity', Icon: MessageCircle, color: 'blue' },
  { name: 'Career & Business', description: 'Grow your working toolkit', Icon: BriefcaseBusiness, color: 'peach' },
  { name: 'Practical Skills', description: 'Learn through doing', Icon: Wrench, color: 'sage' },
  { name: 'Arts & Performance', description: 'Find your creative voice', Icon: Video, color: 'lilac' },
  { name: 'Study & Learning', description: 'Build learning habits', Icon: BookOpen, color: 'blue' },
]

export function ExploreSkillsPage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('All areas')
  const visible = useMemo(() => categories.filter(({ name, description }) => {
    const matchesQuery = `${name} ${description}`.toLowerCase().includes(query.trim().toLowerCase())
    return name !== 'All areas' && matchesQuery && (selected === 'All areas' || selected === name)
  }), [query, selected])
  return <div className="public-page explore-page"><section className="explore-hero"><div className="section-container"><span className="eyebrow"><Sparkles size={14}/> Explore skills</span><h1>Follow your <em>curiosity.</em></h1><p>Browse areas of learning and find a direction that interests you. Every exchange starts with a skill you’d like to share or explore.</p><label className="skill-search"><Search size={19}/><input aria-label="Search skill categories" placeholder="Search skill categories" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button onClick={() => setQuery('')} aria-label="Clear search">Clear</button>}</label><small className="search-note">Browse the kinds of skills the SkillSwap community can exchange.</small></div></section>
    <section className="explore-content section-container"><div className="explore-filters"><h2>Browse by area</h2><div className="filter-list" aria-label="Filter skill categories">{categories.map(({ name }) => <button key={name} className={`filter-chip ${selected === name ? 'selected' : ''}`} onClick={() => setSelected(name)} aria-pressed={selected === name}>{name}</button>)}</div></div><div className="explore-results"><div className="results-heading"><div><span className="eyebrow">A starting point</span><h2>{selected === 'All areas' ? 'Areas to explore' : selected}</h2></div><span>{visible.length} {visible.length === 1 ? 'area' : 'areas'}</span></div>{visible.length ? <div className="explore-grid">{visible.map(({ name, description, Icon, color }) => <article className="explore-card" key={name}><span className={`category-icon ${color}`}><Icon size={22}/></span><h3>{name}</h3><p>{description}</p><Link to="/signup">Learn and share <ArrowUpRight size={16}/></Link></article>)}</div> : <div className="empty-search"><Search size={23}/><strong>No categories found</strong><p>Try a different search, or browse all areas.</p><button onClick={() => { setQuery(''); setSelected('All areas') }}>Show all areas</button></div>}<p className="browse-disclaimer">This directory is a visual guide to skill areas. Member skills and matches will appear when discovery is connected.</p></div></section>
    <section className="explore-join"><div className="section-container explore-join-inner"><div><span className="eyebrow">Ready to take part?</span><h2>Share what you know. <em>Learn what’s next.</em></h2><p>Sign in to continue or create an account to get started.</p></div><div><Button to="/signup">Get started <ArrowRight size={16}/></Button><Button to="/login" variant="outline">Log in</Button></div></div></section></div>
}

import { ArrowRight, BookOpen, Compass, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function DashboardPage() {
  const { profile, user } = useAuth()
  const name = profile?.full_name || profile?.name || user?.user_metadata?.full_name || 'there'
  return <section className="page-wrap dashboard-welcome"><span className="eyebrow">Your workspace</span><h1>Welcome, {name.split(' ')[0]}.</h1><p>Your SkillSwap profile is ready. Choose where you’d like to begin.</p><div className="welcome-links"><Link to="/discover"><span><Compass/></span><strong>Explore skills</strong><small>See what you’d like to learn</small><ArrowRight/></Link><Link to="/profile"><span><BookOpen/></span><strong>Your profile</strong><small>Keep your learning profile up to date</small><ArrowRight/></Link><Link to="/ai-hub"><span><Sparkles/></span><strong>Learning hub</strong><small>Explore learning support</small><ArrowRight/></Link></div></section>
}

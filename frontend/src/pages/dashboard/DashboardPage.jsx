import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CalendarDays, Compass, Handshake, LoaderCircle, MessageCircle, Sparkles, Target, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { apiData, apiErrorMessage, apiRequest } from '../../services/api'

function list(data, key) {
  const value = apiData(data)
  if (Array.isArray(value)) return value
  return value?.items ?? value?.[key] ?? []
}

export function DashboardPage() {
  const { user } = useAuth()
  const profileQuery = useQuery({ queryKey: ['my-profile'], queryFn: async () => apiRequest('/profiles/me') })
  const profileData = profileQuery.data?.profile ?? profileQuery.data ?? {}
  const skills = useQuery({ queryKey: ['my-skills'], queryFn: async () => {
    const [teach, learn] = await Promise.all([apiRequest('/users/me/skills?type=TEACH'), apiRequest('/users/me/skills?type=LEARN')])
    return { teach: list(teach, 'skills'), learn: list(learn, 'skills') }
  } })
  const goals = useQuery({ queryKey: ['learning-goals'], queryFn: async () => list(await apiRequest('/learning/goals'), 'goals') })
  const availability = useQuery({ queryKey: ['availability-me'], queryFn: async () => apiData(await apiRequest('/availability/me')) })
  const name = profileData?.full_name || user?.user_metadata?.full_name || 'there'
  const firstName = name.split(' ')[0]
  const completion = [profileData?.full_name, profileData?.username, profileData?.bio, profileData?.college, profileData?.avatar_url, skills.data?.teach?.length, skills.data?.learn?.length].filter(Boolean).length
  const profilePercent = Math.round(completion / 7 * 100)

  return <section className="page-wrap dashboard-welcome">
    <div className="dashboard-greeting"><div><span className="eyebrow">Your workspace</span><h1>Welcome, {firstName}.</h1><p>Here’s what’s taking shape in your SkillSwap profile.</p>{profileData?.college && <small>{profileData.college}{profileData.location ? ` · ${profileData.location}` : ''}</small>}</div><div className="dashboard-profile-avatar">{profileData?.avatar_url ? <img src={profileData.avatar_url} alt="Your profile"/> : <span>{firstName.slice(0, 1).toUpperCase()}</span>}</div></div>
    <div className="welcome-links"><Link to="/discover"><span><Compass/></span><strong>Explore skills</strong><small>Browse skills and people to learn from</small><ArrowRight/></Link><Link to="/profile"><span><BookOpen/></span><strong>Your profile</strong><small>Keep your learning profile up to date</small><ArrowRight/></Link><Link to="/goals"><span><Sparkles/></span><strong>Learning goals</strong><small>Track what you’re working toward</small><ArrowRight/></Link></div>
    <div className="dashboard-data-grid">
      <article className="dashboard-data-card"><div className="dashboard-card-heading"><span><UserRound size={18}/></span><h2>Profile completion</h2></div><strong className="dashboard-metric">{skills.isLoading || profileQuery.isLoading ? '…' : `${profilePercent}%`}</strong><div className="dashboard-meter"><span style={{ width: `${profilePercent}%` }}/></div><p>{profilePercent === 100 ? 'Your profile has the essentials.' : 'Add more details to help people get to know you.'}</p></article>
      <article className="dashboard-data-card"><div className="dashboard-card-heading"><span><BookOpen size={18}/></span><h2>Skills exchange</h2></div>{skills.isLoading ? <Loading/> : skills.isError ? <ErrorMessage error={skills.error}/> : <><SkillGroup title="I can teach" skills={skills.data.teach}/><SkillGroup title="I want to learn" skills={skills.data.learn}/></>}</article>
      <article className="dashboard-data-card"><div className="dashboard-card-heading"><span><Target size={18}/></span><h2>Learning goals</h2></div>{goals.isLoading ? <Loading/> : goals.isError ? <ErrorMessage error={goals.error}/> : goals.data.length ? <ul className="dashboard-list">{goals.data.slice(0, 4).map(goal => <li key={goal.id}><span>{goal.title}</span>{goal.progress?.overall_percentage != null && <small>{goal.progress.overall_percentage}%</small>}</li>)}</ul> : <p>No goals yet. Add one to give your learning direction.</p>}<Link className="dashboard-card-link" to="/goals">View learning goals <ArrowRight size={15}/></Link></article>
      <article className="dashboard-data-card"><div className="dashboard-card-heading"><span><CalendarDays size={18}/></span><h2>Availability</h2></div>{availability.isLoading ? <Loading/> : availability.isError ? <ErrorMessage error={availability.error}/> : availability.data?.slots?.filter(slot => slot.is_active !== false).length ? <ul className="dashboard-list">{availability.data.slots.filter(slot => slot.is_active !== false).slice(0, 5).map(slot => <li key={slot.id ?? `${slot.day_of_week}-${slot.start_time}`}><span>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][slot.day_of_week]}</span><small>{slot.start_time}–{slot.end_time}</small></li>)}</ul> : <p>No availability added yet. Set times that work for you.</p>}</article>
    </div>
    <div className="dashboard-quick-actions"><Link to="/skills">Manage teaching and learning skills <ArrowRight size={15}/></Link><Link to="/availability">Update availability <ArrowRight size={15}/></Link><Link to="/matches"><Users size={15}/> View matches <ArrowRight size={15}/></Link><Link to="/connections"><Handshake size={15}/> Connections <ArrowRight size={15}/></Link><Link to="/messages"><MessageCircle size={15}/> Messages <ArrowRight size={15}/></Link><Link to="/sessions"><CalendarDays size={15}/> My sessions <ArrowRight size={15}/></Link></div>
  </section>
}

function SkillGroup({ title, skills }) {
  return <div className="dashboard-skill-group"><h3>{title}</h3>{skills.length ? <div className="dashboard-tags">{skills.map(skill => <span key={skill.id ?? skill.skill_id}>{skill.skill_name ?? skill.name}{skill.proficiency_level ? ` · ${skill.proficiency_level.toLowerCase()}` : ''}</span>)}</div> : <p>No skills added yet.</p>}</div>
}
function Loading() { return <span className="dashboard-loading"><LoaderCircle className="spin" size={16}/> Loading…</span> }
function ErrorMessage({ error }) { return <p className="dashboard-error" role="alert">{apiErrorMessage(error)}</p> }

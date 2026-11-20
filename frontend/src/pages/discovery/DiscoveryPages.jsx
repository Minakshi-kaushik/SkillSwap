import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ArrowUpRight, CalendarDays, LoaderCircle, MessageCircle, Search, Sparkles, UsersRound, UserRound } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../hooks/useAuth'
import { apiData, apiErrorMessage, apiRequest } from '../../services/api'

function pageData(response) {
  const data = apiData(response)
  return { items: Array.isArray(data) ? data : data?.items ?? [], pagination: data?.pagination ?? null }
}
function value(option) { return typeof option === 'string' ? option : option?.value ?? '' }
function label(option) { return typeof option === 'string' ? option : option?.label ?? option?.value ?? '' }
function personName(person) { return person?.full_name ?? person?.name ?? person?.username ?? 'SkillSwap student' }
function initial(person) { return personName(person).slice(0, 1).toUpperCase() }
function skillName(skill) { return skill?.skill_name ?? skill?.name ?? '' }
function skillLine(skill) { const name = skillName(skill); return skill?.proficiency_level ? `${name} · ${skill.proficiency_level.toLowerCase()}` : name }
function ApiError({ error, retry }) { return <div className="discovery-error" role="alert"><p>{apiErrorMessage(error)}</p>{retry && <button type="button" onClick={retry}>Try again</button>}</div> }
function Loading({ children = 'Loading…' }) { return <div className="discovery-loading" role="status"><LoaderCircle className="spin" size={19}/>{children}</div> }
function SkillTags({ title, skills }) { return <div className="discovery-skill-group"><h3>{title}</h3>{skills?.length ? <div className="discovery-tags">{skills.map((skill, index) => <span key={skill.id ?? skill.skill_id ?? `${skillName(skill)}-${index}`}>{skillLine(skill)}</span>)}</div> : <p className="discovery-muted">No skills listed yet.</p>}</div> }

export function DiscoverPage() {
  const [inputSkill, setInputSkill] = useState('')
  const [filters, setFilters] = useState({ skill: '', skill_type: 'TEACH', category: '', level: '', location: '', session_mode: '', language: '', availability: '', sort: 'newest', page: 1 })
  const filterQuery = useQuery({ queryKey: ['discover-filters'], queryFn: async () => apiData(await apiRequest('/discover/filters')) })
  const searchQuery = useQuery({ queryKey: ['discover', filters], queryFn: async () => {
    const params = new URLSearchParams({ page: String(filters.page), limit: '20' })
    for (const field of ['skill','skill_type','category','level','location','session_mode','language','availability','sort']) if (filters[field]) params.set(field, filters[field])
    return pageData(await apiRequest(`/discover?${params}`))
  } })
  const options = filterQuery.data ?? {}
  function update(field, next) { setFilters(current => ({ ...current, [field]: next, page: field === 'page' ? next : 1 })) }
  function submitSearch(event) { event.preventDefault(); update('skill', inputSkill.trim()) }
  return <section className="page-wrap discovery-page">
    <div className="page-heading"><div><span className="eyebrow">Find your next exchange</span><h1>Discover students</h1><p>Explore people who can teach what you want to learn.</p></div></div>
    <form className="discover-search" onSubmit={submitSearch}><label><Search size={18}/><input aria-label="Search by skill" placeholder="Search a skill, for example Python" value={inputSkill} onChange={event => setInputSkill(event.target.value)}/></label><Button type="submit">Search</Button></form>
    <div className="discovery-type-tabs" role="group" aria-label="Skill direction"><button type="button" className={filters.skill_type === 'TEACH' ? 'active' : ''} onClick={() => update('skill_type','TEACH')}>People who teach</button><button type="button" className={filters.skill_type === 'LEARN' ? 'active' : ''} onClick={() => update('skill_type','LEARN')}>People who want to learn</button></div>
    {filterQuery.isError && <ApiError error={filterQuery.error} retry={() => filterQuery.refetch()}/>}
    <div className="discover-layout"><aside className="discover-filter-panel"><div className="discover-filter-heading"><h2>Filters</h2><button type="button" onClick={() => { setInputSkill(''); setFilters({ skill: '', skill_type: 'TEACH', category: '', level: '', location: '', session_mode: '', language: '', availability: '', sort: 'newest', page: 1 }) }}>Clear</button></div>
      <FilterSelect label="Category" value={filters.category} options={options.categories} onChange={next => update('category',next)}/><FilterSelect label="Proficiency" value={filters.level} options={options.levels} onChange={next => update('level',next)}/><FilterSelect label="Session mode" value={filters.session_mode} options={options.session_modes} onChange={next => update('session_mode',next)}/><FilterSelect label="Language" value={filters.language} options={options.languages} onChange={next => update('language',next)}/><FilterSelect label="Availability" value={filters.availability} options={options.days_of_week} onChange={next => update('availability',next)}/><FilterSelect label="Sort by" value={filters.sort} options={options.sort_options} onChange={next => update('sort',next)}/>
      <label className="discover-filter-field"><span>Location</span><input value={filters.location} onChange={event => update('location',event.target.value)} placeholder="Any location"/></label>
    </aside><div className="discover-results"><div className="discover-results-heading"><div><span className="eyebrow">Community</span><h2>{filters.skill ? `Students for ${filters.skill}` : filters.skill_type === 'TEACH' ? 'Students who teach' : 'Students who want to learn'}</h2></div>{searchQuery.data?.pagination && <small>{searchQuery.data.pagination.total} students</small>}</div>
      {searchQuery.isLoading ? <Loading>Finding students…</Loading> : searchQuery.isError ? <ApiError error={searchQuery.error} retry={() => searchQuery.refetch()}/> : searchQuery.data.items.length ? <><div className="student-discovery-grid">{searchQuery.data.items.map(student => <StudentCard key={student.id} student={student}/>)}</div><Pagination pagination={searchQuery.data.pagination} page={filters.page} onPage={next => update('page',next)}/></> : <div className="discovery-empty"><UsersRound size={27}/><h2>No students found</h2><p>Try another skill or broaden the filters to see more of the community.</p><button type="button" onClick={() => { setInputSkill(''); setFilters(current => ({ ...current, skill: '', category: '', level: '', location: '', session_mode: '', language: '', availability: '', page: 1 })) }}>Clear filters</button></div>}
    </div></div>
  </section>
}

function FilterSelect({ label: title, value: selected, options = [], onChange }) {
  return <label className="discover-filter-field"><span>{title}</span><select value={selected} onChange={event => onChange(event.target.value)}><option value="">Any</option>{options.map(option => <option key={value(option)} value={value(option)}>{label(option)}</option>)}</select></label>
}
function StudentCard({ student }) {
  const teach = student.teach_skills ?? []
  const learn = student.learn_skills ?? []
  return <article className="student-discovery-card"><div className="student-card-top"><div className="student-avatar">{student.avatar_url ? <img src={student.avatar_url} alt=""/> : <span>{initial(student)}</span>}</div><div className="student-card-identity"><h3>{personName(student)}</h3><p>{[student.college, student.location].filter(Boolean).join(' · ') || `@${student.username ?? ''}`}</p></div>{typeof student.average_rating === 'number' && <span className="student-rating">★ {student.average_rating.toFixed(1)}</span>}</div><SkillTags title="Can teach" skills={teach.slice(0,3)}/><SkillTags title="Wants to learn" skills={learn.slice(0,3)}/><div className="student-card-footer"><span>{typeof student.review_count === 'number' ? `${student.review_count} reviews` : 'SkillSwap student'}</span><div><ConnectionAction userId={student.id} showMessage/><Link className="student-profile-link" to={`/profile/${student.id}`}>View profile <ArrowUpRight size={15}/></Link></div></div></article>
}
function Pagination({ pagination, page, onPage, disabled = false }) { if (!pagination || pagination.total_pages < 2) return null; return <nav className="discovery-pagination" aria-label="Search results pages"><button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span>Page {page} of {pagination.total_pages}</span><button type="button" disabled={disabled || page >= pagination.total_pages} onClick={() => onPage(page + 1)}>Next</button></nav> }

function ConnectionAction({ userId, showMessage = false }) {
  const client = useQueryClient()
  const connection = useQuery({ queryKey: ['connection-with', userId], queryFn: async () => apiData(await apiRequest(`/connections/with/${userId}`)) })
  const request = useMutation({ mutationFn: async () => apiRequest('/connections', { method: 'POST', body: JSON.stringify({ receiver_id: userId }) }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['connection-with', userId] }); await client.invalidateQueries({ queryKey: ['connections'] }) } })
  if (connection.isLoading) return <span className="connection-pending">Checking…</span>
  if (connection.isError) return <span className="connection-pending" title={apiErrorMessage(connection.error)}>Connect unavailable</span>
  if (connection.data?.status === 'ACCEPTED') return <span className="connection-state">Connected{showMessage && <> · <Link to={`/messages?user=${encodeURIComponent(userId)}`}>Message</Link></>}</span>
  if (connection.data?.status === 'PENDING') return <span className="connection-state">{connection.data.direction === 'RECEIVED' ? 'Request received' : 'Request sent'}</span>
  return <span className="connection-action-wrap">{request.isError && <span className="connection-action-error" role="alert">{apiErrorMessage(request.error)}</span>}<button className="connection-button" type="button" disabled={request.isPending} onClick={() => request.mutate()}>{request.isPending ? 'Sending…' : 'Connect'}</button></span>
}

export function StudentProfilePage() {
  const { id } = useParams()
  const profile = useQuery({ queryKey: ['student-profile', id], queryFn: async () => apiData(await apiRequest(`/profiles/${id}`)) })
  const availability = useQuery({ queryKey: ['student-availability', id], queryFn: async () => apiData(await apiRequest(`/availability/${id}`)) })
  return <section className="page-wrap discovery-page"><Link className="discovery-back-link" to="/discover">← Back to Discover</Link>{profile.isLoading ? <Loading>Loading student profile…</Loading> : profile.isError ? <ApiError error={profile.error} retry={() => profile.refetch()}/> : <StudentProfileContent profile={profile.data?.profile ?? profile.data} availability={availability}/>}</section>
}
function StudentProfileContent({ profile, availability }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const connection = useQuery({ queryKey: ['connection-with', profile.id], queryFn: async () => apiData(await apiRequest(`/connections/with/${profile.id}`)), enabled: user?.id !== profile.id })
  return <>
    <article className="public-student-profile"><div className="public-student-heading"><div className="student-avatar student-avatar-large">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : <span>{initial(profile)}</span>}</div><div><span className="eyebrow">Student profile</span><h1>{personName(profile)}</h1><p>{[profile.username && `@${profile.username}`, profile.college, profile.location].filter(Boolean).join(' · ')}</p></div><div className="public-student-actions">{user?.id !== profile.id && <ConnectionAction userId={profile.id}/>}</div></div><p className="public-student-bio">{profile.bio || 'This student has not added a bio yet.'}</p><div className="public-student-meta">{profile.languages?.length > 0 && <span><strong>Languages</strong>{profile.languages.join(', ')}</span>}{profile.learning_style && <span><strong>Learning style</strong>{profile.learning_style.replaceAll('_',' ').toLowerCase()}</span>}{profile.session_mode && <span><strong>Session mode</strong>{profile.session_mode}</span>}{typeof profile.average_rating === 'number' && <span><strong>Rating</strong>★ {profile.average_rating.toFixed(1)} ({profile.review_count ?? 0} reviews)</span>}</div>{user?.id !== profile.id && <div className="public-student-chat-action">{connection.data?.status === 'ACCEPTED' && <Button onClick={() => navigate(`/messages?user=${encodeURIComponent(profile.id)}`)}><MessageCircle size={15}/> Message</Button>}{connection.data?.status === 'ACCEPTED' && <Button to={`/sessions/new?user=${encodeURIComponent(profile.id)}`} variant="outline"><CalendarDays size={15}/> Book a session</Button>}</div>}</article>
    <div className="student-profile-columns"><section className="student-panel"><SkillTags title="Skills they can teach" skills={profile.teach_skills ?? []}/></section><section className="student-panel"><SkillTags title="Skills they want to learn" skills={profile.learn_skills ?? []}/></section></div>
    <section className="student-panel public-availability"><h2>Availability</h2>{availability.isLoading ? <Loading/> : availability.isError ? <ApiError error={availability.error} retry={() => availability.refetch()}/> : availability.data?.slots?.filter(slot => slot.is_active !== false).length ? <ul>{availability.data.slots.filter(slot => slot.is_active !== false).map(slot => <li key={slot.id}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][slot.day_of_week]} · {slot.start_time}–{slot.end_time}</li>)}</ul> : <p className="discovery-muted">No availability has been shared yet.</p>}</section>
  </>
}

export function MatchesPage() {
  const client = useQueryClient()
  const [generationError, setGenerationError] = useState('')
  const [page, setPage] = useState(1)
  const matches = useQuery({ queryKey: ['matches', page], queryFn: async () => pageData(await apiRequest(`/matches?page=${page}&limit=20`)) })
  const generate = useMutation({ mutationFn: async () => apiData(await apiRequest('/matches/generate', { method: 'POST' })), onSuccess: async () => { setGenerationError(''); setPage(1); await client.invalidateQueries({ queryKey: ['matches'] }) }, onError: error => setGenerationError(apiErrorMessage(error)) })
  const generatedMatches = page === 1 ? generate.data?.matches : null
  const displayedMatches = generatedMatches?.length ? generatedMatches : matches.data?.items ?? []
  return <section className="page-wrap discovery-page"><div className="page-heading"><div><span className="eyebrow">Skill exchange</span><h1>My Matches</h1><p>Explore match suggestions generated from your current skills and profile.</p></div><Button onClick={() => generate.mutate()} disabled={generate.isPending}><Sparkles size={16}/>{generate.isPending ? 'Finding matches…' : 'Find matches'}</Button></div>
    {generate.isPending && <Loading>SkillSwap is looking for compatible exchanges…</Loading>}{generationError && <ApiError error={new Error(generationError)}/>}
    {generate.data?.matches && <div className="match-generation-summary" role="status">Evaluated {generate.data.total_candidates_evaluated} students{typeof generate.data.semantic_matching === 'boolean' ? ` · Semantic matching ${generate.data.semantic_matching ? 'used' : 'not used'}` : ''}</div>}
    {matches.isLoading ? <Loading>Loading saved matches…</Loading> : matches.isError ? <ApiError error={matches.error} retry={() => matches.refetch()}/> : displayedMatches.length ? <><div className="match-card-grid">{displayedMatches.map(match => <MatchCard key={match.id} match={match}/>)}</div><Pagination pagination={matches.data.pagination} page={page} onPage={setPage} disabled={matches.isFetching}/></> : <div className="discovery-empty"><Sparkles size={27}/><h2>No matches yet</h2><p>When you’re ready, ask SkillSwap to generate suggestions using your teaching and learning skills.</p><Button onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending ? 'Finding matches…' : 'Find matches'}</Button></div>}
  </section>
}
function MatchCard({ match }) {
  const person = match.user ?? {}
  return <article className="match-card"><div className="student-card-top"><div className="student-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : <span>{initial(person)}</span>}</div><div className="student-card-identity"><h2>{personName(person)}</h2><p>{[person.college, person.location].filter(Boolean).join(' · ')}</p></div>{typeof match.compatibility_score === 'number' && <span className="compatibility-score">{match.compatibility_score}% match</span>}</div><span className="match-status">{match.status}</span><SkillTags title="Shared exchange" skills={(match.matched_skills ?? []).map(name => typeof name === 'string' ? { name } : name)}/>{match.exchange && <div className="match-exchange"><p><strong>They teach you:</strong> {(match.exchange.they_teach_you ?? []).join(', ') || '—'}</p><p><strong>You teach them:</strong> {(match.exchange.you_teach_them ?? []).join(', ') || '—'}</p></div>}{match.reasons?.length > 0 && <ul className="match-reasons">{match.reasons.slice(0,3).map((reason,index) => <li key={`${match.id}-reason-${index}`}>{reason}</li>)}</ul>}<div className="match-card-footer">{match.availability_overlap?.length > 0 && <small>{match.availability_overlap.length} shared availability windows</small>}<ConnectionAction userId={person.id} showMessage/><Link to={`/matches/${match.id}`}>Match details <ArrowRight size={15}/></Link><Link to={`/profile/${person.id}`}>View profile <ArrowUpRight size={15}/></Link></div></article>
}

export function MatchDetailPage() {
  const { id } = useParams()
  const [showExplanation, setShowExplanation] = useState(false)
  const matchQuery = useQuery({ queryKey: ['match', id], queryFn: async () => apiData(await apiRequest(`/matches/${id}`)) })
  const explanation = useQuery({ queryKey: ['match-explanation', id], queryFn: async () => apiData(await apiRequest(`/matches/${id}/explanation`)), enabled: showExplanation })
  const match = matchQuery.data?.match ?? matchQuery.data
  return <section className="page-wrap discovery-page"><Link className="discovery-back-link" to="/matches">← Back to matches</Link>{matchQuery.isLoading ? <Loading>Loading match details…</Loading> : matchQuery.isError ? <ApiError error={matchQuery.error} retry={() => matchQuery.refetch()}/> : <><MatchCard match={match}/><section className="student-panel match-detail-reasons"><h2>Why this match</h2>{match.reasons?.length ? <ul>{match.reasons.map((reason,index) => <li key={index}>{reason}</li>)}</ul> : <p className="discovery-muted">No match reasons were provided.</p>}<Button variant="outline" onClick={() => setShowExplanation(true)} disabled={explanation.isFetching}>Why this match?</Button>{explanation.isLoading && <Loading>Writing match explanation?</Loading>}{explanation.isError && <ApiError error={explanation.error} retry={() => explanation.refetch()}/>}{explanation.data && <p>{explanation.data.explanation}{explanation.data.source && <small> · {explanation.data.source}</small>}</p>}</section></>}</section>
}

export function ConnectionsPage() {
  const client = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = ['received', 'sent'].includes(requestedTab) ? requestedTab : 'accepted'
  const changeTab = nextTab => setSearchParams(nextTab === 'accepted' ? {} : { tab: nextTab })
  const endpoint = tab === 'accepted' ? '/connections' : tab === 'received' ? '/connections/received' : '/connections/sent'
  const connections = useQuery({ queryKey: ['connections', tab], queryFn: async () => pageData(await apiRequest(endpoint)) })
  const change = useMutation({ mutationFn: async ({ connection, action }) => action === 'cancel' ? apiRequest(`/connections/${connection.id}`, { method: 'DELETE' }) : apiRequest(`/connections/${connection.id}/${action}`, { method: 'PATCH' }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['connections'] }) } })
  return <section className="page-wrap discovery-page"><div className="page-heading"><div><span className="eyebrow">Your learning community</span><h1>Connections</h1><p>Manage accepted connections and incoming or outgoing requests.</p></div></div><div className="discovery-type-tabs"><button className={tab === 'accepted' ? 'active' : ''} onClick={() => changeTab('accepted')}>Connected</button><button className={tab === 'received' ? 'active' : ''} onClick={() => changeTab('received')}>Received requests</button><button className={tab === 'sent' ? 'active' : ''} onClick={() => changeTab('sent')}>Sent requests</button></div>
    {connections.isLoading ? <Loading>Loading connections…</Loading> : connections.isError ? <ApiError error={connections.error} retry={() => connections.refetch()}/> : connections.data.items.length ? <div className="connection-list">{connections.data.items.map(connection => <article className="connection-card" key={connection.id}><div className="student-avatar">{connection.other_user?.avatar_url ? <img src={connection.other_user.avatar_url} alt=""/> : <span>{initial(connection.other_user)}</span>}</div><div className="student-card-identity"><h2>{personName(connection.other_user)}</h2><p>{[connection.other_user?.college, connection.other_user?.location].filter(Boolean).join(' · ')}</p><small>{connection.status}{connection.direction ? ` · ${connection.direction.toLowerCase()}` : ''}</small></div><div className="connection-card-actions"><Link to={`/profile/${connection.other_user?.id}`}>View profile</Link>{tab === 'accepted' && <><Link to={`/messages?user=${encodeURIComponent(connection.other_user?.id ?? '')}`}>Message</Link><Link to={`/sessions/new?user=${encodeURIComponent(connection.other_user?.id ?? '')}`}>Book session</Link></>}{tab === 'received' && <><button disabled={change.isPending} onClick={() => change.mutate({ connection, action: 'accept' })}>Accept</button><button className="secondary" disabled={change.isPending} onClick={() => change.mutate({ connection, action: 'reject' })}>Reject</button></>}{tab === 'sent' && connection.status === 'PENDING' && <button className="secondary" disabled={change.isPending} onClick={() => change.mutate({ connection, action: 'cancel' })}>Cancel request</button>}</div></article>)}</div> : <div className="discovery-empty"><UserRound size={27}/><h2>{tab === 'accepted' ? 'No connections yet' : 'No requests here'}</h2><p>Discover students who share a skill exchange with you.</p><Link to="/discover">Explore students <ArrowRight size={15}/></Link></div>}
    {change.isPending && <Loading>Updating connection?</Loading>}{change.isError && <ApiError error={change.error} retry={() => change.reset()}/>}
  </section>
}

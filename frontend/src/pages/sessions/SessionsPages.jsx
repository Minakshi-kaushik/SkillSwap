import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, FileText, LoaderCircle, MapPin, Plus, Video, X } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../hooks/useAuth'
import { apiData, apiRequest } from '../../services/api'
import { supabase } from '../../services/supabase'
import { SESSION_STATUSES, choicesForSlot, dateInputBounds, dateWeekday, endChoicesForSlot, formatSessionDate, localDateTimeToUtc, responseItems, sessionDuration, sessionErrorMessage, sessionTimeWindowError, timeMinutes } from './session-utils'

const EMPTY_SKILLS = []

function ErrorNotice({ error, retry }) {
  return <div className="session-alert" role="alert"><p>{sessionErrorMessage(error)}</p>{retry && <button type="button" onClick={retry}>Try again</button>}</div>
}

function SessionLoading({ children = 'Loading sessions…' }) {
  return <div className="session-loading" role="status"><LoaderCircle className="session-spin" size={19}/>{children}</div>
}

function SessionAvatar({ person }) {
  const name = person?.name ?? person?.full_name ?? person?.username ?? 'Student'
  return <span className="session-avatar">{person?.avatar_url ? <img src={person.avatar_url} alt=""/> : name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()}</span>
}

function StatusBadge({ status }) {
  return <span className={`session-status session-status-${String(status ?? '').toLowerCase()}`}>{String(status ?? 'UNKNOWN').replaceAll('_', ' ')}</span>
}

export function SessionsPage() {
  const location = useLocation()
  const [view, setView] = useState('upcoming')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (view === 'upcoming') params.set('when', 'upcoming')
  if (view === 'past') params.set('when', 'past')
  if (view === 'requests') params.set('status', status || 'PENDING')
  else if (status) params.set('status', status)
  if (role) params.set('role', role)
  const sessions = useQuery({ queryKey: ['sessions', view, role, status, page], queryFn: async () => apiData(await apiRequest(`/sessions?${params}`)) })
  const data = sessions.data ?? {}
  const items = responseItems(data)
  const pagination = data?.pagination

  function changeView(next) { setView(next); setStatus(''); setPage(1) }
  return <main className="page-wrap session-page">
    {location.state?.notice && <div className="session-success" role="status"><Check size={15}/>{location.state.notice}</div>}
    <header className="page-heading session-page-heading"><div><span className="eyebrow">Learn together</span><h1>My Sessions</h1><p>Plan, manage and revisit your skill exchanges.</p></div><Button to="/discover"><Plus size={16}/>Find a partner</Button></header>
    <div className="session-view-tabs" role="tablist" aria-label="Session views">{[['upcoming','Upcoming'],['requests','Requests'],['past','Past']].map(([value,label]) => <button key={value} role="tab" aria-selected={view === value} className={view === value ? 'active' : ''} onClick={() => changeView(value)}>{label}</button>)}</div>
    <div className="session-filters"><label><span>Participant role</span><select value={role} onChange={event => { setRole(event.target.value); setPage(1) }}><option value="">All sessions</option><option value="requester">Requested by me</option><option value="receiver">Received by me</option></select></label><label><span>Status</span><select value={status} onChange={event => { setStatus(event.target.value); if (view === 'requests') setView('upcoming'); setPage(1) }}><option value="">All statuses</option>{SESSION_STATUSES.map(value => <option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label></div>
    {sessions.isLoading ? <SessionLoading/> : sessions.isError ? <ErrorNotice error={sessions.error} retry={() => sessions.refetch()}/> : items.length ? <><div className="session-list">{items.map(item => <SessionCard key={item.id} session={item}/>)}</div>{pagination && pagination.total_pages > 1 && <nav className="session-pagination" aria-label="Session pages"><button disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button><span>Page {pagination.page} of {pagination.total_pages}</span><button disabled={page >= pagination.total_pages} onClick={() => setPage(current => current + 1)}>Next</button></nav>}</> : <div className="session-empty"><span><CalendarDays size={25}/></span><h2>{view === 'requests' ? 'No pending requests' : view === 'past' ? 'No past sessions yet' : 'Your schedule is open'}</h2><p>{view === 'requests' ? 'New session requests from your learning partners will appear here.' : 'When you book or accept a session, you’ll find all the details here.'}</p>{view !== 'past' && <Button to="/discover">Discover students</Button>}</div>}
  </main>
}

function SessionCard({ session }) {
  const person = session.other_user ?? {}
  const counterpart = person.name ?? person.full_name ?? person.username ?? 'Your learning partner'
  return <article className="session-card"><div className="session-card-date"><CalendarDays size={17}/><span>{formatSessionDate(session.start_time, session.timezone)}</span></div><div className="session-card-content"><div className="session-card-heading"><SessionAvatar person={person}/><div><h2>{session.topic}</h2><p>{session.skill_name || 'Skill exchange'} <span>·</span> with {counterpart}</p></div><StatusBadge status={session.status}/></div><div className="session-card-meta"><span><Clock3 size={14}/>{sessionDuration(session.start_time, session.end_time) || 'Duration unavailable'}</span><span>{session.session_mode === 'ONLINE' ? <Video size={14}/> : <MapPin size={14}/>} {session.session_mode}</span><span>{session.my_role === 'REQUESTER' ? 'Requested by you' : 'Request received'}</span></div><div className="session-card-footer"><span>{session.timezone}</span><Link to={`/sessions/${session.id}`}>Session details <ArrowRight size={15}/></Link></div></div></article>
}

function Participant({ person, label }) {
  return <div className="session-participant"><SessionAvatar person={person}/><div><small>{label}</small><strong>{person?.name ?? person?.full_name ?? person?.username ?? label}</strong>{person?.username && <span>@{person.username}</span>}</div></div>
}

export function BookSessionPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const { profile: myAuthProfile } = useAuth()
  const userId = params.get('user') ?? ''
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const ownProfile = useQuery({ queryKey: ['my-profile'], queryFn: async () => apiData(await apiRequest('/profiles/me')) })
  const partner = useQuery({ queryKey: ['student-profile', userId], queryFn: async () => apiData(await apiRequest(`/profiles/${userId}`)), enabled: Boolean(userId) })
  const connection = useQuery({ queryKey: ['connection-with', userId], queryFn: async () => apiData(await apiRequest(`/connections/with/${userId}`)), enabled: Boolean(userId) })
  const ownSkills = useQuery({ queryKey: ['my-teaching-skills'], queryFn: async () => {
    const data = apiData(await apiRequest('/users/me/skills?type=TEACH'))
    return Array.isArray(data) ? data : data?.items ?? data?.skills ?? []
  } })
  const timezone = ownProfile.data?.timezone || myAuthProfile?.timezone || defaultTimezone
  const overlap = useQuery({ queryKey: ['availability-overlap', userId, timezone], queryFn: async () => apiData(await apiRequest(`/availability/overlap?user_id=${encodeURIComponent(userId)}&timezone=${encodeURIComponent(timezone)}`)), enabled: Boolean(userId && timezone && !ownProfile.isLoading && connection.data?.status === 'ACCEPTED') })
  const [skillId, setSkillId] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [sessionMode, setSessionMode] = useState('ONLINE')
  const [meetingLink, setMeetingLink] = useState('')
  const [objectives, setObjectives] = useState('')
  const [selection, setSelection] = useState({ date: '', slotKey: '', startTime: '', endTime: '' })

  const targetSkills = partner.data?.teach_skills ?? EMPTY_SKILLS
  const availableSkills = useMemo(() => {
    const map = new Map()
    for (const skill of [...(ownSkills.data ?? []), ...targetSkills]) {
      const id = skill.skill_id
      if (id && !map.has(id)) map.set(id, { id, name: skill.skill_name ?? skill.name ?? 'Skill', offeredBy: skill.user_id === userId ? 'They teach' : 'You teach' })
    }
    return [...map.values()]
  }, [ownSkills.data, targetSkills, userId])
  const slots = overlap.data?.overlap_slots ?? []

  const create = useMutation({
    mutationFn: async body => apiRequest('/sessions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['sessions'] })
      navigate('/sessions', { replace: true, state: { notice: 'Your session request has been sent.' } })
    },
  })

  const [localValidationError, setLocalValidationError] = useState('')
  // Keep validation local; the mutation is reserved for actual backend requests.
  function validateAndSubmit(event) {
    event.preventDefault()
    setLocalValidationError('')
    if (!topic.trim()) return setLocalValidationError('Enter a session topic.')
    if (!skillId) return setLocalValidationError('Choose a skill being taught by you or your partner.')
    const slot = slots.find(item => slotKey(item) === selection.slotKey)
    if (!selection.date || !slot || dateWeekday(selection.date) !== Number(slot.day_of_week)) return setLocalValidationError('Choose a date that matches one of the shared availability slots.')
    const startMinute = timeMinutes(selection.startTime)
    const endMinute = timeMinutes(selection.endTime)
    if (!selection.startTime || !selection.endTime || startMinute < timeMinutes(slot.start_time) || endMinute > timeMinutes(slot.end_time) || endMinute - startMinute < 15 || endMinute - startMinute > 240) return setLocalValidationError('Choose a session between 15 minutes and 4 hours within the selected shared slot.')
    try {
      const startTime = localDateTimeToUtc(selection.date, selection.startTime, timezone)
      const endTime = localDateTimeToUtc(selection.date, selection.endTime, timezone)
      const startsAt = new Date(startTime).getTime()
      const realDuration = (new Date(endTime).getTime() - startsAt) / 60000
      if (realDuration < 15 || realDuration > 240) return setLocalValidationError('The selected local times translate to a duration outside 15 minutes to 4 hours in this timezone.')
      const dateError = sessionTimeWindowError(startTime)
      if (dateError) return setLocalValidationError(dateError)
      const meetingUrl = meetingLink.trim()
      if (meetingUrl && !isHttpUrl(meetingUrl)) return setLocalValidationError('Enter a valid http or https meeting link.')
      create.mutate({
        receiver_id: userId,
        skill_id: skillId,
        topic: topic.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        start_time: startTime,
        end_time: endTime,
        timezone,
        session_mode: sessionMode,
        ...(sessionMode === 'ONLINE' && meetingUrl ? { meeting_link: meetingUrl } : {}),
        objectives: objectives.split('\n').map(item => item.trim()).filter(Boolean),
      })
    } catch (error) { setLocalValidationError(error.message) }
  }

  return <main className="page-wrap session-page booking-page">
    <Link to={userId ? `/profile/${userId}` : '/connections'} className="session-back-link"><ArrowLeft size={15}/> Back</Link>
    <header className="page-heading"><div><span className="eyebrow">Plan your exchange</span><h1>Book a session</h1><p>Choose a time that works for both of you.</p></div></header>
    {!userId ? <div className="session-alert" role="alert"><p>Choose a student from an accepted connection or profile to start a booking.</p><Link to="/connections">View connections</Link></div> : partner.isLoading || connection.isLoading || ownSkills.isLoading || ownProfile.isLoading ? <SessionLoading>Checking your connection and shared availability…</SessionLoading> : partner.isError ? <ErrorNotice error={partner.error} retry={() => partner.refetch()}/> : connection.isError ? <ErrorNotice error={connection.error} retry={() => connection.refetch()}/> : ownSkills.isError ? <ErrorNotice error={ownSkills.error} retry={() => ownSkills.refetch()}/> : connection.data?.status !== 'ACCEPTED' ? <div className="session-empty"><span><X size={23}/></span><h2>Accepted connection required</h2><p>Session requests can only be sent to students you’re connected with.</p><Button to={`/profile/${userId}`} variant="outline">Return to profile</Button></div> : overlap.isLoading ? <SessionLoading>Finding shared weekly availability…</SessionLoading> : overlap.isError ? <ErrorNotice error={overlap.error} retry={() => overlap.refetch()}/> : !slots.length ? <div className="session-empty"><span><CalendarDays size={24}/></span><h2>No shared availability yet</h2><p>You and this student need overlapping weekly availability before a session can be booked.</p></div> : <form className="booking-form" onSubmit={validateAndSubmit}>
      <div className="booking-person-card"><SessionAvatar person={partner.data}/><div><small>Requesting a session with</small><strong>{partner.data.full_name ?? partner.data.name ?? partner.data.username}</strong><span>{partner.data.college ?? ''}</span></div><span className="session-connection-mark"><Check size={15}/> Connected</span></div>
      {availableSkills.length ? <label className="session-field"><span>Skill to learn <b>*</b></span><select required value={skillId} onChange={event => setSkillId(event.target.value)}><option value="">Choose a skill either of you can teach</option>{availableSkills.map(skill => <option value={skill.id} key={skill.id}>{skill.name} · {skill.offeredBy}</option>)}</select></label> : <div className="session-alert" role="alert"><p>No teaching skills are available to book. Add a teaching skill to your profile or ask your partner to do so.</p></div>}
      <label className="session-field"><span>Session topic <b>*</b></span><input required value={topic} onChange={event => setTopic(event.target.value)} placeholder="What would you like to work on?"/></label>
      <label className="session-field"><span>Description <small>Optional</small></span><textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="Add context for your learning partner"/></label>
      <section className="booking-time-panel"><div className="booking-panel-heading"><span className="booking-panel-icon"><CalendarDays size={17}/></span><div><h2>Choose a shared time</h2><p>Available windows are based on both weekly schedules.</p></div></div><AvailabilityPicker slots={slots} timezone={timezone} selection={selection} onChange={setSelection}/><small className="session-timezone-note">Times shown in {timezone}. Session requests must be 15 minutes to 4 hours.</small></section>
      <div className="session-form-grid"><label className="session-field"><span>Session mode</span><select value={sessionMode} onChange={event => setSessionMode(event.target.value)}><option value="ONLINE">Online</option><option value="OFFLINE">In person</option></select></label>{sessionMode === 'ONLINE' && <label className="session-field"><span>Meeting link <small>Optional</small></span><input type="url" value={meetingLink} onChange={event => setMeetingLink(event.target.value)} placeholder="https://…"/></label>}</div>
      <label className="session-field"><span>Learning objectives <small>Optional, one per line</small></span><textarea rows={3} value={objectives} onChange={event => setObjectives(event.target.value)} placeholder={'Understand the basics\nPractice with an example'}/></label>
      {localValidationError && <div className="session-alert" role="alert"><p>{localValidationError}</p></div>}{create.isError && <ErrorNotice error={create.error} retry={() => create.reset()}/>}
      <div className="booking-submit-row"><small>Booking sends a pending request. The other student must accept it.</small><Button type="submit" disabled={create.isPending || !availableSkills.length}><CalendarDays size={16}/>{create.isPending ? 'Sending request…' : 'Request session'}</Button></div>
    </form>}
  </main>
}

function slotKey(slot) { return `${slot.day_of_week}-${slot.start_time}-${slot.end_time}` }
function isHttpUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' } catch { return false } }

function AvailabilityPicker({ slots, timezone, selection, onChange }) {
  const slot = slots.find(item => slotKey(item) === selection.slotKey)
  const starts = slot ? choicesForSlot(slot) : []
  const ends = slot && selection.startTime ? endChoicesForSlot(slot, selection.startTime) : []
  const [bounds] = useState(() => dateInputBounds(timezone))
  const weekdayValid = slot && selection.date && dateWeekday(selection.date) === Number(slot.day_of_week)
  const startMin = slot ? timeMinutes(slot.start_time) : 0
  const endMax = slot ? timeMinutes(slot.end_time) : 0
  const sessionMinutes = selection.startTime && selection.endTime ? timeMinutes(selection.endTime) - timeMinutes(selection.startTime) : 0
  return <div className="availability-picker">
    <label className="session-field"><span>Shared weekly window</span><select value={selection.slotKey} onChange={event => { const next = slots.find(item => slotKey(item) === event.target.value); const firstStart = next ? choicesForSlot(next)[0] : ''; const endOptions = next && firstStart ? endChoicesForSlot(next, firstStart) : []; const defaultEnd = endOptions.find(value => timeMinutes(value) - timeMinutes(firstStart) >= 60) ?? endOptions[0] ?? ''; onChange({ ...selection, slotKey: event.target.value, startTime: firstStart, endTime: defaultEnd }) }}><option value="">Choose an availability window</option>{slots.map(item => <option key={slotKey(item)} value={slotKey(item)}>{item.label ?? `${item.day_name ?? `Day ${item.day_of_week}`} · ${item.start_time}–${item.end_time}`}</option>)}</select></label>
    <div className="session-form-grid"><label className="session-field"><span>Date</span><input type="date" min={bounds.min} max={bounds.max} disabled={!slot} value={selection.date} onChange={event => onChange({ ...selection, date: event.target.value })}/></label><label className="session-field"><span>Day of week</span><input readOnly value={selection.date ? new Intl.DateTimeFormat(undefined, { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${selection.date}T12:00:00Z`)) : 'Choose a date'} /></label></div>
    {slot && selection.date && !weekdayValid && <p className="session-inline-warning">Choose a {slot.day_name ?? 'matching'} to fit the selected shared window.</p>}
    <div className="session-form-grid"><label className="session-field"><span>Start time</span><select disabled={!slot} value={selection.startTime} onChange={event => { const nextEnds = endChoicesForSlot(slot, event.target.value); const end = nextEnds.find(value => timeMinutes(value) - timeMinutes(event.target.value) >= 60) ?? nextEnds[0] ?? ''; onChange({ ...selection, startTime: event.target.value, endTime: end }) }}><option value="">Choose start</option>{starts.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label className="session-field"><span>End time</span><select disabled={!slot || !selection.startTime} value={selection.endTime} onChange={event => onChange({ ...selection, endTime: event.target.value })}><option value="">Choose end</option>{ends.map(value => <option key={value} value={value}>{value}</option>)}</select></label></div>
    {sessionMinutes > 0 && <span className={`session-duration-hint${sessionMinutes < 15 || sessionMinutes > 240 ? ' invalid' : ''}`}><Clock3 size={13}/>{sessionMinutes < 15 || sessionMinutes > 240 ? 'Choose 15 minutes to 4 hours' : `${sessionMinutes >= 60 ? `${Math.floor(sessionMinutes / 60)} hr ` : ''}${sessionMinutes % 60 ? `${sessionMinutes % 60} min` : ''} session`}</span>}
    {slot && endMax - startMin < 15 && <p className="session-inline-warning">This shared window is too short to book a session.</p>}
  </div>
}

export function SessionDetailPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const ownProfile = useQuery({ queryKey: ['my-profile'], queryFn: async () => apiData(await apiRequest('/profiles/me')) })
  const sessionQuery = useQuery({ queryKey: ['session', id], queryFn: async () => apiData(await apiRequest(`/sessions/${id}`)) })
  const session = sessionQuery.data
  const myTimezone = ownProfile.data?.timezone || profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const otherId = session?.other_user?.id
  const overlap = useQuery({ queryKey: ['availability-overlap', otherId, myTimezone], queryFn: async () => apiData(await apiRequest(`/availability/overlap?user_id=${encodeURIComponent(otherId)}&timezone=${encodeURIComponent(myTimezone)}`)), enabled: Boolean(otherId && !ownProfile.isLoading && session?.allowed_actions?.includes('reschedule')) })
  const client = useQueryClient()
  const [dialog, setDialog] = useState('')
  const [reason, setReason] = useState('')
  const [edit, setEdit] = useState({ description: '', meeting_link: '', objectives: '' })
  const [selection, setSelection] = useState({ date: '', slotKey: '', startTime: '', endTime: '' })
  const action = useMutation({
    mutationFn: async ({ name, body }) => apiRequest(`/sessions/${id}${name ? `/${name}` : ''}`, { method: 'PATCH', ...(body ? { body: JSON.stringify(body) } : {}) }),
    onSuccess: async () => {
      setDialog('')
      await Promise.all([client.invalidateQueries({ queryKey: ['session', id] }), client.invalidateQueries({ queryKey: ['sessions'] })])
    },
  })

  function doAction(name, body) { action.mutate({ name, body }) }
  function openEdit() {
    setEdit({ description: session.description ?? '', meeting_link: session.meeting_link ?? '', objectives: (session.objectives ?? []).join('\n') })
    setDialog('edit_details')
  }
  function submitDialog(event) {
    event.preventDefault()
    if (dialog === 'cancel') return doAction('cancel', reason.trim() ? { reason: reason.trim() } : undefined)
    if (dialog === 'reschedule') {
      const slot = overlap.data?.overlap_slots?.find(item => slotKey(item) === selection.slotKey)
      if (!slot || dateWeekday(selection.date) !== Number(slot.day_of_week)) return setDialogError('Choose a date matching the selected shared availability window.')
      const start = timeMinutes(selection.startTime)
      const end = timeMinutes(selection.endTime)
      if (end - start < 15 || end - start > 240 || start < timeMinutes(slot.start_time) || end > timeMinutes(slot.end_time)) return setDialogError('Choose a duration between 15 minutes and 4 hours within the shared window.')
      try {
        const startTime = localDateTimeToUtc(selection.date, selection.startTime, myTimezone)
        const endTime = localDateTimeToUtc(selection.date, selection.endTime, myTimezone)
        const realDuration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
        if (realDuration < 15 || realDuration > 240) return setDialogError('The selected local times translate to a duration outside 15 minutes to 4 hours in this timezone.')
        const dateError = sessionTimeWindowError(startTime)
        if (dateError) return setDialogError(dateError)
        return doAction('reschedule', { start_time: startTime, end_time: endTime })
      } catch (error) { action.reset(); setDialogError(error.message); return }
    }
    if (dialog === 'edit_details') {
      const meeting = edit.meeting_link.trim()
      if (meeting && !isHttpUrl(meeting)) return setDialogError('Enter a valid http or https meeting link.')
      return doAction('', { description: edit.description.trim(), ...(meeting ? { meeting_link: meeting } : {}), objectives: edit.objectives.split('\n').map(item => item.trim()).filter(Boolean) })
    }
  }
  const [dialogError, setDialogError] = useState('')
  function showDialog(name) { action.reset(); setDialogError(''); setReason(''); if (name === 'reschedule') setSelection({ date: '', slotKey: '', startTime: '', endTime: '' }); setDialog(name) }
  function confirmAction(name) {
    const label = name === 'reject' ? session.status === 'RESCHEDULE_REQUESTED' ? 'Decline this proposed time? The original confirmed time will remain.' : 'Reject this session request?' : name === 'complete' ? 'Mark this session as completed?' : ''
    if (label && window.confirm(label)) doAction(name)
    else if (!label) doAction(name)
  }

  if (sessionQuery.isLoading) return <main className="page-wrap session-page"><SessionLoading>Loading session details…</SessionLoading></main>
  if (sessionQuery.isError) return <main className="page-wrap session-page"><ErrorNotice error={sessionQuery.error} retry={() => sessionQuery.refetch()}/></main>
  const current = session
  const other = current?.other_user ?? {}
  const myPerson = { name: profile?.full_name ?? user?.user_metadata?.full_name ?? 'You', avatar_url: profile?.avatar_url }
  const requester = current?.my_role === 'REQUESTER' ? myPerson : other
  const receiver = current?.my_role === 'RECEIVER' ? myPerson : other
  const allowed = new Set(current?.allowed_actions ?? [])
  const objectiveList = current?.objectives ?? []

  return <main className="page-wrap session-page session-detail-page"><Link to="/sessions" className="session-back-link"><ArrowLeft size={15}/> My sessions</Link><header className="session-detail-header"><div><span className="eyebrow">Session details</span><h1>{current.topic}</h1><p>{current.skill_name ?? 'Skill exchange'}</p></div><StatusBadge status={current.status}/></header>
    {action.isError && <ErrorNotice error={action.error} retry={() => action.reset()}/>}
    <div className="session-detail-grid"><section className="session-detail-main">
      <article className="session-panel"><h2>Participants</h2><div className="session-participants"><Participant person={requester} label="Requester"/><span className="participant-divider">↔</span><Participant person={receiver} label="Session partner"/></div></article>
      <article className="session-panel"><h2>Session plan</h2>{current.description && <p className="session-description">{current.description}</p>}{objectiveList.length ? <ul className="session-objectives">{objectiveList.map((item,index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="session-secondary">No learning objectives added.</p>}{current.meeting_link && <a className="meeting-link" href={current.meeting_link} target="_blank" rel="noreferrer"><Video size={15}/>Open meeting link</a>}</article>
      {current.status === 'RESCHEDULE_REQUESTED' && <article className="session-panel proposed-time-panel"><span className="eyebrow">Proposed time</span><h2>{formatSessionDate(current.proposed_start_time, current.timezone)}</h2><p>{formatSessionDate(current.proposed_end_time, current.timezone)} · {current.timezone}</p></article>}
      {current.cancellation_reason && <article className="session-panel"><h2>Cancellation information</h2><p>{current.cancellation_reason}</p><small>{current.cancelled_by === user?.id ? 'Cancelled by you' : 'Cancelled by your partner'}</small></article>}
    </section><aside className="session-detail-side"><article className="session-panel session-time-panel"><h2>When & where</h2><div><CalendarDays size={16}/><span>{formatSessionDate(current.start_time, current.timezone)}</span></div><div><Clock3 size={16}/><span>{sessionDuration(current.start_time, current.end_time) || 'Duration unavailable'}</span></div><div>{current.session_mode === 'ONLINE' ? <Video size={16}/> : <MapPin size={16}/>}<span>{current.session_mode}</span></div><small>Times shown in {current.timezone}</small></article><article className="session-panel session-actions-panel"><h2>Actions</h2>{allowed.has('accept') && <Button onClick={() => confirmAction('accept')} disabled={action.isPending}><Check size={15}/>Accept request</Button>}{allowed.has('reject') && <Button variant="outline" onClick={() => confirmAction('reject')} disabled={action.isPending}><X size={15}/>{current.status === 'RESCHEDULE_REQUESTED' ? 'Decline proposed time' : 'Reject request'}</Button>}{allowed.has('confirm') && <Button onClick={() => confirmAction('confirm')} disabled={action.isPending}><Check size={15}/>Confirm proposed time</Button>}{allowed.has('reschedule') && <Button variant="outline" onClick={() => showDialog('reschedule')} disabled={ownProfile.isLoading || overlap.isLoading || action.isPending}>Request a new time</Button>}{allowed.has('cancel') && <Button variant="outline" onClick={() => showDialog('cancel')} disabled={action.isPending}>Cancel session</Button>}{allowed.has('complete') && <Button variant="outline" onClick={() => confirmAction('complete')} disabled={action.isPending}>Mark complete</Button>}{allowed.has('edit_details') && <Button variant="outline" onClick={openEdit} disabled={action.isPending}><FileText size={15}/>Edit details</Button>}<Button variant="quiet" to={`/sessions/${id}/workspace`}>Session workspace <ArrowRight size={15}/></Button></article></aside></div>
    {dialog && <div className="session-modal-backdrop" role="presentation"><form className="session-modal" onSubmit={submitDialog} role="dialog" aria-modal="true" aria-labelledby="session-dialog-title"><button type="button" className="session-modal-close" aria-label="Close dialog" onClick={() => setDialog('')}><X size={18}/></button><span className="eyebrow">Session update</span><h2 id="session-dialog-title">{dialog === 'cancel' ? 'Cancel this session?' : dialog === 'reschedule' ? 'Request a new time' : 'Edit session details'}</h2>{dialog === 'cancel' ? <label className="session-field"><span>Reason <small>Optional</small></span><textarea rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Let your partner know why"/></label> : dialog === 'reschedule' ? overlap.isLoading ? <SessionLoading>Loading shared availability…</SessionLoading> : overlap.isError ? <ErrorNotice error={overlap.error} retry={() => overlap.refetch()}/> : overlap.data?.overlap_slots?.length ? <AvailabilityPicker slots={overlap.data.overlap_slots} timezone={myTimezone} selection={selection} onChange={setSelection}/> : <p className="session-secondary">There are no shared weekly availability windows to reschedule into.</p> : <><label className="session-field"><span>Description</span><textarea rows={3} value={edit.description} onChange={event => setEdit(currentEdit => ({ ...currentEdit, description: event.target.value }))}/></label><label className="session-field"><span>Meeting link</span><input type="url" value={edit.meeting_link} onChange={event => setEdit(currentEdit => ({ ...currentEdit, meeting_link: event.target.value }))} placeholder="https://…"/></label><label className="session-field"><span>Objectives <small>One per line</small></span><textarea rows={3} value={edit.objectives} onChange={event => setEdit(currentEdit => ({ ...currentEdit, objectives: event.target.value }))}/></label></>}{dialogError && <div className="session-alert" role="alert"><p>{dialogError}</p></div>}{action.isError && <ErrorNotice error={action.error} retry={() => action.reset()}/>}<div className="session-modal-actions"><Button type="button" variant="quiet" onClick={() => setDialog('')}>Close</Button><Button type="submit" disabled={action.isPending || (dialog === 'reschedule' && (!selection.slotKey || !selection.date || !selection.startTime || !selection.endTime))}>{action.isPending ? 'Saving…' : dialog === 'cancel' ? 'Cancel session' : dialog === 'reschedule' ? 'Send new time' : 'Save changes'}</Button></div></form></div>}
  </main>
}

export function SessionWorkspacePage() {
  const { id } = useParams()
  const client = useQueryClient()
  const sessionQuery = useQuery({ queryKey: ['session', id], queryFn: async () => apiData(await apiRequest(`/sessions/${id}`)) })
  const resourcesQuery = useQuery({ queryKey: ['session-resources', id], queryFn: async () => apiData(await apiRequest(`/sessions/${id}/resources`)) })
  const resources = responseItems(resourcesQuery.data)
  const session = sessionQuery.data
  const [title, setTitle] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [resourceType, setResourceType] = useState('LINK')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [secureLinks, setSecureLinks] = useState({})

  const createResource = useMutation({ mutationFn: async body => apiRequest(`/sessions/${id}/resources`, { method: 'POST', body: JSON.stringify(body) }), onSuccess: async () => { setTitle(''); setResourceUrl(''); setFile(null); setNotice('Resource shared with the session.'); await client.invalidateQueries({ queryKey: ['session-resources', id] }) } })
  const removeResource = useMutation({ mutationFn: async resourceId => apiRequest(`/sessions/${id}/resources/${resourceId}`, { method: 'DELETE' }), onSuccess: async () => { setNotice('Resource removed.'); await client.invalidateQueries({ queryKey: ['session-resources', id] }) } })
  const signedUrl = useMutation({ mutationFn: async ({ resourceId, reference }) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    let path = ''
    try {
      const parsed = new URL(reference)
      const marker = '/session-attachments/'
      const index = parsed.pathname.indexOf(marker)
      if (index >= 0) path = decodeURIComponent(parsed.pathname.slice(index + marker.length))
    } catch { /* Invalid private storage reference is reported below. */ }
    if (!path) throw new Error('This private file reference is invalid.')
    const { data, error } = await supabase.storage.from('session-attachments').createSignedUrl(path, 3600)
    if (error) throw error
    return { resourceId, url: data.signedUrl }
  }, onSuccess: result => setSecureLinks(current => ({ ...current, [result.resourceId]: result.url })) })

  async function addLink(event) {
    event.preventDefault(); setErrorMessage(''); setNotice('')
    if (!title.trim()) return setErrorMessage('Enter a resource title.')
    if (!isHttpUrl(resourceUrl.trim())) return setErrorMessage('Enter a valid http or https resource URL.')
    createResource.mutate({ title: title.trim(), resource_url: resourceUrl.trim(), resource_type: resourceType })
  }

  async function addFile(event) {
    event.preventDefault(); setErrorMessage(''); setNotice('')
    if (!file) return setErrorMessage('Choose a file to upload.')
    if (file.size > 10 * 1024 * 1024) return setErrorMessage('Files must be 10 MB or smaller.')
    if (!supabase) return setErrorMessage('Supabase storage is not configured.')
    const safeName = file.name.replace(/[\\/]/g, '-').slice(-180)
    const path = `${id}/${Date.now()}-${safeName}`
    setUploading(true)
    try {
      const { error } = await supabase.storage.from('session-attachments').upload(path, file, { contentType: file.type || 'application/octet-stream' })
      if (error) throw error
      const { data } = supabase.storage.from('session-attachments').getPublicUrl(path)
      createResource.mutate({ title: title.trim() || file.name, resource_url: data.publicUrl, resource_type: 'FILE' })
    } catch (error) { setErrorMessage(error.message || 'File upload failed. Please try again.') }
    finally { setUploading(false) }
  }

  if (sessionQuery.isLoading) return <main className="page-wrap session-page"><SessionLoading>Opening the session workspace…</SessionLoading></main>
  if (sessionQuery.isError) return <main className="page-wrap session-page"><ErrorNotice error={sessionQuery.error} retry={() => sessionQuery.refetch()}/></main>
  const current = session
  return <main className="page-wrap session-page session-workspace-page"><Link to={`/sessions/${id}`} className="session-back-link"><ArrowLeft size={15}/> Session details</Link><header className="session-workspace-heading"><div><span className="eyebrow">Shared workspace</span><h1>{current.topic}</h1><p>{current.skill_name} · {formatSessionDate(current.start_time, current.timezone)}</p></div><StatusBadge status={current.status}/></header>
    {resourcesQuery.isLoading ? <SessionLoading>Loading shared resources…</SessionLoading> : resourcesQuery.isError ? <ErrorNotice error={resourcesQuery.error} retry={() => resourcesQuery.refetch()}/> : resources.length ? <div className="resource-grid">{resources.map(resource => <ResourceCard key={resource.id} resource={resource} signedLink={secureLinks[resource.id]} onSign={() => signedUrl.mutate({ resourceId: resource.id, reference: resource.resource_url })} signing={signedUrl.isPending && signedUrl.variables?.resourceId === resource.id} onDelete={() => { if (window.confirm('Remove this resource from the session?')) removeResource.mutate(resource.id) }} deleting={removeResource.isPending && removeResource.variables === resource.id}/>)}</div> : <div className="session-empty resource-empty"><span><FileText size={24}/></span><h2>No shared resources yet</h2><p>Share helpful links, notes, documents and materials for this session.</p></div>}
    {signedUrl.isError && <ErrorNotice error={signedUrl.error} retry={() => signedUrl.mutate(signedUrl.variables)}/>}{removeResource.isError && <ErrorNotice error={removeResource.error} retry={() => removeResource.reset()}/ >}{createResource.isError && <ErrorNotice error={createResource.error} retry={() => createResource.reset()}/>}{errorMessage && <div className="session-alert" role="alert"><p>{errorMessage}</p></div>}{notice && <div className="session-success" role="status"><Check size={15}/>{notice}</div>}
    {current.allowed_actions?.includes('add_resource') && <section className="add-resource-panel"><div><span className="eyebrow">Add to the workspace</span><h2>Share a resource</h2><p>Add a link or upload a private file for the two session participants.</p></div><div className="resource-add-grid"><form className="resource-add-form" onSubmit={addLink}><label className="session-field"><span>Title</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Resource title"/></label><label className="session-field"><span>Resource URL</span><input type="url" value={resourceUrl} onChange={event => setResourceUrl(event.target.value)} placeholder="https://…"/></label><label className="session-field"><span>Type</span><select value={resourceType} onChange={event => setResourceType(event.target.value)}>{['LINK','DOCUMENT','VIDEO','IMAGE','NOTE'].map(type => <option key={type}>{type}</option>)}</select></label><Button type="submit" disabled={createResource.isPending || uploading}><Plus size={15}/>Share link</Button></form><form className="resource-upload-form" onSubmit={addFile}><label className="session-field"><span>Private file <small>10 MB max · documents, images or ZIP</small></span><input type="file" onChange={event => setFile(event.target.files?.[0] ?? null)}/></label><label className="session-field"><span>File title <small>Optional</small></span><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Defaults to filename"/></label><Button type="submit" variant="outline" disabled={createResource.isPending || uploading || !file}><Plus size={15}/>{createResource.isPending ? 'Sharing…' : 'Upload private file'}</Button></form></div><small className="resource-private-note">Private files are shared only with the two session participants. Secure links expire after one hour.</small></section>}
  </main>
}

function ResourceCard({ resource, signedLink, onSign, signing, onDelete, deleting }) {
  return <article className="resource-card"><div className="resource-type-icon"><FileText size={18}/></div><div className="resource-card-copy"><span className="resource-type-label">{resource.resource_type}</span><h2>{resource.title}</h2><p>{resource.is_mine ? 'Shared by you' : 'Shared by your session partner'}</p></div><div className="resource-card-actions">{resource.resource_type === 'FILE' ? signedLink ? <a href={signedLink} target="_blank" rel="noreferrer">Open private file</a> : <button type="button" onClick={onSign} disabled={signing}>{signing ? 'Creating secure link…' : 'Create secure link'}</button> : <a href={resource.resource_url} target="_blank" rel="noreferrer">Open resource</a>}{resource.is_mine && <button className="resource-delete-button" type="button" onClick={onDelete} disabled={deleting} aria-label={`Delete ${resource.title}`}>{deleting ? 'Removing…' : 'Remove'}</button>}</div></article>
}


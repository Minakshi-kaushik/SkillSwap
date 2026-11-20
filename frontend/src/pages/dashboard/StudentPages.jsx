import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Check, ImagePlus, LoaderCircle, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../hooks/useAuth'
import { apiData, apiErrorMessage, apiRequest } from '../../services/api'
import { supabase } from '../../services/supabase'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
const styles = ['VISUAL', 'AUDITORY', 'READING_WRITING', 'KINESTHETIC', 'MIXED']
const modes = ['ONLINE', 'OFFLINE', 'BOTH']
const timeOptions = Array.from({ length: 49 }, (_, index) => index === 48 ? '24:00' : `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`)
const labels = { VISUAL: 'Visual', AUDITORY: 'Listening and discussion', READING_WRITING: 'Reading and writing', KINESTHETIC: 'Hands-on practice', MIXED: 'A mix of styles', ONLINE: 'Online', OFFLINE: 'In person', BOTH: 'Either works' }
const list = response => { const value = apiData(response); return Array.isArray(value) ? value : value?.items ?? value?.skills ?? value?.goals ?? [] }
const body = value => ({ method: 'PATCH', body: JSON.stringify(value) })

function useStudentData() {
  const profile = useQuery({ queryKey: ['my-profile'], queryFn: async () => apiData(await apiRequest('/profiles/me')) })
  const skills = useQuery({ queryKey: ['my-skills'], queryFn: async () => {
    const [teach, learn] = await Promise.all([apiRequest('/users/me/skills?type=TEACH'), apiRequest('/users/me/skills?type=LEARN')])
    return { teach: list(teach), learn: list(learn) }
  } })
  return { profile, skills }
}

function PageTitle({ eyebrow = 'Your account', title, description, action }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}
function QueryState({ query, children }) {
  if (query.isLoading) return <div className="student-state" role="status"><LoaderCircle className="spin" size={18}/> Loading your informationâ€¦</div>
  if (query.isError) return <div className="form-alert" role="alert">{apiErrorMessage(query.error)} <button type="button" className="text-action" onClick={() => query.refetch()}>Retry</button></div>
  return children(query.data)
}
function Notice({ error, success }) { return <>{error && <div className="form-alert" role="alert">{error}</div>}{success && <div className="form-success" role="status">{success}</div>}</> }
function SkillList({ skills, onRemove, onUpdate }) {
  if (!skills?.length) return <p className="student-empty">No skills here yet. Add a skill to get started.</p>
  return <div className="managed-skills">{skills.map(skill => <article className="managed-skill" key={skill.id ?? `${skill.skill_id}-${skill.skill_type}`}><div><strong>{skill.skill_name ?? skill.name}</strong><small>{skill.category?.label ?? skill.category ?? skill.skill_type}</small></div><select aria-label={`Proficiency for ${skill.skill_name ?? skill.name}`} value={skill.proficiency_level} onChange={event => onUpdate(skill, event.target.value)}>{levels.map(level => <option key={level} value={level}>{level[0] + level.slice(1).toLowerCase()}</option>)}</select><button className="icon-button" type="button" aria-label={`Remove ${skill.skill_name ?? skill.name}`} onClick={() => onRemove(skill)}><Trash2 size={16}/></button></article>)}</div>
}
function ReadOnlySkillList({ skills }) {
  if (!skills?.length) return <p className="student-empty">No skills here yet. Add a skill to get started.</p>
  return <div className="managed-skills">{skills.map(skill => <article className="managed-skill" key={skill.id ?? `${skill.skill_id}-${skill.skill_type}`}><div><strong>{skill.skill_name ?? skill.name}</strong><small>{skill.proficiency_level?.toLowerCase() ?? 'Proficiency not set'}</small></div></article>)}</div>
}

export function ProfilePage() {
  const { profile, skills } = useStudentData()
  const { user, refreshProfile } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const data = profile.data?.profile ?? profile.data ?? {}
  const [form, setForm] = useState(null)
  const values = form ?? { full_name: data.full_name ?? '', username: data.username ?? '', bio: data.bio ?? '', college: data.college ?? '', location: data.location ?? '', languages: (data.languages ?? []).join(', '), learning_style: data.learning_style ?? '', session_mode: data.session_mode ?? '', timezone: data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone }
  function change(event) { setForm(current => ({ ...values, ...current, [event.target.name]: event.target.value })); setSuccess('') }
  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!values.full_name.trim() || values.full_name.trim().length > 100) return setError('Full name must be between 1 and 100 characters.')
    if (!/^[a-z0-9_]{3,30}$/.test(values.username.trim().toLowerCase())) return setError('Username must use 3â€“30 lowercase letters, numbers, or underscores.')
    const languages = values.languages.split(',').map(item => item.trim()).filter(Boolean)
    if (languages.length > 10) return setError('Enter no more than 10 languages.')
    if (values.bio.length > 1000 || values.college.length > 150 || values.location.length > 100) return setError('Bio, college, or location exceeds its character limit.')
    setSaving(true)
    try {
      let avatar_url = data.avatar_url ?? null
      if (photo) {
        if (!supabase || !user?.id) throw new Error('Photo uploads are not configured for this account.')
        if (!['image/png','image/jpeg','image/webp','image/gif'].includes(photo.type) || photo.size > 2 * 1024 * 1024) throw new Error('Choose a JPG, PNG, WebP, or GIF file up to 2 MB.')
        const blob = await toPng(photo)
        if (blob.size > 2 * 1024 * 1024) throw new Error('The converted image exceeds the 2 MB limit.')
        const path = `${user.id}/avatar.png`
        const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, blob, { upsert: true, contentType: 'image/png' })
        if (uploadError) throw uploadError
        avatar_url = supabase.storage.from('profile-images').getPublicUrl(path).data.publicUrl
      }
      const payload = { full_name: values.full_name.trim(), username: values.username.trim().toLowerCase(), bio: values.bio.trim(), college: values.college.trim(), location: values.location.trim(), languages, learning_style: values.learning_style || null, session_mode: values.session_mode || null, timezone: values.timezone, avatar_url }
      const updated = apiData(await apiRequest('/profiles/me', body(payload)))
      setForm(null); setPhoto(null); setEditing(false); setSuccess('Your profile has been saved.')
      client.setQueryData(['my-profile'], updated?.profile ?? updated)
      await refreshProfile()
    } catch (saveError) { setError(apiErrorMessage(saveError)) } finally { setSaving(false) }
  }
  return <section className="page-wrap student-page"><PageTitle title="My profile" description="Manage the details people see on your SkillSwap profile." action={!editing && <Button onClick={() => { setForm(null); setEditing(true); setError(''); setSuccess('') }}>Edit profile</Button>}/><Notice error={error} success={success}/>
    <QueryState query={profile}>{current => { const p = current?.profile ?? current ?? {}; const shown = form ? values : p; return <>
      {editing ? <form className="student-panel profile-edit-form" onSubmit={submit}>
        <div className="profile-photo-edit"><div className="profile-avatar-large">{photo ? <img src={URL.createObjectURL(photo)} alt="Selected profile preview"/> : shown.avatar_url ? <img src={shown.avatar_url} alt="Profile"/> : <UserRound size={34}/>}</div><label className="photo-upload"><ImagePlus size={15}/> Change photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => setPhoto(event.target.files?.[0] ?? null)}/></label><small>PNG, JPG, WebP or GIF Â· up to 2 MB</small></div>
        <div className="student-form-grid"><Field label="Full name"><input name="full_name" required maxLength={100} value={values.full_name} onChange={change}/></Field><Field label="Username"><input name="username" required maxLength={30} value={values.username} onChange={change}/></Field><Field label="College"><input name="college" maxLength={150} value={values.college} onChange={change}/></Field><Field label="Location"><input name="location" maxLength={100} value={values.location} onChange={change}/></Field><Field label="Languages (comma separated)" wide><input name="languages" value={values.languages} onChange={change} placeholder="English, Hindi"/></Field><Field label="Learning style"><select name="learning_style" value={values.learning_style} onChange={change}><option value="">Choose a style</option>{styles.map(item => <option key={item} value={item}>{labels[item]}</option>)}</select></Field><Field label="Session mode"><select name="session_mode" value={values.session_mode} onChange={change}><option value="">Choose a mode</option>{modes.map(item => <option key={item} value={item}>{labels[item]}</option>)}</select></Field><Field label="Timezone (IANA)"><input name="timezone" value={values.timezone} onChange={change}/></Field><Field label="Bio" wide><textarea name="bio" rows={4} maxLength={1000} value={values.bio} onChange={change}/></Field></div><div className="student-actions"><Button type="button" variant="outline" onClick={() => { setEditing(false); setForm(null); setPhoto(null); setError('') }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Savingâ€¦' : 'Save profile'}</Button></div>
      </form> : <div className="student-panel profile-summary"><div className="profile-summary-head"><div className="profile-avatar-large">{p.avatar_url ? <img src={p.avatar_url} alt="Profile"/> : <UserRound size={34}/>}</div><div><h2>{p.full_name || 'Your name'}</h2><p>@{p.username || 'username'}{p.college ? ` Â· ${p.college}` : ''}</p>{p.location && <small>{p.location}</small>}</div></div><div className="profile-bio">{p.bio || 'Add a short bio to introduce yourself.'}</div><div className="profile-meta"><span><strong>Languages</strong>{(p.languages ?? []).join(', ') || 'Not added'}</span><span><strong>Learning style</strong>{labels[p.learning_style] ?? 'Not selected'}</span><span><strong>Session mode</strong>{labels[p.session_mode] ?? 'Not selected'}</span><span><strong>Timezone</strong>{p.timezone || 'Not set'}</span></div></div>}
      <div className="student-two-col"><SkillsPanel title="Skills I can teach" skills={skills.data?.teach} loading={skills.isLoading} error={skills.error} refresh={skills.refetch}/><SkillsPanel title="Skills I want to learn" skills={skills.data?.learn} loading={skills.isLoading} error={skills.error} refresh={skills.refetch}/></div>
      <div className="student-shortcuts"><Link to="/skills">Manage skills <ArrowRight size={15}/></Link><Link to="/availability">Update availability <ArrowRight size={15}/></Link></div>
    </> }}</QueryState>
  </section>
}

function SkillsPanel({ title, skills, loading, error, refresh }) {
  return <article className="student-panel"><div className="student-panel-heading"><h2>{title}</h2><Link to="/skills">Manage</Link></div>{loading ? <StudentLoading/> : error ? <div role="alert">{apiErrorMessage(error)} <button className="text-action" onClick={refresh}>Retry</button></div> : <ReadOnlySkillList skills={skills}/>}</article>
}

export function SkillsPage() {
  const client = useQueryClient()
  const { skills } = useStudentData()
  const catalogue = useQuery({ queryKey: ['skill-catalog'], queryFn: async () => {
    const [skillsResponse, categoriesResponse] = await Promise.all([apiRequest('/skills?limit=100'), apiRequest('/skills/categories')])
    return { skills: list(skillsResponse), categories: list(categoriesResponse) }
  } })
  const [type, setType] = useState('TEACH')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [selected, setSelected] = useState(null)
  const [level, setLevel] = useState('BEGINNER')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const existing = skills.data?.[type === 'TEACH' ? 'teach' : 'learn'] ?? []
  const categories = useMemo(() => ['All categories', ...(catalogue.data?.categories ?? []).map(item => item.label ?? item.value)], [catalogue.data])
  const available = (catalogue.data?.skills ?? []).filter(skill => { const name = (skill.name ?? '').toLowerCase(); const categoryValue = skill.category?.value ?? skill.category; const categoryLabel = catalogue.data?.categories?.find(item => item.value === categoryValue)?.label ?? categoryValue; return name.includes(query.toLowerCase()) && (category === 'All categories' || categoryLabel === category) && !existing.some(item => String(item.skill_id ?? item.id) === String(skill.id)) })
  async function mutateSkill(skill, method, payload) {
    setBusy(true); setError(''); setSuccess('')
    try { await apiRequest(method === 'POST' ? '/users/me/skills' : `/users/me/skills/${skill.id}`, { method, ...(payload ? { body: JSON.stringify(payload) } : {}) }); await client.invalidateQueries({ queryKey: ['my-skills'] }); setSuccess(method === 'POST' ? 'Skill added to your profile.' : method === 'DELETE' ? 'Skill removed from your profile.' : 'Skill proficiency updated.'); return true }
    catch (err) { setError(apiErrorMessage(err)); return false } finally { setBusy(false) }
  }
  async function add() { if (!selected) return; const added = await mutateSkill(selected, 'POST', { skill_id: selected.id, skill_type: type, proficiency_level: level }); if (added) setSelected(null) }
  return <section className="page-wrap student-page"><PageTitle title="Manage skills" description="Choose skills to teach and skills you want to learn." action={<Button to="/profile" variant="outline">View profile</Button>}/><Notice error={error} success={success}/><div className="student-tabs" role="tablist"><button type="button" className={type === 'TEACH' ? 'active' : ''} onClick={() => setType('TEACH')}>I can teach</button><button type="button" className={type === 'LEARN' ? 'active' : ''} onClick={() => setType('LEARN')}>I want to learn</button></div>
    {skills.isLoading ? <StudentLoading/> : skills.isError ? <div className="form-alert" role="alert">{apiErrorMessage(skills.error)} <button className="text-action" onClick={() => skills.refetch()}>Retry</button></div> : <div className="student-panel"><h2>{type === 'TEACH' ? 'Teaching skills' : 'Learning skills'}</h2><SkillList skills={existing} onUpdate={(skill, proficiency_level) => mutateSkill(skill, 'PATCH', { proficiency_level })} onRemove={skill => mutateSkill(skill, 'DELETE')}/></div>}
    <div className="student-panel catalog-panel"><h2>Add a skill</h2><div className="catalog-toolbar"><label className="onboard-search"><Search size={16}/><input placeholder="Search the skill catalogue" value={query} onChange={event => setQuery(event.target.value)}/></label><select value={category} onChange={event => setCategory(event.target.value)}><option>All categories</option>{categories.slice(1).map(item => <option key={item}>{item}</option>)}</select></div><QueryState query={catalogue}>{() => available.length ? <div className="available-skills">{available.map(skill => <button type="button" key={skill.id} className={selected?.id === skill.id ? 'selected' : ''} onClick={() => setSelected(skill)}><span><strong>{skill.name}</strong><small>{skill.category?.label ?? skill.category}</small></span>{selected?.id === skill.id && <Check size={17}/>}</button>)}</div> : <p className="student-empty">No unselected skills match. Try another search or category.</p>}</QueryState>{selected && <div className="add-skill-controls"><label>Proficiency<select value={level} onChange={event => setLevel(event.target.value)}>{levels.map(item => <option key={item} value={item}>{item[0] + item.slice(1).toLowerCase()}</option>)}</select></label><Button onClick={add} disabled={busy}><Plus size={16}/> Add {selected.name}</Button></div>}</div>
  </section>
}

export function GoalsPage() {
  const client = useQueryClient()
  const goals = useQuery({ queryKey: ['learning-goals'], queryFn: async () => list(await apiRequest('/learning/goals')) })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalType, setGoalType] = useState('SKILL')
  const [targetDate, setTargetDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  async function addGoal(event) { event.preventDefault(); setError(''); setSuccess(''); if (!title.trim()) return setError('Enter a title for your goal.'); setBusy(true); try { await apiRequest('/learning/goals', { method: 'POST', body: JSON.stringify({ title: title.trim(), ...(description.trim() ? { description: description.trim() } : {}), goal_type: goalType, ...(targetDate ? { target_date: targetDate } : {}) }) }); setTitle(''); setDescription(''); setTargetDate(''); await client.invalidateQueries({ queryKey: ['learning-goals'] }); setSuccess('Learning goal added.') } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) } }
  async function update(goal, patch) { setError(''); try { await apiRequest(`/learning/goals/${goal.id}`, body(patch)); await client.invalidateQueries({ queryKey: ['learning-goals'] }) } catch (err) { setError(apiErrorMessage(err)) } }
  async function remove(goal) { setError(''); try { await apiRequest(`/learning/goals/${goal.id}`, { method: 'DELETE' }); await client.invalidateQueries({ queryKey: ['learning-goals'] }); setSuccess('Learning goal deleted.') } catch (err) { setError(apiErrorMessage(err)) } }
  return <section className="page-wrap student-page"><PageTitle title="Learning goals" description="Keep your learning plans in one place and track progress when available."/><Notice error={error} success={success}/><div className="student-two-col goals-layout"><form className="student-panel goal-form" onSubmit={addGoal}><h2>Add a learning goal</h2><Field label="Goal title"><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Learn the fundamentals ofâ€¦" required/></Field><Field label="Description (optional)"><textarea rows={3} value={description} onChange={event => setDescription(event.target.value)}/></Field><div className="goal-form-row"><Field label="Goal type"><select value={goalType} onChange={event => setGoalType(event.target.value)}>{['SKILL','CAREER','PROJECT','CERTIFICATION','OTHER'].map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Target date (optional)"><input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)}/></Field></div><Button type="submit" disabled={busy}>{busy ? 'Savingâ€¦' : 'Add goal'}</Button></form><div className="student-panel"><h2>Your goals</h2><QueryState query={goals}>{items => items.length ? <div className="goal-cards">{items.map(goal => <article className="goal-card" key={goal.id}><div><h3>{goal.title}</h3><p>{goal.description || 'A learning goal on your SkillSwap profile.'}</p><small>{goal.goal_type ?? 'SKILL'}{goal.target_date ? ` Â· Target ${goal.target_date}` : ''}</small></div>{goal.progress?.overall_percentage != null && <div className="goal-progress"><strong>{goal.progress.overall_percentage}%</strong><div className="dashboard-meter"><span style={{ width: `${goal.progress.overall_percentage}%` }}/></div><small>{goal.progress.completed ?? 0} of {goal.progress.total ?? 0} milestones complete</small></div>}<div className="goal-actions"><select aria-label={`Status for ${goal.title}`} value={goal.status ?? 'ACTIVE'} onChange={event => update(goal, { status: event.target.value })}>{['ACTIVE','PAUSED','COMPLETED','ABANDONED'].map(item => <option key={item}>{item}</option>)}</select><button type="button" className="icon-button" aria-label={`Delete ${goal.title}`} onClick={() => remove(goal)}><Trash2 size={16}/></button></div></article>)}</div> : <p className="student-empty">No learning goals yet. Add your first goal to get started.</p>}</QueryState></div></div></section>
}

export function AvailabilityPage() {
  const client = useQueryClient()
  const availability = useQuery({ queryKey: ['availability-me'], queryFn: async () => apiData(await apiRequest('/availability/me')) })
  const [daysState, setDaysState] = useState(null)
  const [timezone, setTimezone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const stored = availability.data ?? {}
  const current = daysState ?? days.map((name, day_of_week) => { const slots = (stored.slots ?? []).filter(slot => slot.day_of_week === day_of_week && slot.is_active !== false).map(slot => ({ start_time: slot.start_time, end_time: slot.end_time })); return { day_of_week, name, enabled: slots.length > 0, slots: slots.length ? slots : [{ start_time: '18:00', end_time: '19:00' }] } })
  const zone = timezone || stored.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  function patchDay(day, patch) { setDaysState(current.map(item => item.day_of_week === day ? { ...item, ...patch } : item)); setSuccess('') }
  function updateSlot(day, index, patch) { setDaysState(current.map(item => item.day_of_week === day ? { ...item, slots: item.slots.map((slot, i) => i === index ? { ...slot, ...patch } : slot) } : item)); setSuccess('') }
  function addSlot(day) { setDaysState(current.map(item => item.day_of_week === day ? { ...item, slots: [...item.slots, { start_time: '19:00', end_time: '20:00' }] } : item)) }
  async function save() { setError(''); setSuccess(''); const slots = current.filter(item => item.enabled).flatMap(item => item.slots.map(slot => ({ day_of_week: item.day_of_week, ...slot }))); if (slots.length > 50) return setError('Choose no more than 50 weekly time slots.'); for (const slot of slots) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start_time) || (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end_time) && slot.end_time !== '24:00') || slot.start_time >= slot.end_time) return setError('Use valid 24-hour times, and make sure each end time is later than its start time.') } for (const day of current.filter(item => item.enabled)) { const sorted = [...day.slots].sort((a,b) => a.start_time.localeCompare(b.start_time)); if (sorted.some((slot, index) => index > 0 && slot.start_time < sorted[index - 1].end_time)) return setError(`${day.name} time slots cannot overlap.`) } setBusy(true); try { await apiRequest('/availability/me', { method: 'PUT', body: JSON.stringify({ timezone: zone, slots }) }); await client.invalidateQueries({ queryKey: ['availability-me'] }); setDaysState(null); setSuccess('Your weekly availability has been saved.') } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) } }
  return <section className="page-wrap student-page"><PageTitle title="Availability" description="Choose the weekly times that usually work for learning sessions."/><Notice error={error} success={success}/><QueryState query={availability}>{() => <div className="student-panel availability-editor"><Field label="Timezone"><input value={zone} onChange={event => setTimezone(event.target.value)}/></Field><div className="availability-list">{current.map(day => <div className={`availability-row ${day.enabled ? 'enabled' : ''}`} key={day.day_of_week}><label className="availability-day"><input type="checkbox" checked={day.enabled} onChange={event => patchDay(day.day_of_week, { enabled: event.target.checked })}/><span>{day.name}</span></label>{day.enabled ? <div className="day-slots">{day.slots.map((slot, index) => <div className="time-pair" key={index}><label>From<input type="time" value={slot.start_time} onChange={event => updateSlot(day.day_of_week, index, { start_time: event.target.value })}/></label><span>to</span><label>Until<select value={slot.end_time} onChange={event => updateSlot(day.day_of_week, index, { end_time: event.target.value })}>{timeOptions.filter(time => time > slot.start_time).map(time => <option key={time} value={time}>{time}</option>)}</select></label>{day.slots.length > 1 && <button type="button" className="icon-button" aria-label={`Remove ${day.name} slot ${index + 1}`} onClick={() => patchDay(day.day_of_week, { slots: day.slots.filter((_, i) => i !== index) })}><Trash2 size={15}/></button>}</div>)}<button type="button" className="add-time" onClick={() => addSlot(day.day_of_week)}><Plus size={14}/> Add time slot</button></div> : <span className="day-off">Not available</span>}</div>)}</div><p className="availability-footnote">Times use 24-hour local time. Sunday is day 0; end of day may be 24:00.</p><div className="student-actions"><Button variant="outline" to="/profile">Back to profile</Button><Button onClick={save} disabled={busy}>{busy ? 'Savingâ€¦' : 'Save availability'}</Button></div></div>}</QueryState></section>
}

export function ComingSoonPage({ title, description }) { return <section className="page-wrap"><PageTitle title={title} description={description}/><div className="placeholder-card"><div className="placeholder-orb"><BookOpen size={24}/></div><h2>Coming soon</h2><p>This section will become available in a future SkillSwap phase. Your account and profile features are ready to use now.</p></div></section> }
function Field({ label, wide, children }) { return <label className={`student-field ${wide ? 'wide' : ''}`}><span>{label}</span>{children}</label> }
function StudentLoading() { return <div className="student-state" role="status"><LoaderCircle className="spin" size={18}/> Loadingâ€¦</div> }
function toPng(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) { URL.revokeObjectURL(url); reject(new Error('Could not process this image.')); return }
      context.drawImage(image, 0, 0)
      canvas.toBlob(blob => { URL.revokeObjectURL(url); if (blob) resolve(blob); else reject(new Error('Could not process this image.')) }, 'image/png')
    }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this image.')) }
    image.src = url
  })
}

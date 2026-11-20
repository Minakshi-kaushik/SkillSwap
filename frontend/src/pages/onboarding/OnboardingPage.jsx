import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, ImagePlus, LoaderCircle, MapPin, Plus, Search, Sparkles, Trash2, UserRound } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { Logo } from '../../components/common/Logo'
import { Input } from '../../components/common/Input'
import { useAuth } from '../../hooks/useAuth'
import { apiData, apiErrorMessage, apiRequest } from '../../services/api'
import { supabase } from '../../services/supabase'

const steps = [
  ['Basic information', 'A few details help people get to know you.'],
  ['Skills I can teach', 'Share skills you feel comfortable helping others learn.'],
  ['Skills I want to learn', 'What would you like to explore or practice?'],
  ['Learning goals', 'Add a goal to give your learning a direction.'],
  ['Availability', 'Choose times that usually work for a learning session.'],
  ['Profile preview', 'Take a look at what you’re bringing to the exchange.'],
  ['Complete your profile', 'Review the essentials and join the SkillSwap community.'],
]
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const proficiencyOptions = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
const endTimes = Array.from({ length: 49 }, (_, index) => index === 48 ? '24:00' : `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`)
const blankProfile = { full_name: '', username: '', bio: '', college: '', location: '', languagesText: '', learning_style: '', session_mode: '', timezone: '', avatar_url: '' }

function initialProfile(profile, user) {
  return {
    ...blankProfile,
    full_name: profile?.full_name ?? profile?.name ?? user?.user_metadata?.full_name ?? '',
    username: profile?.username ?? user?.user_metadata?.username ?? '',
    bio: profile?.bio ?? '', college: profile?.college ?? '', location: profile?.location ?? '',
    languagesText: Array.isArray(profile?.languages) ? profile.languages.join(', ') : profile?.languages ?? '',
    learning_style: profile?.learning_style ?? '', session_mode: profile?.session_mode ?? '',
    timezone: profile?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
    avatar_url: profile?.avatar_url ?? profile?.profile_image_url ?? '',
  }
}

function normalizeList(response, keys) {
  let value = apiData(response)
  for (const key of keys) if (!Array.isArray(value) && value?.[key]) value = value[key]
  return Array.isArray(value) ? value : []
}

function normalizeMySkills(response) {
  return normalizeList(response, ['items', 'skills']).map(skill => ({
    skill_id: skill.skill_id,
    record_id: skill.id,
    name: skill.skill_name ?? skill.name ?? '',
    proficiency_level: skill.proficiency_level ?? 'BEGINNER',
    experience_description: skill.experience_description ?? '',
  }))
}

function skillMap(skills) {
  return new Map(skills.map(skill => [String(skill.skill_id), skill]))
}

function categoryName(skill, categories = []) {
  const value = skill.category?.value ?? skill.category?.name ?? skill.category_name ?? skill.category
  return categories.find(category => category.value === value)?.label ?? value ?? 'Other'
}

function SkillPicker({ title, selected, onChange }) {
  const [skills, setSkills] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All categories')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryOptions, setCategoryOptions] = useState([])
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    Promise.all([apiRequest('/skills?limit=100'), apiRequest('/skills/categories').catch(() => null)])
      .then(([result, categoryResult]) => {
        if (!active) return
        setSkills(normalizeList(result, ['skills', 'items']))
        if (categoryResult) setCategoryOptions(normalizeList(categoryResult, ['categories', 'items']))
      })
      .catch(error => { if (active) setError(apiErrorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  const categories = useMemo(() => ['All categories', ...new Set(skills.map(skill => categoryName(skill, categoryOptions)))], [skills, categoryOptions])
  const visible = skills.filter(skill => {
    const name = skill.name ?? skill.title ?? ''
    const categoryMatches = category === 'All categories' || categoryName(skill, categoryOptions) === category
    return categoryMatches && name.toLowerCase().includes(search.trim().toLowerCase())
  })
  function toggle(skill) {
    const id = skill.id ?? skill.skill_id
    if (id == null) return
    const existing = selected.find(item => String(item.skill_id) === String(id))
    onChange(existing ? selected.filter(item => String(item.skill_id) !== String(id)) : [...selected, { skill_id: id, name: skill.name ?? skill.title, proficiency_level: 'BEGINNER', experience_description: '' }])
  }
  function update(id, patch) { onChange(selected.map(item => String(item.skill_id) === String(id) ? { ...item, ...patch } : item)) }
  return <div className="onboard-panel"><div className="onboard-section-heading"><span className="onboard-icon"><BookOpen size={19}/></span><div><h2>{title}</h2><p>Select skills from the available catalog. You can choose more than one.</p></div></div>{error && <div className="form-alert" role="alert">Couldn’t load available skills: {error} <button type="button" className="text-action" onClick={() => { setError(''); setLoading(true); setAttempt(value => value + 1) }}>Retry</button></div>}<div className="skill-toolbar"><label className="onboard-search"><Search size={16}/><input placeholder="Search skills" aria-label="Search available skills" value={search} onChange={e => setSearch(e.target.value)}/></label><select aria-label="Filter by skill category" value={category} onChange={e => setCategory(e.target.value)}><option>All categories</option>{categories.slice(1).map(item => <option key={item}>{item}</option>)}</select></div>{loading ? <div className="onboard-loading"><LoaderCircle className="spin"/> Loading skill catalog…</div> : visible.length ? <div className="skill-catalog">{visible.map(skill => { const id = skill.id ?? skill.skill_id; const chosen = selected.find(item => String(item.skill_id) === String(id)); return <div className={`catalog-skill ${chosen ? 'chosen' : ''}`} key={id}><button type="button" className="catalog-skill-toggle" onClick={() => toggle(skill)} aria-pressed={Boolean(chosen)}><span className="catalog-check">{chosen && <Check size={14}/>}</span><span><strong>{skill.name ?? skill.title}</strong><small>{categoryName(skill, categoryOptions)}</small></span><Plus size={16}/></button>{chosen && <div className="skill-detail-fields"><label>Proficiency<select value={chosen.proficiency_level} onChange={e => update(id, { proficiency_level: e.target.value })}>{proficiencyOptions.map(option => <option key={option} value={option}>{option.charAt(0) + option.slice(1).toLowerCase()}</option>)}</select></label><label>Experience (optional)<input value={chosen.experience_description} onChange={e => update(id, { experience_description: e.target.value })} placeholder="A little context about your experience"/></label></div>}</div> })}</div> : <div className="onboard-empty">No skills match this search. Try another name or category.</div>}<div className="selected-summary"><BadgeCheck size={16}/><span>{selected.length} {selected.length === 1 ? 'skill' : 'skills'} selected</span></div></div>
}

export function OnboardingPage() {
  const { profile, user, session, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [basic, setBasic] = useState(() => initialProfile(profile, user))
  const [photo, setPhoto] = useState(null)
  const [teaching, setTeaching] = useState([])
  const [learning, setLearning] = useState([])
  const [goals, setGoals] = useState([])
  const [goalDraft, setGoalDraft] = useState('')
  const [availability, setAvailability] = useState(days.map((name, day_of_week) => ({ name, day_of_week, enabled: false, slots: [{ start_time: '18:00', end_time: '19:00' }] })))
  const [availabilityTimezone, setAvailabilityTimezone] = useState('')
  const [availabilityTouched, setAvailabilityTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedSkills, setSavedSkills] = useState({ TEACH: new Map(), LEARN: new Map() })
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [progressError, setProgressError] = useState('')
  const [progressRetry, setProgressRetry] = useState(0)

  useEffect(() => {
    let active = true
    const requests = [
      apiRequest('/profiles/me'),
      apiRequest('/users/me/skills?type=TEACH'),
      apiRequest('/users/me/skills?type=LEARN'),
      apiRequest('/learning/goals'),
      apiRequest('/availability/me'),
    ]
    Promise.allSettled(requests).then(results => {
      if (!active) return
      const failed = results.flatMap((result, index) => result.status === 'rejected' ? [['profile', 'teaching skills', 'learning skills', 'goals', 'availability'][index]] : [])
      if (failed.length) setProgressError(`Couldn’t restore saved ${failed.join(', ')}. Retry before continuing so existing progress is preserved.`)

      if (results[0].status === 'fulfilled') {
        const savedProfile = apiData(results[0].value)
        setBasic(current => ({ ...current, ...initialProfile(savedProfile?.profile ?? savedProfile, user) }))
      }

      let teaches = []
      let learns = []
      if (results[1].status === 'fulfilled') teaches = normalizeMySkills(results[1].value)
      if (results[2].status === 'fulfilled') learns = normalizeMySkills(results[2].value)
      if (results[1].status === 'fulfilled') setTeaching(teaches)
      if (results[2].status === 'fulfilled') setLearning(learns)
      setSavedSkills(current => ({
        TEACH: results[1].status === 'fulfilled' ? skillMap(teaches) : current.TEACH,
        LEARN: results[2].status === 'fulfilled' ? skillMap(learns) : current.LEARN,
      }))

      if (results[3].status === 'fulfilled') {
        const savedGoals = normalizeList(results[3].value, ['items', 'goals']).map(goal => ({ id: goal.id, server_id: goal.id, is_saved: true, text: goal.title ?? '' }))
        setGoals(savedGoals)
      }

      if (results[4].status === 'fulfilled') {
        const savedAvailability = apiData(results[4].value)
        const slots = savedAvailability?.slots ?? []
        setAvailabilityTimezone(savedAvailability?.timezone ?? '')
        setAvailability(current => current.map(day => {
          const daySlots = slots.filter(slot => slot.day_of_week === day.day_of_week && slot.is_active !== false).map(({ start_time, end_time }) => ({ start_time, end_time }))
          return { ...day, enabled: daySlots.length > 0, slots: daySlots.length ? daySlots : day.slots }
        }))
        setAvailabilityTouched(false)
      }
      const profileData = results[0].status === 'fulfilled' ? apiData(results[0].value)?.profile ?? apiData(results[0].value) : profile
      const nextStep = !profileData?.full_name ? 0 : !profileData?.username ? 0 : !teaches.length ? 1 : !learns.length ? 2 : 3
      setStep(current => current === 0 ? nextStep : current)
    }).finally(() => { if (active) setLoadingProgress(false) })
    return () => { active = false }
  }, [user, progressRetry, profile])

  async function saveBasic() {
    if (!basic.full_name.trim() || basic.full_name.trim().length > 100) throw new Error('Enter a full name using 1 to 100 characters.')
    if (!/^[a-z0-9_]{3,30}$/.test(basic.username.trim().toLowerCase())) throw new Error('Username must be 3–30 lowercase letters, numbers, or underscores.')
    const languages = basic.languagesText.split(',').map(value => value.trim()).filter(Boolean)
    if (languages.length > 10) throw new Error('Add no more than 10 languages.')
    if (basic.bio.length > 1000 || basic.college.length > 150 || basic.location.length > 100) throw new Error('Bio, college, or location is longer than the allowed limit.')
    let avatarUrl = basic.avatar_url
    if (photo) avatarUrl = await uploadPhoto(photo)
    const payload = {
      full_name: basic.full_name.trim(), username: basic.username.trim().toLowerCase(), bio: basic.bio.trim(),
      college: basic.college.trim(), location: basic.location.trim(),
      languages,
      learning_style: basic.learning_style || null,
      session_mode: basic.session_mode || null,
      timezone: basic.timezone,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    }
    await apiRequest('/profiles/me', { method: 'PATCH', body: JSON.stringify(payload) })
    const refreshed = apiData(await apiRequest('/profiles/me'))
    setBasic(current => ({ ...current, ...initialProfile(refreshed?.profile ?? refreshed, user), avatar_url: avatarUrl }))
    setPhoto(null)
  }

  async function uploadPhoto(file) {
    if (!supabase) throw new Error('Supabase is not configured, so profile image uploads are unavailable.')
    const accepted = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!accepted.includes(file.type)) throw new Error('Choose a JPG, PNG, WebP, or GIF image.')
    if (file.size > 2 * 1024 * 1024) throw new Error('Profile images must be 2 MB or smaller.')
    const png = await convertToPng(file)
    if (png.size > 2 * 1024 * 1024) throw new Error('The converted PNG exceeds the 2 MB profile image limit. Choose a smaller image.')
    const path = `${user.id}/avatar.png`
    const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, png, { upsert: true, contentType: 'image/png' })
    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`)
    const { data } = supabase.storage.from('profile-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveSkillType(type, entries) {
    const saved = savedSkills[type]
    const chosen = new Map(entries.map(item => [String(item.skill_id), item]))
    try {
      for (const [id, previous] of saved) {
        if (!chosen.has(id)) {
          if (!previous.record_id) throw new Error(`Could not identify the saved ${type.toLowerCase()} skill to remove. Retry loading your saved profile.`)
          await apiRequest(`/users/me/skills/${previous.record_id}`, { method: 'DELETE' })
        }
      }
      for (const [id, item] of chosen) {
        const previous = saved.get(id)
        const payload = { proficiency_level: item.proficiency_level, experience_description: item.experience_description.trim() || undefined }
        if (!previous) await apiRequest('/users/me/skills', { method: 'POST', body: JSON.stringify({ skill_id: item.skill_id, skill_type: type, ...payload }) })
        else if (previous.proficiency_level !== item.proficiency_level || previous.experience_description !== item.experience_description.trim()) {
          if (!previous.record_id) throw new Error(`Could not identify the saved ${type.toLowerCase()} skill to update. Retry loading your saved profile.`)
          await apiRequest(`/users/me/skills/${previous.record_id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        }
      }
    } catch (saveError) {
      try {
        const refreshed = normalizeMySkills(await apiRequest(`/users/me/skills?type=${type}`))
        setSavedSkills(current => ({ ...current, [type]: skillMap(refreshed) }))
        if (type === 'TEACH') setTeaching(refreshed)
        else setLearning(refreshed)
      } catch { /* Keep the original save error; progress restore can be retried. */ }
      throw saveError
    }
    const refreshed = normalizeMySkills(await apiRequest(`/users/me/skills?type=${type}`))
    setSavedSkills(current => ({ ...current, [type]: skillMap(refreshed) }))
    if (type === 'TEACH') setTeaching(refreshed)
    else setLearning(refreshed)
  }

  async function saveLearningGoals() {
    try {
      for (const goal of goals.filter(item => item.text.trim() && !item.is_saved)) {
        await apiRequest('/learning/goals', { method: 'POST', body: JSON.stringify({ title: goal.text.trim() }) })
      }
    } catch (saveError) {
      try {
        const refreshed = normalizeList(await apiRequest('/learning/goals'), ['items', 'goals'])
        setGoals(refreshed.map(goal => ({ id: goal.id, server_id: goal.id, is_saved: true, text: goal.title ?? '' })))
      } catch { /* Keep the original save error; progress restore can be retried. */ }
      throw saveError
    }
    const refreshed = normalizeList(await apiRequest('/learning/goals'), ['items', 'goals'])
    setGoals(refreshed.map(goal => ({ id: goal.id, server_id: goal.id, is_saved: true, text: goal.title ?? '' })))
  }

  async function saveAvailability() {
    if (!availabilityTouched) return
    const slots = availability.filter(day => day.enabled).flatMap(day => day.slots.map(({ start_time, end_time }) => ({ day_of_week: day.day_of_week, start_time, end_time })))
    if (slots.length > 50) throw new Error('Choose no more than 50 weekly availability times.')
    for (const slot of slots) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start_time)) throw new Error('Use a valid start time in 24-hour HH:MM format.')
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end_time) && slot.end_time !== '24:00') throw new Error('Use a valid end time in 24-hour HH:MM format, or 24:00.')
      if (slot.start_time >= slot.end_time) throw new Error('Each availability end time must be later than its start time.')
    }
    for (const day of availability.filter(item => item.enabled)) {
      const sorted = [...day.slots].sort((a, b) => a.start_time.localeCompare(b.start_time))
      if (sorted.some((slot, index) => index > 0 && slot.start_time < sorted[index - 1].end_time)) throw new Error(`${day.name} availability times cannot overlap.`)
    }
    await apiRequest('/availability/me', { method: 'PUT', body: JSON.stringify({ timezone: availabilityTimezone || basic.timezone, slots }) })
    const refreshed = apiData(await apiRequest('/availability/me'))
    setAvailabilityTimezone(refreshed?.timezone ?? availabilityTimezone)
    setAvailability(current => current.map(day => {
      const daySlots = (refreshed?.slots ?? []).filter(slot => slot.day_of_week === day.day_of_week && slot.is_active !== false).map(({ start_time, end_time }) => ({ start_time, end_time }))
      return { ...day, enabled: daySlots.length > 0, slots: daySlots.length ? daySlots : day.slots }
    }))
    setAvailabilityTouched(false)
  }

  async function completeOnboarding() {
    const missing = []
    if (!basic.full_name.trim()) missing.push('Full name')
    if (!basic.username.trim()) missing.push('Username')
    if (!teaching.length) missing.push('At least one skill to teach')
    if (!learning.length) missing.push('At least one skill to learn')
    if (missing.length) throw new Error(`Complete these requirements first: ${missing.join(', ')}.`)
    try {
      await apiRequest('/profiles/me', { method: 'PATCH', body: JSON.stringify({ onboarding_completed: true }) })
    } catch (completionError) {
      const details = completionError.details
      const backendMissing = Array.isArray(details) ? details : details?.missing
      if (completionError.status === 400 && completionError.code === 'ONBOARDING_INCOMPLETE' && Array.isArray(backendMissing)) {
        const missingText = backendMissing.join(' ').toLowerCase()
        setStep(missingText.includes('teach') ? 1 : missingText.includes('learn') ? 2 : 0)
        throw new Error(`The server still needs: ${backendMissing.join(', ')}.`)
      }
      throw completionError
    }
    await refreshProfile(session)
    navigate('/dashboard', { replace: true })
  }

  async function continueStep() {
    setError(''); setSaving(true)
    try {
      if (step === 0) await saveBasic()
      if (step === 1) {
        if (!teaching.length) throw new Error('Choose at least one skill you can teach.')
        await saveSkillType('TEACH', teaching)
      }
      if (step === 2) {
        if (!learning.length) throw new Error('Choose at least one skill you want to learn.')
        await saveSkillType('LEARN', learning)
      }
      if (step === 3) await saveLearningGoals()
      if (step === 4) await saveAvailability()
      if (step === 6) return await completeOnboarding()
      setStep(current => Math.min(current + 1, steps.length - 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (saveError) { setError(apiErrorMessage(saveError)) }
    finally { setSaving(false) }
  }

  function addGoal() {
    const text = goalDraft.trim()
    if (!text) return setError('Enter a learning goal before adding it.')
    setGoals(current => [...current, { id: crypto.randomUUID(), is_saved: false, text }]); setGoalDraft(''); setError('')
  }

  const selectedDay = (day, patch) => { setAvailabilityTouched(true); setAvailability(current => current.map(item => item.day_of_week === day ? { ...item, ...patch } : item)) }
  const updateSlot = (day, index, patch) => { setAvailabilityTouched(true); setAvailability(current => current.map(item => item.day_of_week === day ? { ...item, slots: item.slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...patch } : slot) } : item)) }
  const addSlot = day => { setAvailabilityTouched(true); setAvailability(current => current.map(item => { if (item.day_of_week !== day) return item; const previousEnd = item.slots[item.slots.length - 1]?.end_time; const start = !previousEnd || previousEnd === '24:00' ? '20:00' : previousEnd; const [hour, minute] = start.split(':').map(Number); const end = hour === 23 && minute >= 30 ? '24:00' : `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`; return { ...item, slots: [...item.slots, { start_time: start, end_time: end }] } })) }
  const removeSlot = (day, index) => { setAvailabilityTouched(true); setAvailability(current => current.map(item => item.day_of_week === day ? { ...item, slots: item.slots.filter((_, slotIndex) => slotIndex !== index), enabled: item.slots.length === 1 ? false : item.enabled } : item)) }
  async function removeGoal(goal) {
    setError('')
    if (goal.server_id) {
      setSaving(true)
      try {
        await apiRequest(`/learning/goals/${goal.server_id}`, { method: 'DELETE' })
        setGoals(current => current.filter(item => item.id !== goal.id))
        const refreshed = normalizeList(await apiRequest('/learning/goals'), ['items', 'goals'])
        setGoals(refreshed.map(item => ({ id: item.id, server_id: item.id, is_saved: true, text: item.title ?? '' })))
      }
      catch (removeError) {
        if (removeError.status === 404) setGoals(current => current.filter(item => item.id !== goal.id))
        setError(apiErrorMessage(removeError)); setSaving(false); return
      }
      setSaving(false)
      return
    }
    setGoals(current => current.filter(item => item.id !== goal.id))
  }
  const back = () => { setError(''); setStep(current => Math.max(0, current - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <main className="onboarding-page"><header className="onboarding-header"><Logo compact to="/dashboard" className="onboarding-logo"/><span>Profile setup</span><span className="onboarding-secure"><BadgeCheck size={16}/> Your profile</span></header><div className="onboarding-wrap"><div className="onboarding-progress-top"><span>STEP {step + 1} OF {steps.length}</span><span>{Math.round(((step + 1) / steps.length) * 100)}% complete</span></div><div className="progress-track"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }}/></div><div className="onboarding-heading"><span className="eyebrow">Let’s get to know you</span><h1>{steps[step][0]}</h1><p>{steps[step][1]}</p></div>{progressError && <div className="form-alert" role="alert">{progressError} <button type="button" className="text-action" onClick={() => setProgressRetry(value => value + 1)}>Retry</button></div>}{loadingProgress && <div className="onboard-loading" role="status"><LoaderCircle className="spin"/> Restoring saved onboarding progress...</div>}{error && <div className="form-alert" role="alert">{error}</div>}
    {step === 0 && <section className="onboard-panel"><div className="photo-row"><div className="photo-preview">{basic.avatar_url ? <img src={basic.avatar_url} alt="Profile preview"/> : <UserRound size={28}/>}</div><div><strong>Profile photo</strong><p>Use a JPG, PNG, WebP, or GIF image. Files must be 2 MB or smaller. Upload size limits are enforced by the profile image storage bucket.</p><label className="photo-upload"><ImagePlus size={15}/> Choose a photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => setPhoto(event.target.files?.[0] ?? null)}/></label>{photo && <small className="photo-selected">Selected: {photo.name}</small>}</div></div><div className="onboard-fields"><Input label="Full name" name="full_name" value={basic.full_name} maxLength={100} onChange={e => setBasic({ ...basic, full_name: e.target.value })} required/><Input label="Username" name="username" value={basic.username} maxLength={30} onChange={e => setBasic({ ...basic, username: e.target.value })} hint="3-30 lowercase letters, numbers, or underscores." required/><label className="wide-field">Bio<textarea maxLength={1000} rows={3} placeholder="A little about you and what you enjoy learning" value={basic.bio} onChange={e => setBasic({ ...basic, bio: e.target.value })}/><small>{basic.bio.length}/1000</small></label><Input label="College or institution" name="college" value={basic.college} maxLength={150} onChange={e => setBasic({ ...basic, college: e.target.value })}/><label>Location<input value={basic.location} maxLength={100} onChange={e => setBasic({ ...basic, location: e.target.value })} placeholder="City, country"/></label><label className="wide-field">Languages spoken<input value={basic.languagesText} onChange={e => setBasic({ ...basic, languagesText: e.target.value })} placeholder="English, Hindi"/><small>Separate languages with commas.</small></label><label>Learning style<select value={basic.learning_style} onChange={e => setBasic({ ...basic, learning_style: e.target.value })}><option value="">Choose a style</option><option value="VISUAL">Visual</option><option value="AUDITORY">Listening and discussion</option><option value="KINESTHETIC">Hands-on practice</option><option value="READING_WRITING">Reading and writing</option><option value="MIXED">A mix of styles</option></select></label><label>Preferred session mode<select value={basic.session_mode} onChange={e => setBasic({ ...basic, session_mode: e.target.value })}><option value="">Choose a mode</option><option value="ONLINE">Online</option><option value="OFFLINE">In person</option><option value="BOTH">Either works</option></select></label></div><div className="timezone-note"><MapPin size={15}/> Time zone detected from your browser: <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone || 'Not available'}</strong></div></section>}
    {step === 1 && <SkillPicker title="Skills I can teach" selected={teaching} onChange={setTeaching}/>}
    {step === 2 && <SkillPicker title="Skills I want to learn" selected={learning} onChange={setLearning}/>}
    {step === 3 && <section className="onboard-panel"><div className="onboard-section-heading"><span className="onboard-icon"><Sparkles size={19}/></span><div><h2>Your learning goals</h2><p>Add goals that feel meaningful to you. You can change them later.</p></div></div><div className="goal-add"><Input label="Add a goal" name="goal" value={goalDraft} onChange={e => setGoalDraft(e.target.value)} placeholder="For example, learn the basics of digital illustration"/><Button onClick={addGoal} variant="outline"><Plus size={16}/> Add goal</Button></div>{goals.length ? <ul className="goal-list">{goals.map(goal => <li key={goal.id}><span><Check size={15}/>{goal.text}</span><button aria-label={`Remove goal ${goal.text}`} disabled={saving} onClick={() => removeGoal(goal)}><Trash2 size={16}/></button></li>)}</ul> : <div className="onboard-empty">No goals added yet. This step is optional; you can continue when ready.</div>}</section>}
    {step === 4 && <section className="onboard-panel"><div className="onboard-section-heading"><span className="onboard-icon"><Clock3 size={19}/></span><div><h2>Weekly availability</h2><p>Choose one or more usual time windows for each day. Times use your local time zone.</p></div></div><div className="availability-list">{availability.map(day => <div className={`availability-row ${day.enabled ? 'enabled' : ''}`} key={day.day_of_week}><label className="availability-day"><input type="checkbox" checked={day.enabled} onChange={e => selectedDay(day.day_of_week, { enabled: e.target.checked })}/><span>{day.name}</span></label>{day.enabled ? <div className="day-slots">{day.slots.map((slot, index) => <div className="time-pair" key={index}><label>From<input type="time" value={slot.start_time} onChange={e => updateSlot(day.day_of_week, index, { start_time: e.target.value })}/></label><span>to</span><label>Until<select value={slot.end_time} onChange={e => updateSlot(day.day_of_week, index, { end_time: e.target.value })}>{endTimes.map(time => <option key={time} value={time}>{time}</option>)}</select></label>{day.slots.length > 1 && <button className="remove-time" type="button" aria-label={`Remove ${day.name} time ${index + 1}`} onClick={() => removeSlot(day.day_of_week, index)}><Trash2 size={14}/></button>}</div>)}<button type="button" className="add-time" onClick={() => addSlot(day.day_of_week)}><Plus size={13}/> Add another time</button></div> : <span className="day-off">Not available</span>}</div>)}</div><small className="availability-footnote">Days follow the backend numbering: Sunday is 0 through Saturday 6. End of day is 24:00.</small></section>}
    {step === 5 && <ProfilePreview basic={basic} teaching={teaching} learning={learning} goals={goals} availability={availability}/>}
    {step === 6 && <section className="onboard-panel completion-panel"><span className="completion-icon"><Check size={25}/></span><h2>Ready to join the exchange?</h2><p>We’ll check your profile details and skills with SkillSwap before marking onboarding complete.</p><ul><li className={basic.full_name.trim() ? 'ready' : ''}><Check size={15}/> Full name added</li><li className={basic.username.trim() ? 'ready' : ''}><Check size={15}/> Username added</li><li className={teaching.length ? 'ready' : ''}><Check size={15}/> At least one skill to teach</li><li className={learning.length ? 'ready' : ''}><Check size={15}/> At least one skill to learn</li></ul></section>}
    <div className="onboarding-actions"><Button variant="outline" onClick={back} disabled={step === 0 || saving}><ChevronLeft size={17}/> Back</Button><span>{step < 5 ? 'Your progress is saved as you continue' : 'You can go back to edit any step'}</span><Button onClick={continueStep} disabled={saving || loadingProgress || Boolean(progressError)}>{saving ? <><LoaderCircle className="spin" size={16}/> Saving…</> : step === 6 ? <>Complete onboarding <Check size={16}/></> : <>Continue <ChevronRight size={17}/></>}</Button></div></div></main>
}

function ProfilePreview({ basic, teaching, learning, goals, availability }) {
  const selectedAvailability = availability.filter(day => day.enabled).flatMap(day => day.slots.map((slot, index) => ({ ...slot, day: day.name, key: `${day.day_of_week}-${index}` })))
  const preferences = [basic.learning_style, basic.session_mode].filter(Boolean).join(' · ')
  return <div className="profile-preview"><section className="preview-identity"><div className="preview-avatar">{basic.avatar_url ? <img src={basic.avatar_url} alt=""/> : <UserRound/>}</div><div><h2>{basic.full_name || 'Your name'}</h2><span>@{basic.username || 'username'}</span>{basic.college && <small>{basic.college}</small>}</div></section><div className="preview-grid"><PreviewSection title="About me">{basic.bio || 'Add a short bio in Basic Information.'}{basic.location && <span className="preview-location"><MapPin size={13}/>{basic.location}</span>}{basic.languagesText && <span>Languages: {basic.languagesText}</span>}</PreviewSection><PreviewSection title="Skills I can teach">{teaching.length ? teaching.map(skill => <span className="preview-tag" key={skill.skill_id}>{skill.name} · {skill.proficiency_level.toLowerCase()}</span>) : 'No skills selected yet.'}</PreviewSection><PreviewSection title="Skills I want to learn">{learning.length ? learning.map(skill => <span className="preview-tag" key={skill.skill_id}>{skill.name} · {skill.proficiency_level.toLowerCase()}</span>) : 'No skills selected yet.'}</PreviewSection><PreviewSection title="Learning goals">{goals.length ? goals.map(goal => <span className="preview-goal" key={goal.id}>{goal.text}</span>) : 'No goals added yet.'}</PreviewSection><PreviewSection title="Learning preferences">{preferences || 'No preferences selected.'}</PreviewSection><PreviewSection title="Availability">{selectedAvailability.length ? selectedAvailability.map(slot => <span className="preview-goal" key={slot.key}>{slot.day}: {slot.start_time}–{slot.end_time}</span>) : 'No weekly availability selected.'}</PreviewSection></div></div>
}

function PreviewSection({ title, children }) { return <section className="preview-section"><h3>{title}</h3><div>{children}</div></section> }

function convertToPng(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) { URL.revokeObjectURL(url); reject(new Error('Could not process this image.')); return }
      context.drawImage(image, 0, 0)
      canvas.toBlob(blob => { URL.revokeObjectURL(url); if (blob) resolve(blob); else reject(new Error('Could not process this image.')) }, 'image/png')
    }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this image.')) }
    image.src = url
  })
}


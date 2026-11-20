export const SESSION_STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'COMPLETED', 'CANCELLED', 'REJECTED']

export function responseItems(response) {
  const data = response?.data ?? response
  return Array.isArray(data) ? data : data?.items ?? []
}

export function sessionErrorMessage(error) {
  const code = error?.code
  const messages = {
    NOT_CONNECTED: 'You need an accepted connection with this student before booking a session.',
    SKILL_NOT_OFFERED: 'That skill is no longer offered by either participant. Refresh the profile and choose another skill.',
    OUTSIDE_AVAILABILITY: 'That time does not fit both participants’ current availability. Choose another shared slot.',
    SESSION_CONFLICT: 'One of you already has a confirmed session during that time. Choose another slot.',
    PROFILE_INCOMPLETE: 'Complete your profile with at least one teaching skill and one learning skill before booking.',
  }
  if (messages[code]) return messages[code]
  if (Array.isArray(error?.details)) {
    const details = error.details.map(detail => [detail.field, detail.message].filter(Boolean).join(': ')).filter(Boolean)
    if (details.length) return `${error.message}\n${details.join('\n')}`
  }
  return error?.message || 'Something went wrong. Please try again.'
}

export function formatSessionDate(value, timezone) {
  if (!value) return 'Time not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Time not available'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone || undefined }).format(date)
}

export function sessionDuration(start, end) {
  const duration = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (!Number.isFinite(duration) || duration <= 0) return null
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60
  return [hours ? `${hours} hr${hours === 1 ? '' : 's'}` : '', minutes ? `${minutes} min` : ''].filter(Boolean).join(' ')
}

export function timeMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function minuteTime(value) {
  if (value === 1440) return '24:00'
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

export function choicesForSlot(slot) {
  const start = timeMinutes(slot.start_time)
  const end = timeMinutes(slot.end_time)
  const values = []
  for (let minute = start; minute < end; minute += 15) values.push(minuteTime(minute))
  return values
}

export function endChoicesForSlot(slot, startTime) {
  const start = timeMinutes(startTime)
  const end = timeMinutes(slot.end_time)
  const values = []
  for (let minute = start + 15; minute <= end; minute += 15) values.push(minuteTime(minute))
  if (end > start && !values.includes(slot.end_time)) values.push(slot.end_time)
  return values
}

export function dateWeekday(dateString) {
  if (!dateString) return null
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function localDateTimeToUtc(dateString, timeString, timezone) {
  const [year, month, day] = dateString.split('-').map(Number)
  const [hour, minute] = timeString.split(':').map(Number)
  const targetUtcLike = Date.UTC(year, month - 1, day, hour === 24 ? 0 : hour, minute, 0)
    + (hour === 24 ? 24 * 60 * 60 * 1000 : 0)
  let guess = targetUtcLike
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(part => [part.type, part.value]))
    const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
    guess += targetUtcLike - asUtc
  }
  const resolved = new Date(guess)
  const parts = Object.fromEntries(formatter.formatToParts(resolved).map(part => [part.type, part.value]))
  const expectedHour = hour === 24 ? 0 : hour
  const expectedDay = hour === 24 ? new Date(Date.UTC(year, month - 1, day + 1)).getUTCDate() : day
  const expectedMonth = hour === 24 ? new Date(Date.UTC(year, month - 1, day + 1)).getUTCMonth() + 1 : month
  const expectedYear = hour === 24 ? new Date(Date.UTC(year, month - 1, day + 1)).getUTCFullYear() : year
  if (Number(parts.year) !== expectedYear || Number(parts.month) !== expectedMonth || Number(parts.day) !== expectedDay || Number(parts.hour) !== expectedHour || Number(parts.minute) !== minute) {
    throw new Error('That local time is not valid in the selected timezone. Choose another time.')
  }
  return resolved.toISOString()
}

export function dateInputBounds(timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]))
  const today = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
  const max = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000)
  const format = date => date.toISOString().slice(0, 10)
  return { min: format(today), max: format(max) }
}

export function sessionTimeWindowError(instant) {
  const timestamp = new Date(instant).getTime()
  const now = Date.now()
  if (timestamp <= now) return 'Choose a time in the future.'
  if (timestamp > now + 180 * 24 * 60 * 60 * 1000) return 'Choose a date within the next 180 days.'
  return ''
}

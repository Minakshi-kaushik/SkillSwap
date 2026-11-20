export function notificationPath(notification) {
  const type = notification?.type ?? ''
  if (type === 'CONNECTION_REQUEST') return '/connections?tab=received'
  if (type.startsWith('CONNECTION_')) return '/connections'
  if (type.startsWith('SESSION_') && notification.reference_id) return `/sessions/${encodeURIComponent(notification.reference_id)}`
  if (type === 'NEW_REVIEW') return '/sessions'
  if (type === 'NEW_MATCH') return '/matches'
  return '/dashboard'
}

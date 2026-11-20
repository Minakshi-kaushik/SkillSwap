import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CalendarDays, Check, CheckCheck, Handshake, LoaderCircle, MessageCircle, Sparkles, Star, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { apiData, apiErrorMessage, apiRequest } from '../../services/api'
import { notificationPath } from './notification-utils'

const LIMIT = 20
const notificationKeys = userId => ['notifications', userId]

function readResponse(response) {
  const data = apiData(response)
  return { items: Array.isArray(data) ? data : data?.items ?? [], pagination: data?.pagination ?? null, unreadCount: data?.unread_count }
}

export function NotificationBell() {
  const { user, session } = useAuth()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const badge = useQuery({
    queryKey: [...notificationKeys(user?.id), 'badge'],
    enabled: Boolean(user?.id),
    queryFn: async () => readResponse(await apiRequest('/notifications?unread_only=true&page=1&limit=1')),
    staleTime: 15000,
    refetchInterval: 60000,
  })

  useEffect(() => {
    let channel
    let alive = true
    async function subscribe() {
      const { supabase } = await import('../../services/supabase')
      if (!alive || !supabase || !user?.id || !session?.access_token) return
      supabase.realtime.setAuth(session.access_token)
      channel = supabase.channel(`notifications:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, ({ new: notification }) => {
          if (!alive) return
          void client.invalidateQueries({ queryKey: notificationKeys(user.id) })
          setToast(notification?.title ? notification : null)
        })
        .subscribe()
    }
    void subscribe()
    return () => { alive = false; if (channel) void import('../../services/supabase').then(({ supabase }) => supabase?.removeChannel(channel)) }
  }, [client, session?.access_token, user?.id])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 7000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const count = badge.data?.unreadCount
  async function openToast(event) {
    event.preventDefault()
    try {
      if (toast?.id && !toast.is_read) await apiRequest(`/notifications/${encodeURIComponent(toast.id)}/read`, { method: 'PATCH' })
      await client.invalidateQueries({ queryKey: notificationKeys(user?.id) })
      navigate(notificationPath(toast))
      setToast(null)
    } catch (error) {
      setToast(current => current ? { ...current, readError: apiErrorMessage(error) } : null)
    }
  }
  return <>
    <Link className="icon-button notification-bell" to="/notifications" aria-label={typeof count === 'number' && count > 0 ? `Notifications, ${count} unread` : 'Notifications'} title="Notifications">
      <Bell size={19}/>{typeof count === 'number' && count > 0 && <span className="notification-badge">{count > 99 ? '99+' : count}</span>}
    </Link>
    {toast && <div className="notification-toast" role="status"><Link to={notificationPath(toast)} onClick={openToast}><strong>{toast.title}</strong><span>{toast.message}</span>{toast.readError && <span role="alert">{toast.readError}</span>}</Link><button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button></div>}
  </>
}

function CategoryIcon({ type }) {
  if (type?.startsWith('CONNECTION_')) return <Handshake size={18}/> 
  if (type?.startsWith('SESSION_')) return <CalendarDays size={18}/>
  if (type === 'NEW_REVIEW') return <Star size={18}/>
  if (type === 'NEW_MATCH') return <Sparkles size={18}/>
  if (type === 'SYSTEM') return <Bell size={18}/>
  return <MessageCircle size={18}/>
}

function typeLabel(type) {
  return (type ?? 'NOTIFICATION').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
}

function dateLabel(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function NotificationsPage() {
  const { user } = useAuth()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const key = [...notificationKeys(user?.id), filter, page]
  const notifications = useQuery({
    queryKey: key,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (filter === 'unread') params.set('unread_only', 'true')
      return readResponse(await apiRequest(`/notifications?${params}`))
    },
  })
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: notificationKeys(user?.id) }),
  ])
  const markRead = useMutation({
    mutationFn: id => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
    onSuccess: refresh,
  })
  const markAll = useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: id => apiRequest(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })
  const data = notifications.data
  const items = data?.items ?? []
  const pagination = data?.pagination
  const hasPrevious = Boolean(pagination && pagination.page > 1)
  const hasNext = Boolean(pagination && pagination.page < pagination.total_pages)

  function openNotification(notification) {
    if (!notification.is_read) markRead.mutate(notification.id)
    navigate(notificationPath(notification))
  }

  return <section className="page-wrap notifications-page">
    <div className="page-heading"><div><span className="eyebrow">Your updates</span><h1>Notifications</h1><p>Stay up to date with your connections and sessions.</p></div><div className="notification-heading-actions">{data?.unreadCount > 0 && <span className="notification-unread-summary">{data.unreadCount} unread</span>}{filter === 'all' && items.some(item => !item.is_read) && <button type="button" className="notification-mark-all" onClick={() => markAll.mutate()} disabled={markAll.isPending}>{markAll.isPending ? 'Marking…' : <><CheckCheck size={15}/> Mark all read</>}</button>}</div></div>
    <div className="notification-filters" role="tablist" aria-label="Notification filter"><button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => { setFilter('all'); setPage(1) }}>All</button><button type="button" role="tab" aria-selected={filter === 'unread'} className={filter === 'unread' ? 'active' : ''} onClick={() => { setFilter('unread'); setPage(1) }}>Unread</button></div>
    {(markRead.isError || markAll.isError || remove.isError) && <div className="notification-error" role="alert">{apiErrorMessage(markRead.error ?? markAll.error ?? remove.error)} <button type="button" onClick={() => { markRead.reset(); markAll.reset(); remove.reset() }}>Dismiss</button></div>}
    {notifications.isLoading ? <div className="notification-state" role="status"><LoaderCircle className="spin" size={20}/>Loading notifications…</div> : notifications.isError ? <div className="notification-state notification-state-error" role="alert"><p>{apiErrorMessage(notifications.error)}</p><button type="button" onClick={() => notifications.refetch()}>Retry</button></div> : items.length ? <div className="notification-list">{items.map(notification => <article className={`notification-card${notification.is_read ? '' : ' unread'}`} key={notification.id}><button type="button" className="notification-open" onClick={() => openNotification(notification)}><span className="notification-type-icon"><CategoryIcon type={notification.type}/></span><span className="notification-copy"><span className="notification-type">{typeLabel(notification.type)}</span><strong>{notification.title}</strong><span>{notification.message}</span><time dateTime={notification.created_at}>{dateLabel(notification.created_at)}</time></span>{!notification.is_read && <i className="notification-unread-dot" aria-label="Unread"/>}</button><div className="notification-actions">{!notification.is_read && <button type="button" title="Mark as read" aria-label={`Mark ${notification.title} as read`} onClick={() => markRead.mutate(notification.id)} disabled={markRead.isPending}><Check size={16}/></button>}<button type="button" title="Delete notification" aria-label={`Delete ${notification.title}`} onClick={() => remove.mutate(notification.id)} disabled={remove.isPending}><Trash2 size={16}/></button></div></article>)}</div> : <div className="notification-empty"><span><Bell size={23}/></span><h2>{filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'}</h2><p>{filter === 'unread' ? 'Unread updates will appear here.' : 'Updates about connections, sessions, and matches will appear here.'}</p><Link to="/discover">Explore SkillSwap</Link></div>}
    {data && pagination?.total_pages > 1 && <nav className="notification-pagination" aria-label="Notification pages"><button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={!hasPrevious || notifications.isFetching}>Previous</button><span>Page {pagination.page} of {pagination.total_pages}</span><button type="button" onClick={() => setPage(value => value + 1)} disabled={!hasNext || notifications.isFetching}>Next</button></nav>}
  </section>
}

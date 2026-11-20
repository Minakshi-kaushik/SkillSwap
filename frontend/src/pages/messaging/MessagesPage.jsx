import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CheckCheck, LoaderCircle, MessageCircle, Search, Send, UserRound } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { apiData, apiErrorMessage, apiRequest } from '../../services/api'
import { supabase } from '../../services/supabase'

const PAGE_SIZE = 30
const EMPTY_CONVERSATIONS = []

function conversationPage(response) {
  const data = apiData(response)
  return { items: Array.isArray(data) ? data : data?.items ?? [], pagination: data?.pagination ?? null }
}

function nameOf(person) {
  return person?.name ?? person?.full_name ?? person?.username ?? 'SkillSwap student'
}

function initials(person) {
  return nameOf(person).split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()
}

function formatTime(date, includeDate = false) {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  const now = new Date()
  if (includeDate && parsed.toDateString() !== now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parsed)
  }
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(parsed)
}

function Avatar({ person, small = false }) {
  return <span className={`chat-avatar${small ? ' chat-avatar-small' : ''}`}>{person?.avatar_url ? <img src={person.avatar_url} alt=""/> : initials(person)}</span>
}

function MessageError({ error, retry }) {
  return <div className="chat-error" role="alert"><span>{apiErrorMessage(error)}</span>{retry && <button type="button" onClick={retry}>Retry</button>}</div>
}

export function MessagesPage() {
  const { id: routeConversationId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, session } = useAuth()
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [mobileListOpen, setMobileListOpen] = useState(!routeConversationId)
  const openAttemptedRef = useRef('')
  const conversationsQuery = useInfiniteQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async ({ pageParam }) => conversationPage(await apiRequest(`/conversations?page=${pageParam}&limit=20`)),
    initialPageParam: 1,
    getNextPageParam: lastPage => lastPage.pagination && lastPage.pagination.page < lastPage.pagination.total_pages ? lastPage.pagination.page + 1 : undefined,
    refetchInterval: 30000,
  })
  const conversations = conversationsQuery.data?.pages.flatMap(page => page.items) ?? EMPTY_CONVERSATIONS
  const activeConversation = conversations.find(item => item.id === routeConversationId)
  const openForUser = searchParams.get('user')
  const showConversationList = !routeConversationId || mobileListOpen

  const openConversation = useMutation({
    mutationFn: async userId => {
      await apiRequest('/conversations', { method: 'POST', body: JSON.stringify({ user_id: userId }) })
      const queryKey = ['conversations', user?.id]
      const pages = []
      let conversation = null
      let page = 1
      while (true) {
        const result = conversationPage(await apiRequest(`/conversations?page=${page}&limit=20`))
        pages.push(result)
        conversation = result.items.find(item => item.other_user?.id === userId) ?? null
        client.setQueryData(queryKey, { pages: [...pages], pageParams: pages.map((_, index) => index + 1) })
        if (conversation || !result.pagination || result.pagination.page >= result.pagination.total_pages) break
        page += 1
      }
      if (!conversation?.id) throw new Error('The chat was opened, but it could not be found in your conversation list. Please try again.')
      return conversation.id
    },
    onSuccess: conversationId => {
      navigate(`/messages/${conversationId}`, { replace: true })
      setMobileListOpen(false)
    },
  })

  const filtered = useMemo(() => conversations.filter(conversation => nameOf(conversation.other_user).toLowerCase().includes(search.trim().toLowerCase())), [conversations, search])

  useEffect(() => {
    if (openForUser && openAttemptedRef.current !== openForUser && !routeConversationId && !conversationsQuery.isLoading) {
      openAttemptedRef.current = openForUser
      openConversation.mutate(openForUser)
    }
  }, [openForUser, routeConversationId, conversationsQuery.isLoading, openConversation])

  const { fetchNextPage, hasNextPage, isFetchingNextPage, isError, isLoading } = conversationsQuery
  useEffect(() => {
    if (!routeConversationId || activeConversation || isLoading || isError || !hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [routeConversationId, activeConversation, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage])

  return <main className="messages-page">
    <aside className={`conversation-sidebar${showConversationList ? ' conversation-sidebar-mobile-open' : ''}`}>
      <div className="conversation-sidebar-heading"><div><span className="eyebrow">Your community</span><h1>Messages</h1></div><span className="conversation-total">{conversationsQuery.data?.pages?.[0]?.pagination?.total ?? conversations.length}</span></div>
      <label className="conversation-search"><Search size={17}/><input aria-label="Search conversations" placeholder="Search conversations" value={search} onChange={event => setSearch(event.target.value)}/></label>
      {openConversation.isError && <MessageError error={openConversation.error} retry={() => { openAttemptedRef.current = ''; openConversation.reset() }}/>}
      {conversationsQuery.isLoading ? <div className="message-loading"><LoaderCircle className="spin" size={18}/>Loading conversations</div> : conversationsQuery.isError ? <MessageError error={conversationsQuery.error} retry={() => conversationsQuery.refetch()}/> : filtered.length ? <nav className="conversation-list" aria-label="Conversations">{filtered.map(conversation => <ConversationItem key={conversation.id} conversation={conversation} selected={conversation.id === routeConversationId} onSelect={() => { navigate(`/messages/${conversation.id}`); setMobileListOpen(false) }}/>)}</nav> : <div className="conversation-empty"><span className="chat-empty-icon"><MessageCircle size={22}/></span><h2>{search ? 'No matches' : 'No conversations yet'}</h2><p>{search ? 'Try another name.' : 'Open a chat with someone you are connected to.'}</p>{!search && <Link to="/connections">View connections</Link>}</div>}
      {conversationsQuery.hasNextPage && <button className="load-more-conversations" type="button" onClick={() => conversationsQuery.fetchNextPage()} disabled={conversationsQuery.isFetchingNextPage}>{conversationsQuery.isFetchingNextPage ? 'Loading…' : 'Load older conversations'}</button>}
      <div className="conversation-sidebar-footer"><span className="online-indicator"/> Messages are private to your connections</div>
    </aside>
    <section className={`chat-main${showConversationList ? ' chat-main-mobile-hidden' : ''}`}>
      {routeConversationId && activeConversation ? <ChatThread key={activeConversation.id} conversation={activeConversation} user={user} session={session} onBack={() => setMobileListOpen(true)}/> : routeConversationId && (conversationsQuery.isLoading || conversationsQuery.isFetchingNextPage) ? <div className="chat-placeholder"><LoaderCircle className="spin" size={20}/><p>Opening conversation…</p></div> : routeConversationId && conversationsQuery.isError ? <div className="chat-placeholder"><MessageError error={conversationsQuery.error} retry={() => conversationsQuery.refetch()}/></div> : routeConversationId ? <div className="chat-placeholder"><span className="chat-empty-icon"><UserRound size={23}/></span><h2>Conversation unavailable</h2><p>This conversation may no longer be available to your account.</p><Link className="chat-back-link" to="/messages">Back to messages</Link></div> : <div className="chat-placeholder"><span className="chat-empty-icon"><MessageCircle size={25}/></span><h2>Your next conversation starts here</h2><p>Select a conversation, or start chatting with an accepted connection.</p><Link className="chat-start-link" to="/connections">Browse connections</Link></div>}
    </section>
  </main>
}

function ConversationItem({ conversation, selected, onSelect }) {
  const preview = conversation.last_message
  const summary = !preview ? 'Start your conversation' : preview.is_deleted ? 'Message removed' : preview.message_type !== 'TEXT' ? 'Shared an attachment' : preview.content
  return <button type="button" className={`conversation-item${selected ? ' selected' : ''}`} onClick={onSelect} aria-current={selected ? 'page' : undefined}>
    <Avatar person={conversation.other_user}/><span className="conversation-item-copy"><span className="conversation-item-top"><strong>{nameOf(conversation.other_user)}</strong><time>{formatTime(preview?.created_at ?? conversation.updated_at, true)}</time></span><span className="conversation-item-bottom"><span className="conversation-preview">{preview?.is_mine ? 'You: ' : ''}{summary}</span>{conversation.unread_count > 0 && <span className="unread-count" aria-label={`${conversation.unread_count} unread messages`}>{conversation.unread_count > 99 ? '99+' : conversation.unread_count}</span>}</span></span>
  </button>
}

function ChatThread({ conversation, user, session, onBack }) {
  const client = useQueryClient()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [canLoadOlder, setCanLoadOlder] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [olderBusy, setOlderBusy] = useState(false)
  const [historyError, setHistoryError] = useState(null)
  const [realtimeStatus, setRealtimeStatus] = useState('SUBSCRIBING')
  const bottomRef = useRef(null)
  const scrollRef = useRef(null)
  const activeConversationRef = useRef(null)
  const preserveScrollRef = useRef(false)
  const messageMapRef = useRef(new Map())
  const selfId = user?.id

  const mergeMessages = useCallback(items => {
    if (!Array.isArray(items) || !items.length) return
    setMessages(current => {
      const byId = new Map(current.map(message => [message.id, message]))
      for (const message of items) {
        if (message?.id) byId.set(message.id, { ...byId.get(message.id), ...message, is_mine: message.is_mine ?? message.sender_id === selfId })
      }
      const merged = [...byId.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      messageMapRef.current = new Map(merged.map(message => [message.id, message]))
      return merged
    })
  }, [selfId])

  const loadHistory = useCallback(async (before, older = false) => {
    if (older) setOlderBusy(true)
    else setHistoryError(null)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
      if (before) params.set('before', before)
      const data = apiData(await apiRequest(`/conversations/${conversation.id}/messages?${params}`))
      if (activeConversationRef.current !== conversation.id) return
      if (older && scrollRef.current) {
        const oldHeight = scrollRef.current.scrollHeight
        preserveScrollRef.current = true
        mergeMessages(data?.items ?? [])
        requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop += scrollRef.current.scrollHeight - oldHeight })
      } else mergeMessages(data?.items ?? [])
      setCanLoadOlder(Boolean(data?.has_more))
      setCursor(data?.next_before ?? null)
    } catch (error) {
      if (activeConversationRef.current === conversation.id) setHistoryError(error)
    } finally {
      if (activeConversationRef.current === conversation.id) setOlderBusy(false)
    }
  }, [conversation.id, mergeMessages])

  useEffect(() => {
    activeConversationRef.current = conversation.id
    setMessages([])
    messageMapRef.current.clear()
    setCanLoadOlder(false)
    setCursor(null)
    setHistoryError(null)
    setRealtimeStatus('SUBSCRIBING')
    let channel
    let alive = true
    let historyStarted = false

    const beginHistory = () => {
      if (historyStarted || !alive) return
      historyStarted = true
      void loadHistory()
    }

    async function connect() {
      if (!supabase || !selfId) {
        setRealtimeStatus('UNAVAILABLE')
        beginHistory()
        return
      }
      if (session?.access_token) supabase.realtime.setAuth(session.access_token)
      channel = supabase.channel(`conversation:${conversation.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` }, ({ new: rawMessage }) => {
          if (!alive || !rawMessage?.id) return
          mergeMessages([{ ...rawMessage, is_mine: rawMessage.sender_id === selfId }])
          if (rawMessage.sender_id !== selfId) void client.invalidateQueries({ queryKey: ['conversations'] })
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` }, ({ new: rawMessage }) => {
          if (!alive || !rawMessage?.id) return
          mergeMessages([{ ...rawMessage, is_mine: rawMessage.sender_id === selfId }])
          void client.invalidateQueries({ queryKey: ['conversations'] })
        })
        .subscribe(status => {
          if (!alive) return
          setRealtimeStatus(status)
          if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') beginHistory()
        })
    }

    void connect()
    return () => {
      alive = false
      if (activeConversationRef.current === conversation.id) activeConversationRef.current = null
      if (channel && supabase) void supabase.removeChannel(channel)
    }
  }, [client, conversation.id, loadHistory, mergeMessages, selfId, session?.access_token])

  useEffect(() => {
    if (preserveScrollRef.current) { preserveScrollRef.current = false; return }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const markRead = useMutation({
    mutationFn: async () => apiRequest(`/conversations/${conversation.id}/read`, { method: 'PATCH' }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['conversations'] }) },
  })

  useEffect(() => {
    if (conversation.unread_count > 0) markRead.mutate()
    // Mark once when entering this conversation; realtime/query updates handle later messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id])

  const sendMessage = useMutation({
    mutationFn: async content => apiData(await apiRequest(`/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ content }) })),
    onSuccess: async sent => {
      if (sent?.id) mergeMessages([{ ...sent, is_mine: sent.is_mine ?? true }])
      setDraft('')
      await client.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  function submit(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sendMessage.isPending || !conversation.can_message) return
    sendMessage.mutate(content)
  }

  function onInputKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  function handleScroll() {
    if (scrollRef.current?.scrollTop < 45 && canLoadOlder && !olderBusy && cursor) void loadHistory(cursor, true)
  }

  const other = conversation.other_user ?? {}
  const realtimeReady = realtimeStatus === 'SUBSCRIBED'
  return <div className="chat-thread">
    <header className="chat-header"><button type="button" className="chat-mobile-back" aria-label="Back to conversations" onClick={onBack}><ArrowLeft size={19}/></button><Avatar person={other}/><div className="chat-header-person"><strong>{nameOf(other)}</strong><span><i className={`chat-presence ${realtimeReady ? 'connected' : ''}`}/>{realtimeReady ? 'Live chat' : realtimeStatus === 'UNAVAILABLE' ? 'Live updates unavailable' : 'Connecting…'}</span></div><Link to={`/profile/${other.id}`} className="chat-profile-link">View profile</Link></header>
    <div className="chat-history" ref={scrollRef} onScroll={handleScroll}>
      {olderBusy && <div className="older-loading"><LoaderCircle className="spin" size={15}/>Loading older messages</div>}
      {historyError && <MessageError error={historyError} retry={() => loadHistory()}/>}{markRead.isError && <MessageError error={markRead.error} retry={() => markRead.mutate()}/>} 
      {messages.length ? <div className="chat-message-list">{messages.map((message, index) => <MessageBubble key={message.id} message={message} previous={messages[index - 1]} currentUserId={selfId} senderName={nameOf(other)}/>)}</div> : historyError ? null : <div className="chat-welcome"><Avatar person={other}/><span className="eyebrow">You’re connected</span><h2>Say hello to {nameOf(other).split(' ')[0]}</h2><p>Introduce yourself and start planning your skill exchange.</p></div>}
      <div ref={bottomRef}/>
    </div>
    {conversation.can_message ? <form className="chat-composer" onSubmit={submit}><label className="chat-composer-box"><textarea aria-label="Write a message" placeholder="Write a message…" maxLength={5000} rows={1} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={onInputKeyDown} disabled={sendMessage.isPending}/><span><small>{draft.length > 4500 ? `${draft.length}/5000` : 'Enter to send · Shift+Enter for a new line'}</small></span></label><button type="submit" className="chat-send-button" disabled={!draft.trim() || sendMessage.isPending} aria-label="Send message">{sendMessage.isPending ? <LoaderCircle className="spin" size={18}/> : <Send size={18}/>}</button>{sendMessage.isError && <MessageError error={sendMessage.error} retry={() => sendMessage.mutate(draft.trim())}/>}</form> : <div className="chat-readonly-notice"><Check size={16}/> This connection is no longer active. You can read your chat history, but you can’t send new messages.</div>}
  </div>
}

function MessageBubble({ message, previous, currentUserId, senderName }) {
  const mine = message.is_mine ?? message.sender_id === currentUserId
  const previousMine = previous && (previous.is_mine ?? previous.sender_id === currentUserId)
  const showSender = !mine && (!previous || previousMine || previous.sender_id !== message.sender_id)
  const removed = message.is_deleted
  const attachment = message.attachment_url
  return <article className={`message-row${mine ? ' message-row-mine' : ''}${showSender ? ' message-row-start' : ''}`}>
    {!mine && <span className="message-avatar-space"/>}
    <div className="message-bubble-wrap">{showSender && <small className="message-sender-name">{senderName}</small>}<div className={`message-bubble${mine ? ' mine' : ''}${removed ? ' removed' : ''}`}>{removed ? <em>This message was removed</em> : message.message_type === 'TEXT' || !message.message_type ? <p>{message.content}</p> : attachment ? <p>Shared attachment</p> : <p>{message.content || 'Attachment unavailable'}</p>}</div><span className="message-meta"><time dateTime={message.created_at}>{formatTime(message.created_at)}</time>{mine && message.is_read && <CheckCheck size={13} aria-label="Read"/>}</span></div>
  </article>
}

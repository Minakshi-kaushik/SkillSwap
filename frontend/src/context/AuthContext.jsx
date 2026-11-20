import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { supabase } from '../services/supabase'
import { apiData, apiRequest } from '../services/api'

function normalizeProfile(response) {
  const data = apiData(response)
  return data?.profile ?? data?.user ?? data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [profileError, setProfileError] = useState('')
  const [recoverySession, setRecoverySession] = useState(false)

  const refreshProfile = useCallback(async (activeSession) => {
    if (!activeSession && supabase) activeSession = (await supabase.auth.getSession()).data.session
    if (!activeSession?.access_token) return null
    setProfileError('')
    try {
      const result = await apiRequest('/auth/me', { token: activeSession.access_token })
      const nextProfile = normalizeProfile(result)
      setProfile(nextProfile)
      return nextProfile
    } catch (error) {
      setProfileError(error.message)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error('Authentication is not configured.')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
    setProfile(null)
    setProfileError('')
    setRecoverySession(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return undefined
    let mounted = true
    const applySession = async (nextSession, event) => {
      if (!mounted) return
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        setRecoverySession(true)
        setLoading(false)
        return
      }
      if (!nextSession) {
        setProfile(null)
        setProfileError('')
        setRecoverySession(false)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        await refreshProfile(nextSession)
      } catch (error) {
        if (error?.code === 'ACCOUNT_SUSPENDED') {
          setProfile(current => ({ ...current, account_status: 'SUSPENDED' }))
        } else if (error?.status === 401) {
          await supabase.auth.signOut()
          setSession(null)
          setProfile(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      window.setTimeout(() => { void applySession(nextSession, event) }, 0)
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setProfileError(error.message)
      return applySession(data?.session ?? null, 'INITIAL_SESSION')
    }).catch(error => {
      if (mounted) { setProfileError(error.message); setLoading(false) }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [refreshProfile])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileError,
    recoverySession,
    refreshProfile,
    signOut,
    clearRecoverySession: () => setRecoverySession(false),
  }), [session, profile, loading, profileError, recoverySession, refreshProfile, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

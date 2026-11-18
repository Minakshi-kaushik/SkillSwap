import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ admin = false }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="auth-loading" role="status">Checking your session…</div>
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  if (profile?.status?.toLowerCase() === 'suspended' || profile?.account_status?.toLowerCase() === 'suspended') return <Navigate to="/suspended" replace />
  if (profile && !profile.onboarding_completed && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  if (profile?.onboarding_completed && location.pathname === '/onboarding') return <Navigate to="/dashboard" replace />
  if (admin && profile?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

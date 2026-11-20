import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AdminLayout, AppLayout, PublicLayout } from './components/layout/Layouts'
import { PlaceholderPage } from './components/common/PlaceholderPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

const namedPage = (loader, name) => lazy(() => loader().then(module => ({ default: module[name] })))
const LandingPage = namedPage(() => import('./pages/public/LandingPage'), 'LandingPage')
const AboutPage = namedPage(() => import('./pages/public/AboutPage'), 'AboutPage')
const HowItWorksPage = namedPage(() => import('./pages/public/HowItWorksPage'), 'HowItWorksPage')
const ExploreSkillsPage = namedPage(() => import('./pages/public/ExploreSkillsPage'), 'ExploreSkillsPage')
const LoginPage = namedPage(() => import('./pages/auth/AuthPages'), 'LoginPage')
const SignupPage = namedPage(() => import('./pages/auth/AuthPages'), 'SignupPage')
const ForgotPasswordPage = namedPage(() => import('./pages/auth/AuthPages'), 'ForgotPasswordPage')
const ResetPasswordPage = namedPage(() => import('./pages/auth/AuthPages'), 'ResetPasswordPage')
const AuthCallbackPage = namedPage(() => import('./pages/auth/AuthPages'), 'AuthCallbackPage')
const SuspendedPage = namedPage(() => import('./pages/auth/AuthPages'), 'SuspendedPage')
const OnboardingPage = namedPage(() => import('./pages/onboarding/OnboardingPage'), 'OnboardingPage')
const DashboardPage = namedPage(() => import('./pages/dashboard/DashboardPage'), 'DashboardPage')
const ProfilePage = namedPage(() => import('./pages/dashboard/StudentPages'), 'ProfilePage')
const SkillsPage = namedPage(() => import('./pages/dashboard/StudentPages'), 'SkillsPage')
const GoalsPage = namedPage(() => import('./pages/dashboard/StudentPages'), 'GoalsPage')
const AvailabilityPage = namedPage(() => import('./pages/dashboard/StudentPages'), 'AvailabilityPage')
const ComingSoonPage = namedPage(() => import('./pages/dashboard/StudentPages'), 'ComingSoonPage')
const DiscoverPage = namedPage(() => import('./pages/discovery/DiscoveryPages'), 'DiscoverPage')
const StudentProfilePage = namedPage(() => import('./pages/discovery/DiscoveryPages'), 'StudentProfilePage')
const MatchesPage = namedPage(() => import('./pages/discovery/DiscoveryPages'), 'MatchesPage')
const MatchDetailPage = namedPage(() => import('./pages/discovery/DiscoveryPages'), 'MatchDetailPage')
const ConnectionsPage = namedPage(() => import('./pages/discovery/DiscoveryPages'), 'ConnectionsPage')
const MessagesPage = namedPage(() => import('./pages/messaging/MessagesPage'), 'MessagesPage')
const NotificationsPage = namedPage(() => import('./pages/notifications/NotificationsPage'), 'NotificationsPage')
const SessionsPage = namedPage(() => import('./pages/sessions/SessionsPages'), 'SessionsPage')
const BookSessionPage = namedPage(() => import('./pages/sessions/SessionsPages'), 'BookSessionPage')
const SessionDetailPage = namedPage(() => import('./pages/sessions/SessionsPages'), 'SessionDetailPage')
const SessionWorkspacePage = namedPage(() => import('./pages/sessions/SessionsPages'), 'SessionWorkspacePage')
const DevDemoRoutes = import.meta.env.DEV ? lazy(() => import('./DevDemoRoutes')) : null
const AuthProvider = lazy(() => import('./context/AuthContext').then(module => ({ default: module.AuthProvider })))

function AuthBoundary() {
  return <AuthProvider><Outlet/></AuthProvider>
}

const appPages = [
  ['/learning', 'My learning'],
  ['/ai-hub', 'AI Learning Hub'], ['/settings', 'Settings'],
]
const adminPages = [
  ['/admin', 'Admin dashboard'], ['/admin/users', 'User management'], ['/admin/skills', 'Skill management'],
  ['/admin/reports', 'Reports management'], ['/admin/analytics', 'Analytics'], ['/admin/ai-usage', 'AI usage monitoring'],
]

export default function App() {
  return <Suspense fallback={<div className="auth-loading" role="status">Loading SkillSwap…</div>}><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/explore-skills" element={<ExploreSkillsPage />} />
    </Route>
    {import.meta.env.DEV && <Route path="/demo/*" element={<DevDemoRoutes/>}/>}
    <Route element={<AuthBoundary/>}>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/signup" element={<SignupPage/>}/>
      <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
      <Route path="/reset-password" element={<ResetPasswordPage/>}/>
      <Route path="/auth/callback" element={<AuthCallbackPage/>}/>
      <Route path="/suspended" element={<SuspendedPage/>}/>
      <Route element={<ProtectedRoute/>}>
        <Route path="/onboarding" element={<OnboardingPage/>}/>
        <Route element={<AppLayout/>}>
          <Route path="/dashboard" element={<DashboardPage/>}/>
          <Route path="/profile" element={<ProfilePage/>}/>
          <Route path="/skills" element={<SkillsPage/>}/>
          <Route path="/goals" element={<GoalsPage/>}/>
          <Route path="/availability" element={<AvailabilityPage/>}/>
          <Route path="/discover" element={<DiscoverPage/>}/>
          <Route path="/profile/:id" element={<StudentProfilePage/>}/>
          <Route path="/matches" element={<MatchesPage/>}/>
          <Route path="/matches/:id" element={<MatchDetailPage/>}/>
          <Route path="/connections" element={<ConnectionsPage/>}/>
          <Route path="/messages" element={<MessagesPage/>}/>
          <Route path="/messages/:id" element={<MessagesPage/>}/>
          <Route path="/notifications" element={<NotificationsPage/>}/>
          <Route path="/sessions" element={<SessionsPage/>}/>
          <Route path="/sessions/new" element={<BookSessionPage/>}/>
          <Route path="/sessions/:id" element={<SessionDetailPage/>}/>
          <Route path="/sessions/:id/workspace" element={<SessionWorkspacePage/>}/>
          {appPages.map(([path, title]) => <Route key={path} path={path} element={<ComingSoonPage title={title} description="This platform feature is planned for a future SkillSwap phase." />} />)}
        </Route>
      </Route>
      <Route element={<ProtectedRoute admin/>}>
        <Route element={<AdminLayout/>}>
          {adminPages.map(([path, title]) => <Route key={path} path={path} element={<PlaceholderPage title={title} description="Platform overview and community operations." eyebrow="Administration" />} />)}
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>
}

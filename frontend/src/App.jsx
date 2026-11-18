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
const SuspendedPage = namedPage(() => import('./pages/auth/AuthPages'), 'SuspendedPage')
const OnboardingPage = namedPage(() => import('./pages/onboarding/OnboardingPage'), 'OnboardingPage')
const DashboardPage = namedPage(() => import('./pages/dashboard/DashboardPage'), 'DashboardPage')
const AuthProvider = lazy(() => import('./context/AuthContext').then(module => ({ default: module.AuthProvider })))

function AuthBoundary() {
  return <AuthProvider><Outlet/></AuthProvider>
}

const appPages = [
  ['/discover', 'Discover skills'], ['/matches', 'My matches'],
  ['/messages', 'Messages'], ['/sessions', 'Sessions'], ['/learning', 'My learning'],
  ['/ai-hub', 'AI Learning Hub'], ['/goals', 'Learning goals'], ['/profile', 'My profile'], ['/settings', 'Settings'],
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
    <Route element={<AuthBoundary/>}>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/signup" element={<SignupPage/>}/>
      <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
      <Route path="/reset-password" element={<ResetPasswordPage/>}/>
      <Route path="/suspended" element={<SuspendedPage/>}/>
      <Route element={<ProtectedRoute/>}>
        <Route path="/onboarding" element={<OnboardingPage/>}/>
        <Route element={<AppLayout/>}>
          <Route path="/dashboard" element={<DashboardPage/>}/>
          {appPages.map(([path, title]) => <Route key={path} path={path} element={<PlaceholderPage title={title} description="A welcoming space to make progress, share what you know, and learn from your community." eyebrow="SkillSwap workspace" />} />)}
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

import { Component, lazy, Suspense } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DemoProvider } from './context/DemoContext'
import { DemoLayout } from './components/layout/DemoLayout'

const namedPage = name => lazy(() => import('./pages/dashboard/DemoPages').then(module => ({ default: module[name] })))
const pages = {
  '/demo': namedPage('DemoDashboardPage'),
  '/demo/profile': namedPage('DemoProfilePage'),
  '/demo/skills': namedPage('DemoSkillsPage'),
  '/demo/goals': namedPage('DemoGoalsPage'),
  '/demo/availability': namedPage('DemoAvailabilityPage'),
}

class DemoErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (this.state.failed) {
      return <div className="demo-error-fallback" role="alert"><h1>Demo page couldn’t load</h1><p>Your sample data is still separate from your real SkillSwap account. Try reloading this page or exit demo mode.</p><div><button type="button" onClick={() => window.location.reload()}>Reload demo</button><Link to="/login">Exit to login</Link></div></div>
    }
    return this.props.children
  }
}

function DemoPageForLocation() {
  const { pathname } = useLocation()
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  const Page = pages[normalizedPath]
  if (!Page) return <div className="demo-error-fallback"><h1>Demo page not found</h1><p>Choose a section from the demo navigation.</p><Link to="/demo">Back to demo dashboard</Link></div>
  return <DemoErrorBoundary key={normalizedPath}><Suspense fallback={<div className="auth-loading" role="status">Loading demo workspace…</div>}><DemoLayout><Page/></DemoLayout></Suspense></DemoErrorBoundary>
}

export default function DevDemoRoutes() {
  return <DemoProvider><DemoPageForLocation/></DemoProvider>
}

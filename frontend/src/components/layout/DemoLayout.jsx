import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, LayoutDashboard, LogOut, UserRound, Wrench } from 'lucide-react'
import { Logo } from '../common/Logo'

const links = [
  ['/demo', 'Dashboard', LayoutDashboard, true],
  ['/demo/profile', 'My Profile', UserRound],
  ['/demo/skills', 'My Skills', Wrench],
  ['/demo/goals', 'Learning Goals', BookOpen],
  ['/demo/availability', 'Availability', CalendarDays],
]

export function DemoLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const active = links.find(([path, , , exact]) => exact ? path === location.pathname : path === location.pathname)?.[1] ?? 'Demo Dashboard'
  function exit() { navigate('/login', { replace: true }) }
  return <div className="app-shell demo-shell">
    <aside className="desktop-sidebar"><div className="sidebar"><Logo/><div className="side-scroll"><div className="nav-group"><span className="nav-label">DEMO STUDENT</span>{links.map(([path, label, Icon, exact]) => <NavLink key={path} to={path} end={Boolean(exact)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={18}/><span>{label}</span></NavLink>)}</div></div><div className="sidebar-note"><span className="note-icon"><BookOpen size={17}/></span><div><strong>Demo data only</strong><small>Changes stay in this session.</small></div></div></div></aside>
    <div className="app-main"><header className="app-header demo-app-header"><span className="header-title">{active}</span><div className="demo-header-actions"><span className="demo-mode-badge">DEMO MODE</span><button type="button" className="demo-exit" onClick={exit}><LogOut size={15}/> Exit demo</button></div></header><nav className="demo-mobile-nav" aria-label="Demo navigation">{links.map(([path, label, , exact]) => <NavLink key={path} to={path} end={Boolean(exact)}>{label}</NavLink>)}</nav><div className="demo-notice" role="status"><strong>DEMO MODE</strong><span>Sample student information only. Edits are temporary and are never sent to SkillSwap or Supabase.</span></div><main className="demo-main">{children ?? <Outlet/>}</main></div>
  </div>
}

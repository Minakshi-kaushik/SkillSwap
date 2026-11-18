import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, BookOpen, Compass, LayoutDashboard, Menu, MessageCircle, Settings, Shield, Sparkles, Target, Users, UserRound, X, CalendarDays, ChartNoAxesCombined, Wrench, FileText } from 'lucide-react'
import { Logo } from '../common/Logo'
import { Button } from '../common/Button'
import { useAuth } from '../../hooks/useAuth'

const workspace = [
  { label: 'WORKSPACE', items: [['/dashboard', 'Dashboard', LayoutDashboard], ['/discover', 'Discover', Compass], ['/matches', 'My Matches', Users], ['/messages', 'Messages', MessageCircle], ['/sessions', 'Sessions', CalendarDays]] },
  { label: 'MY LEARNING', items: [['/learning', 'My Learning', BookOpen], ['/ai-hub', 'AI Learning Hub', Sparkles], ['/goals', 'Learning Goals', Target]] },
  { label: 'ACCOUNT', items: [['/profile', 'My Profile', UserRound], ['/settings', 'Settings', Settings]] },
]
const admin = [{ label: 'ADMINISTRATION', items: [['/admin', 'Admin Dashboard', LayoutDashboard], ['/admin/users', 'User Management', Users], ['/admin/skills', 'Skill Management', Wrench], ['/admin/reports', 'Reports Management', FileText], ['/admin/analytics', 'Analytics', ChartNoAxesCombined], ['/admin/ai-usage', 'AI Usage Monitoring', Shield]] }]

function SideNav({ groups, adminMode = false }) {
  return <aside className="sidebar"><Logo /><div className="side-scroll">{groups.map(group => <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{group.items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/dashboard' || to === '/admin'} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</div>)}</div><div className="sidebar-note"><span className="note-icon"><Sparkles size={17} /></span><div><strong>{adminMode ? 'Community first' : 'Small steps add up'}</strong><small>{adminMode ? 'Growing together, every day.' : 'Your next skill is within reach.'}</small></div></div></aside>
}

function AppShell({ children, adminMode = false }) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const { user, profile } = useAuth()
  const { pathname } = useLocation()
  const group = adminMode ? admin : workspace
  const active = group.flatMap(g => g.items).find(([to]) => pathname === to)
  async function logout() {
    if (!supabase) return
    setSigningOut(true); setSignOutError('')
    try { const { supabase } = await import('../../services/supabase'); if (!supabase) throw new Error('Authentication is not configured.'); const { error } = await supabase.auth.signOut(); if (error) throw error }
    catch { setSignOutError('We couldn’t sign you out. Please try again.') }
    finally { setSigningOut(false) }
  }
  const accountName = profile?.full_name || profile?.name || user?.user_metadata?.full_name || 'My account'
  return <div className="app-shell"><div className={`sidebar-backdrop ${open ? 'visible' : ''}`} onClick={() => setOpen(false)} /><div className={`mobile-sidebar ${open ? 'open' : ''}`}><button className="close-nav" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button><SideNav groups={group} adminMode={adminMode} /></div><div className="desktop-sidebar"><SideNav groups={group} adminMode={adminMode} /></div><div className="app-main"><header className="app-header"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={21} /></button><span className="header-title">{active?.[1] || (pathname === '/dashboard' ? 'Dashboard' : 'SkillSwap')}</span><div className="header-actions"><button className="icon-button" aria-label="Notifications"><Bell size={19} /><i /></button><span className="header-divider" /><button className="profile-chip sign-out-button" onClick={logout} disabled={signingOut} title="Sign out"><span className="avatar">{accountName.slice(0,1).toUpperCase()}</span><span>{signingOut ? 'Signing out…' : accountName}</span></button></div></header>{signOutError && <div className="app-inline-alert" role="alert">{signOutError}</div>}{children}</div></div>
}

export function AppLayout() { return <AppShell><Outlet /></AppShell> }
export function AdminLayout() { return <AppShell adminMode><Outlet /></AppShell> }
export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  return <div className="public-shell"><header className="public-header"><Logo /><button className="public-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button><nav className={`public-nav ${menuOpen ? 'public-nav-open' : ''}`} aria-label="Main navigation"><Link to="/how-it-works" onClick={closeMenu}>How it works</Link><Link to="/explore-skills" onClick={closeMenu}>Explore skills</Link><Link to="/about" onClick={closeMenu}>About</Link><div className="mobile-public-actions"><Button to="/login" variant="quiet" onClick={closeMenu}>Log in</Button><Button to="/signup" onClick={closeMenu}>Get started</Button></div></nav><div className="public-actions desktop-public-actions"><Button to="/login" variant="quiet">Log in</Button><Button to="/signup">Get started</Button></div></header><main><Outlet /></main><footer className="public-footer"><div className="footer-top"><div className="footer-brand"><Logo compact /><p>Exchange what you know. Discover what you can do.</p></div><div className="footer-links"><div><strong>Explore</strong><Link to="/explore-skills">Skills</Link><Link to="/how-it-works">How it works</Link></div><div><strong>SkillSwap</strong><Link to="/about">About us</Link><Link to="/signup">Join the community</Link></div><div><strong>Your account</strong><Link to="/login">Log in</Link><Link to="/signup">Get started</Link></div></div></div><div className="footer-bottom"><small>© 2026 SkillSwap</small><span>Exchange. Learn. Grow.</span></div></footer></div>
}

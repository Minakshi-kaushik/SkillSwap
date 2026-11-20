import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo } from '../../components/common/Logo'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiErrorMessage } from '../../services/api'

function AuthShell({ eyebrow, title, description, children, alternate, sideTitle, sideCopy }) {
  return <div className="auth-page"><aside className="auth-aside"><Logo/><div className="auth-aside-copy"><span className="eyebrow"><Sparkles size={14}/> Exchange. Learn. Grow.</span><h2>{sideTitle}</h2><p>{sideCopy}</p><div className="auth-aside-art"><div className="auth-art-circle"/><div className="auth-art-card auth-art-one"><span>01</span><strong>Share what you know</strong></div><div className="auth-art-card auth-art-two"><span>02</span><strong>Learn something new</strong></div><div className="auth-art-link">↗</div></div></div><small className="auth-aside-foot">A community built on mutual learning.</small></aside><main className="auth-main"><div className="auth-mobile-brand"><Logo compact/></div><div className="auth-card"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p className="auth-description">{description}</p>{children}{alternate && <p className="auth-alternate">{alternate}</p>}</div><small className="auth-mobile-foot">SkillSwap · Exchange. Learn. Grow.</small></main></div>
}

function ConfigurationNote() {
  return !supabase && <div className="form-alert" role="alert">Authentication isn’t configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your local <code>.env</code>, then restart Vite.</div>
}

function PasswordField({ label = 'Password', value, onChange, name = 'password', hint, error, required = true, autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false)
  return <div className="password-field"><Input label={label} name={name} type={visible ? 'text' : 'password'} value={value} onChange={onChange} hint={hint} error={error} required={required} autoComplete={autoComplete} minLength={8}/><button type="button" className="password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
}

function authError(error) {
  const message = apiErrorMessage(error)
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Please check them and try again.'
  if (/email not confirmed/i.test(message)) return 'Please verify your email address before logging in. Check your inbox or resend the verification email below.'
  if (/user already registered/i.test(message)) return 'An account already exists for this email. Try logging in instead.'
  return message
}

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  if (session && profile) {
    if (profile.status?.toLowerCase() === 'suspended' || profile.account_status?.toLowerCase() === 'suspended') return <Navigate to="/suspended" replace/>
    return <Navigate to={profile.onboarding_completed ? '/dashboard' : '/onboarding'} replace/>
  }

  async function submit(event) {
    event.preventDefault()
    setError(''); setNotice('')
    if (!supabase) return setError('Supabase is not configured. Add the Supabase URL and publishable key to .env.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email address.')
    if (!form.password) return setError('Enter your password to log in.')
    setBusy(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      if (signInError) throw signInError
      const activeSession = data.session ?? (await supabase.auth.getSession()).data.session
      if (!activeSession) throw new Error('Your session could not be started. Please try signing in again.')
      const member = await refreshProfile(activeSession)
      if (member?.status?.toLowerCase() === 'suspended' || member?.account_status?.toLowerCase() === 'suspended') navigate('/suspended', { replace: true })
      else navigate(member?.onboarding_completed ? (location.state?.from?.pathname || '/dashboard') : '/onboarding', { replace: true })
    } catch (submitError) {
      if (submitError?.code === 'ACCOUNT_SUSPENDED') navigate('/suspended', { replace: true })
      else setError(authError(submitError))
    } finally { setBusy(false) }
  }

  async function resendVerification() {
    if (!supabase || !form.email.trim()) return setError('Enter your email address first so we know where to send the verification link.')
    setResending(true); setError(''); setNotice('')
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: form.email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      if (resendError) throw resendError
      setNotice('A new verification link has been sent. Check your inbox.')
    } catch (resendError) { setError(authError(resendError)) }
    finally { setResending(false) }
  }

  return <AuthShell eyebrow="Welcome back" title="Good to see you." description="Sign in to pick up where your learning journey left off." sideTitle="Your next skill is closer than you think." sideCopy="Meet people who are ready to share what they know and learn what you’re excited about." alternate={<>New to SkillSwap? <Link to="/signup">Create an account <ArrowRight size={14}/></Link></>}>
    <ConfigurationNote/>{params.get('verified') === '1' && <div className="form-success" role="status"><ShieldCheck size={17}/> Your email is verified. You can now log in.</div>}{error && <div className="form-alert" role="alert">{error}{/verify your email/i.test(error) && <button type="button" className="text-action" onClick={resendVerification} disabled={resending}>{resending ? 'Sending…' : 'Resend verification email'}</button>}</div>}{notice && <div className="form-success" role="status">{notice}</div>}
    <form className="auth-form" onSubmit={submit} noValidate><Input label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required/><PasswordField value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/><div className="form-meta"><span>Use your SkillSwap account email</span><Link to="/forgot-password">Forgot password?</Link></div><Button type="submit" disabled={busy || !supabase} className="auth-submit">{busy ? 'Signing in…' : 'Log in'} {!busy && <ArrowRight size={16}/>}</Button></form>
    {import.meta.env.DEV && <Link to="/demo" className="demo-login-link"><span className="demo-mode-badge">DEMO</span><span><strong>Explore Demo Dashboard</strong><small>Try the student experience with sample data</small></span><ArrowRight size={16}/></Link>}
  </AuthShell>
}

export function SignupPage() {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirm: '', terms: false })
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendNotice, setResendNotice] = useState('')
  const update = event => setForm({ ...form, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value })

  async function submit(event) {
    event.preventDefault(); setError('')
    if (!supabase) return setError('Supabase is not configured. Add the Supabase URL and publishable key to .env.')
    if (!form.fullName.trim() || form.fullName.trim().length > 100) return setError('Enter a full name using 1 to 100 characters.')
    if (!/^[a-z0-9_]{3,30}$/.test(form.username.trim().toLowerCase())) return setError('Username must be 3–30 lowercase letters, numbers, or underscores.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email address.')
    if (form.password.length < 8) return setError('Choose a password with at least 8 characters.')
    if (form.password !== form.confirm) return setError('Your passwords don’t match.')
    if (!form.terms) return setError('Please accept the terms to create your account.')
    setBusy(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(), password: form.password,
        options: { data: { full_name: form.fullName.trim(), username: form.username.trim().toLowerCase() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (signUpError) throw signUpError
      if (data.session && !data.user?.email_confirmed_at) {
        await supabase.auth.signOut()
        throw new Error('Email verification is required, but the Supabase project returned an unverified session. Enable email confirmations in Supabase Auth settings.')
      }
      setSent(true)
    } catch (signupError) { setError(authError(signupError)) }
    finally { setBusy(false) }
  }

  async function resendVerification() {
    if (!supabase) return
    setResending(true); setError(''); setResendNotice('')
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: form.email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      if (resendError) throw resendError
      setResendNotice('A new verification email has been sent.')
    } catch (resendError) { setError(authError(resendError)) }
    finally { setResending(false) }
  }

  if (sent) return <AuthShell eyebrow="One quick check" title="Check your inbox." description={`We’ve sent a verification link to ${form.email}. Verify your email before logging in.`} sideTitle="A skill exchange starts with a hello." sideCopy="Create your profile, share what you know, and find a new skill to explore." alternate={<>Already verified? <Link to="/login">Log in <ArrowRight size={14}/></Link></>}><div className="verify-card"><span className="verify-icon"><Mail size={23}/></span><strong>Verification email sent</strong><p>Open the link in your email to confirm your account. If you don’t see it, check your spam folder.</p>{error && <div className="form-alert" role="alert">{error}</div>}{resendNotice && <div className="form-success" role="status">{resendNotice}</div>}<button type="button" className="text-action" disabled={resending} onClick={resendVerification}>{resending ? 'Sending…' : 'Resend verification email'}</button><Link to="/login" className="text-action">Back to log in <ArrowRight size={14}/></Link></div></AuthShell>

  return <AuthShell eyebrow="Your learning journey starts here" title="Make room to grow." description="Create your account and bring your curiosity to the exchange." sideTitle="Everyone has something to teach and something to learn." sideCopy="SkillSwap makes room for both, one thoughtful exchange at a time." alternate={<>Already have an account? <Link to="/login">Log in <ArrowRight size={14}/></Link></>}>
    <ConfigurationNote/>{error && <div className="form-alert" role="alert">{error}</div>}<form className="auth-form" onSubmit={submit} noValidate><Input label="Full name" name="fullName" autoComplete="name" maxLength={100} placeholder="Your name" value={form.fullName} onChange={update} required/><Input label="Username" name="username" autoComplete="username" maxLength={30} placeholder="Choose a username" hint="3-30 lowercase letters, numbers, or underscores." value={form.username} onChange={update} required/><Input label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update} required/><PasswordField label="Password" name="password" autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} hint="Use at least 8 characters."/><PasswordField label="Confirm password" name="confirm" autoComplete="new-password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}/><label className="terms-check"><input type="checkbox" name="terms" checked={form.terms} onChange={update}/><span>I agree to take part in SkillSwap’s respectful learning community and understand email verification is required.</span></label><Button type="submit" disabled={busy || !supabase} className="auth-submit">{busy ? 'Creating account…' : 'Create account'} {!busy && <ArrowRight size={16}/>}</Button><small className="verify-hint"><ShieldCheck size={14}/> We’ll ask you to verify your email before you log in.</small></form>
  </AuthShell>
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setError('')
    if (!supabase) return setError('Supabase is not configured. Add the Supabase URL and publishable key to .env.')
    setBusy(true)
    try { const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` }); if (resetError) throw resetError; setSent(true) }
    catch (submitError) { setError(authError(submitError)) }
    finally { setBusy(false) }
  }
  return <AuthShell eyebrow="Account recovery" title={sent ? 'Check your inbox.' : 'Forgot your password?'} description={sent ? `If an account exists for ${email}, a reset link is on its way.` : 'Enter your account email and we’ll send you a password reset link.'} sideTitle="A fresh start is just around the corner." sideCopy="We’ll help you get back to the skills, people, and ideas you came for." alternate={<Link to="/login"><ArrowLeft size={14}/> Back to log in</Link>}>
    <ConfigurationNote/>{error && <div className="form-alert" role="alert">{error}</div>}{sent ? <div className="verify-card"><span className="verify-icon"><Mail size={23}/></span><strong>Password reset email sent</strong><p>Follow the link in the email to choose a new password. You can close this page.</p><Button to="/login" variant="outline">Back to log in</Button></div> : <form className="auth-form" onSubmit={submit}><Input label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/><Button type="submit" disabled={busy || !supabase} className="auth-submit">{busy ? 'Sending link…' : 'Send reset link'} {!busy && <ArrowRight size={16}/>}</Button></form>}
  </AuthShell>
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState(false); const [busy, setBusy] = useState(false); const { recoverySession, clearRecoverySession } = useAuth()
  async function submit(event) {
    event.preventDefault(); setError('')
    if (password.length < 8) return setError('Choose a password with at least 8 characters.')
    if (password !== confirm) return setError('Your passwords don’t match.')
    if (!supabase) return setError('Supabase is not configured. Add the Supabase URL and publishable key to .env.')
    setBusy(true)
    try { const { error: updateError } = await supabase.auth.updateUser({ password }); if (updateError) throw updateError; await supabase.auth.signOut(); clearRecoverySession(); setSuccess(true) }
    catch (updateError) { setError(authError(updateError)) }
    finally { setBusy(false) }
  }
  return <AuthShell eyebrow="Choose a new password" title={success ? 'Password updated.' : 'Set a new password.'} description={success ? 'Your password has been updated. Log in with your new password to continue.' : 'Choose a new password to secure your SkillSwap account.'} sideTitle="Your learning journey is waiting." sideCopy="Get back to learning and sharing with a password you’ll remember." alternate={<Link to="/login"><ArrowLeft size={14}/> Back to log in</Link>}>
    {success ? <div className="verify-card"><span className="verify-icon"><KeyRound size={23}/></span><strong>You’re all set</strong><p>Your password was changed successfully.</p><Button to="/login">Go to login <ArrowRight size={16}/></Button></div> : recoverySession ? <>{error && <div className="form-alert" role="alert">{error}</div>}<form className="auth-form" onSubmit={submit}><PasswordField label="New password" name="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} hint="Use at least 8 characters."/><PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}/><Button type="submit" disabled={busy || !supabase} className="auth-submit">{busy ? 'Updating password…' : 'Update password'} {!busy && <ArrowRight size={16}/>}</Button></form></> : <div className="form-alert" role="status">Open the password reset link from your email to set a new password. <Link to="/forgot-password" className="text-action">Send another reset link</Link></div>}
  </AuthShell>
}

export function AuthCallbackPage() {
  const { session, profile, loading, profileError, refreshProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [settled, setSettled] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const query = new URLSearchParams(location.search)
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  const errorDescription = query.get('error_description') || hash.get('error_description')
  const errorCode = query.get('error_code') || query.get('error') || hash.get('error_code') || hash.get('error')

  useEffect(() => {
    if (loading || session || errorDescription || errorCode) return undefined
    const timer = window.setTimeout(() => setSettled(true), 1500)
    return () => window.clearTimeout(timer)
  }, [loading, session, errorDescription, errorCode])

  useEffect(() => {
    if (!session || !profile || loading) return
    if (profile.account_status === 'SUSPENDED') navigate('/suspended', { replace: true })
    else navigate(profile.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true })
  }, [session, profile, loading, navigate])

  async function retryProfile() {
    setRetrying(true)
    try { await refreshProfile(session) } catch { /* The inline profile error remains available for the user. */ }
    finally { setRetrying(false) }
  }

  const expiredLink = /expired|invalid|already used|access_denied/i.test(`${errorCode ?? ''} ${errorDescription ?? ''}`)
  return <AuthShell eyebrow="Email verification" title={errorDescription ? (expiredLink ? 'This verification link has expired.' : 'We couldn’t verify this link.') : 'Finishing your sign-in…'} description={errorDescription ? 'Request a fresh verification email, then open its link from the same address you used to sign up.' : 'Your email confirmation is being checked securely with Supabase.'} sideTitle="One last step to get started." sideCopy="Once your email is confirmed, we’ll take you to the right place in your SkillSwap account.">
    {errorDescription ? <div className="verify-card"><span className="verify-icon"><ShieldCheck size={23}/></span><strong>{errorCode || 'Verification error'}</strong><p>{errorDescription}</p><Button to="/login" variant="outline">Back to log in</Button></div> : loading || (session && !profile && !profileError) ? <div className="callback-loading" role="status"><LoaderCircle className="spin" size={20}/> Confirming your account…</div> : profileError ? <div className="verify-card"><strong>Your email link was received, but we couldn’t load your account.</strong><p>{profileError}</p><Button onClick={retryProfile} disabled={retrying}>{retrying ? 'Retrying…' : 'Retry account check'}</Button><Link to="/login" className="text-action">Go to log in</Link></div> : settled ? <div className="verify-card"><span className="verify-icon"><ShieldCheck size={23}/></span><strong>Email link processed</strong><p>If your address is verified, log in to continue. We couldn’t establish a session from this link.</p><Button to="/login?verified=1">Continue to log in</Button></div> : <div className="callback-loading" role="status"><LoaderCircle className="spin" size={20}/> Waiting for Supabase to establish your session…</div>}
  </AuthShell>
}

export function SuspendedPage() {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function logout() { if (supabase) { setBusy(true); setError(''); try { const { error: signOutError } = await supabase.auth.signOut(); if (signOutError) throw signOutError } catch { setError('We couldn’t sign you out. Please try again.') } finally { setBusy(false) } } }
  return <div className="suspended-page"><div className="suspended-card"><span className="suspended-icon"><ShieldCheck/></span><span className="eyebrow">Account status</span><h1>We can’t open your account right now.</h1><p>Your SkillSwap account is currently suspended. If you think this is a mistake, please contact the SkillSwap team for help.</p>{error && <div className="form-alert" role="alert">{error}</div>}{session && <Button onClick={logout} disabled={busy} variant="outline">{busy ? 'Signing out…' : 'Sign out'}</Button>}</div></div>
}

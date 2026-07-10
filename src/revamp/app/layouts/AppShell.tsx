import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Plus, Settings } from 'lucide-react'
import s from './AppShell.module.css'
import { DESTINATIONS, MOBILE_NAV } from '../nav'
import { Button, IconButton } from '../../shared/ui'
import { SceneMount } from '../../scene/SceneMount'
import { stationForPath } from '../../scene/stations'
import { useScene } from '../../stores/scene'

/** Route-level boundary (plan §9.10): one broken workspace never blanks the app. */
class RouteErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false })
  }
  render() {
    if (this.state.failed) {
      return (
        <div className={s.routeError} role="alert">
          <h2>This workspace hit an error</h2>
          <p>Your data is safe. Navigate elsewhere, or reload this section.</p>
          <button type="button" onClick={() => this.setState({ failed: false })}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(
    () => window.matchMedia('(min-width: 900px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const onChange = () => setDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}

export function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)
  const isDesktop = useIsDesktop()
  const online = useOnline()

  // route → camera (mobile is 2D-first: the scene never runs there)
  useEffect(() => {
    if (isDesktop) useScene.getState().routeChanged(pathname)
    else useScene.setState({ paused: true })
  }, [pathname, isDesktop])

  // SPA navigation: move focus to the new page so its title is read next
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [pathname])

  const current =
    pathname === '/app'
      ? DESTINATIONS[0]
      : DESTINATIONS.find((d) => d.id !== 'overview' && pathname.startsWith(d.path))

  return (
    <div className={s.shell}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <header className={s.topbar} data-surface="dark">
        <NavLink to="/app" className={s.wordmarkLink}>
          <span className="wordmark">The Wardrobe</span>
        </NavLink>
        <span className={s.topTitle} aria-hidden>
          {current ? current.label : pathname.startsWith('/app/settings') ? 'Settings' : ''}
        </span>
        <div className={s.topActions}>
          <Button variant="primary" onClick={() => navigate('/app/import')} className={s.addBtn}>
            <Plus aria-hidden size={16} />
            Add item
          </Button>
          <IconButton label="Settings" onClick={() => navigate('/app/settings')}>
            <Settings />
          </IconButton>
        </div>
      </header>

      <nav className={s.rail} data-surface="dark" aria-label="Destinations">
        {DESTINATIONS.map((d) => (
          <NavLink key={d.id} to={d.path} end={d.id === 'overview'} className={s.railItem}>
            <d.icon aria-hidden />
            <span>{d.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={s.contentCell}>
        {isDesktop && <SceneMount />}
        <main
          className={[s.main, stationForPath(pathname) === null && s.mainOpaque]
            .filter(Boolean)
            .join(' ')}
          data-surface="light"
          id="main"
          ref={mainRef}
          tabIndex={-1}
        >
          {!online && (
            <div className={s.offline} role="status">
              Offline — changes stay on this device and nothing is lost.
            </div>
          )}
          <RouteErrorBoundary resetKey={pathname}>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>

      <nav className={s.bottomNav} data-surface="dark" aria-label="Destinations">
        {MOBILE_NAV.map((d) =>
          d.id === 'import' ? (
            <NavLink key={d.id} to={d.path} className={s.bottomAdd} aria-label="Add item">
              <Plus aria-hidden />
            </NavLink>
          ) : (
            <NavLink key={d.id} to={d.path} className={s.bottomItem}>
              <d.icon aria-hidden />
              <span>{d.id === 'outfits' ? 'Outfits' : d.id === 'style' ? 'Style' : d.label}</span>
            </NavLink>
          ),
        )}
      </nav>
    </div>
  )
}

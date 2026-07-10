import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Plus, Settings } from 'lucide-react'
import s from './AppShell.module.css'
import { DESTINATIONS, MOBILE_NAV } from '../nav'
import { Button, IconButton } from '../../shared/ui'

export function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

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

      <main className={s.main} data-surface="light" id="main" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>

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

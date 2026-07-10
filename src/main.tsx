/**
 * Entry dispatcher — the legacy app stays the default until the rebuild's
 * vertical slice passes its gate (plan §13). The revamp loads only when
 * asked for, so neither bundle nor CSS of one leaks into the other.
 *
 * Enable the rebuild shell with VITE_WARDROBE_REVAMP=1, or in dev with
 * ?revamp (sticky for the session).
 */
const params = new URLSearchParams(window.location.search)
const devToggle =
  import.meta.env.DEV &&
  (params.has('revamp') || sessionStorage.getItem('wardrobe:revamp') === '1')
if (import.meta.env.DEV && params.has('revamp')) {
  sessionStorage.setItem('wardrobe:revamp', '1')
}

if (import.meta.env.VITE_WARDROBE_REVAMP === '1' || devToggle) {
  import('./revamp/boot')
} else {
  import('./boot-legacy')
}

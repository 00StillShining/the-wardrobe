import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import {
  CollectionPage,
  ImportPage,
  InsightsPage,
  OutfitsPage,
  OverviewPage,
  SettingsPage,
  SignInPage,
  StylePage,
} from './routes/placeholders'
import { FixturesPage } from './routes/Fixtures'

/** Real routes, not hashes (plan §5). Camera state joins in Phase 2. */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/auth/sign-in', element: <SignInPage /> },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'collection', element: <CollectionPage /> },
      { path: 'outfits', element: <OutfitsPage /> },
      { path: 'style', element: <StylePage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'import', element: <ImportPage /> },
      { path: 'settings/*', element: <SettingsPage /> },
      { path: 'fixtures', element: <FixturesPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
])

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { OnboardingGate, RequireSession } from './backend'
import {
  CollectionPage,
  ImportPage,
  InsightsPage,
  ItemDetailPage,
  OutfitsPage,
  OutfitStudioPage,
  OverviewPage,
  SettingsPage,
  SignInPage,
  StylePage,
} from './routes/placeholders'
import { WelcomePage } from './routes/Welcome'
import { FixturesPage } from './routes/Fixtures'

/** Real routes, not hashes (plan §5). Camera state follows the route. */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/auth/sign-in', element: <SignInPage /> },
  {
    path: '/app/welcome',
    element: (
      <RequireSession>
        <WelcomePage />
      </RequireSession>
    ),
  },
  {
    path: '/app',
    element: (
      <RequireSession>
        <OnboardingGate>
          <AppShell />
        </OnboardingGate>
      </RequireSession>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'collection', element: <CollectionPage /> },
      { path: 'collection/:itemId', element: <ItemDetailPage /> },
      { path: 'outfits', element: <OutfitsPage /> },
      { path: 'outfits/new', element: <OutfitStudioPage /> },
      { path: 'outfits/:outfitId', element: <OutfitStudioPage /> },
      { path: 'style', element: <StylePage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'import', element: <ImportPage /> },
      { path: 'settings/*', element: <SettingsPage /> },
      { path: 'fixtures', element: <FixturesPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
])

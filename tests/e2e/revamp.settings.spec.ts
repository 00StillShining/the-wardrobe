import { expect, test } from '@playwright/test'

/** Phase 9: profile persistence, data export, sign-out. */

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => sessionStorage.setItem('wardrobe:revamp', '1'))
})

test('settings: profile saves and persists, export downloads, sign-out guards', async ({ page }) => {
  await page.goto('/app/settings')
  await page.fill('input[type=email]', 'settings@example.com')
  await page.click('button[type=submit]')
  await page.fill('input[placeholder="Display name"]', 'Before')
  await page.click('text=Explore the empty wardrobe')

  // profile edit persists across reload
  await page.goto('/app/settings')
  await page.getByLabel('Display name').fill('After Rename')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile saved')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Display name')).toHaveValue('After Rename')

  // export downloads a machine-readable JSON
  await page.getByRole('tab', { name: 'Data' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export data (JSON)' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/wardrobe-export-.*\.json/)

  // sign out returns to sign-in; the app route is guarded again
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/auth\/sign-in/)
  await page.goto('/app/collection')
  await expect(page).toHaveURL(/auth\/sign-in/)
})

test('preferences: reduced motion applies to the scene immediately', async ({ page }) => {
  await page.goto('/app/settings')
  await page.fill('input[type=email]', 'prefs@example.com')
  await page.click('button[type=submit]')
  await page.fill('input[placeholder="Display name"]', 'Prefs')
  await page.click('text=Explore the empty wardrobe')

  await page.goto('/app/settings')
  await page.getByRole('tab', { name: 'Preferences' }).click()
  await page.getByRole('switch', { name: /Reduced motion/ }).check()
  const fullMotion = await page.evaluate(() => window.__scene.getState().fullMotion)
  expect(fullMotion).toBe(false)
})

declare global {
  interface Window {
    __scene: { getState: () => { fullMotion: boolean } }
  }
}

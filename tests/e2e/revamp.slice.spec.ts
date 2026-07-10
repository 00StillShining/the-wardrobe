import { expect, test, type Page } from '@playwright/test'

/**
 * Phase 4 vertical slice (plan §14): sign in → onboard → add a real photo →
 * review the cutout → save → find it in Collection → edit/archive/delete.
 * Runs the rebuild app (revamp flag via sessionStorage before any script).
 */

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => sessionStorage.setItem('wardrobe:revamp', '1'))
})

async function signInAndOnboard(page: Page) {
  await page.goto('/app/collection')
  await expect(page).toHaveURL(/auth\/sign-in/)
  await page.fill('input[type=email]', 'e2e@example.com')
  await page.click('button[type=submit]')
  await page.fill('input[placeholder="Display name"]', 'E2E')
  await page.click('text=Explore the empty wardrobe')
  await expect(page).toHaveURL(/app\/collection/)
}

async function addGarment(page: Page, name: string) {
  await page.goto('/app/import')
  await page.setInputFiles('input[aria-label="Choose a garment photo"]', 'tests/fixtures/garment.png')
  await expect(page.getByText('Review the cutout')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Category').selectOption('tops')
  await page.getByRole('button', { name: 'Save to Collection' }).click()
  await expect(page).toHaveURL(/app\/collection\/[\w-]+/, { timeout: 15000 })
}

test('primary path: add a garment photo and find it in Collection', async ({ page }) => {
  await signInAndOnboard(page)
  await expect(page.getByText('No garments yet')).toBeVisible()

  await addGarment(page, 'Bottle Green Tee')

  // detail shows the saved item with an image and extracted palette
  await expect(page.getByRole('heading', { name: 'Bottle Green Tee' })).toBeVisible()
  await expect(page.locator('img[alt="Bottle Green Tee"]')).toBeVisible()

  // back in Collection the tile exists, search narrows, filters clear
  await page.getByRole('link', { name: /Collection/ }).first().click()
  await expect(page.getByRole('link', { name: /Bottle Green Tee/ })).toBeVisible()
  await page.getByLabel('Search').fill('nothing-matches-this')
  await expect(page.getByText('No matches')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByRole('link', { name: /Bottle Green Tee/ })).toBeVisible()
})

test('rejects an invalid file with a visible error', async ({ page }) => {
  await signInAndOnboard(page)
  await page.goto('/app/import')
  await page.setInputFiles('input[aria-label="Choose a garment photo"]', {
    name: 'not-an-image.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('plain text'),
  })
  await expect(page.getByText('Use a JPEG, PNG or WebP photo.')).toBeVisible()
})

test('edit, archive and delete round-trip', async ({ page }) => {
  await signInAndOnboard(page)
  await addGarment(page, 'Edit Target')

  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Name').fill('Edited Name')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edited Name' })).toBeVisible()

  await page.getByRole('button', { name: 'Archive' }).click()
  await expect(page.getByRole('button', { name: 'Archived' })).toBeDisabled()

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText('Delete this garment?')).toBeVisible()
  await page.getByRole('button', { name: 'Delete garment' }).click()
  await expect(page).toHaveURL(/app\/collection$/)
  await expect(page.getByText('No garments yet')).toBeVisible()
})

test('processing job survives reload and can be resumed or discarded', async ({ page }) => {
  await signInAndOnboard(page)
  await page.goto('/app/import')
  await page.setInputFiles('input[aria-label="Choose a garment photo"]', 'tests/fixtures/garment.png')
  await expect(page.getByText('Review the cutout')).toBeVisible({ timeout: 15000 })

  // abandon mid-flow: the durable job must offer resume after reload
  await page.reload()
  await expect(page.getByText('Unfinished import')).toBeVisible()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByText('Review the cutout')).toBeVisible({ timeout: 15000 })

  // cancel cleans up
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByText('Choose a photo')).toBeVisible()
  await expect(page.getByText('Unfinished import')).not.toBeVisible()
})

import { expect, test, type Page } from '@playwright/test'

/** Phases 6 + 8: outfit persistence, duplication, wear logging, honest insights. */

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => sessionStorage.setItem('wardrobe:revamp', '1'))
})

async function bootstrapWithGarment(page: Page, name: string) {
  await page.goto('/app/collection')
  await page.fill('input[type=email]', 'studio@example.com')
  await page.click('button[type=submit]')
  await page.fill('input[placeholder="Display name"]', 'Studio')
  await page.click('text=Explore the empty wardrobe')
  await page.goto('/app/import')
  await page.setInputFiles('input[aria-label="Choose a garment photo"]', 'tests/fixtures/garment.png')
  await expect(page.getByText('Review the cutout')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Category').selectOption('tops')
  await page.getByRole('button', { name: 'Save to Collection' }).click()
  await expect(page).toHaveURL(/app\/collection\/[\w-]+/, { timeout: 15000 })
}

test('outfit: build, save, persist across reload, log worn, see it in insights', async ({ page }) => {
  await bootstrapWithGarment(page, 'Studio Tee')

  // build an outfit from the tray
  await page.goto('/app/outfits/new')
  await page.getByLabel('Name').fill('Monday Look')
  await page.locator('[aria-label="Garment tray"]').getByRole('button', { name: 'Studio Tee' }).click()
  await expect(page.locator('[aria-label="Layers"]').getByText('Studio Tee')).toBeVisible()
  await page.getByRole('button', { name: 'Save outfit' }).click()
  await expect(page).toHaveURL(/app\/outfits\/[\w-]+/, { timeout: 15000 })
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible()

  // persistence is exact after reload (Phase 6 gate)
  await page.reload()
  await expect(page.getByLabel('Name')).toHaveValue('Monday Look')
  await expect(page.locator('[aria-label="Layers"]').getByText('Studio Tee')).toBeVisible()

  // wear logging flows into item counts and insights (Phase 8)
  await page.getByRole('button', { name: 'Log worn today' }).click()
  await expect(page.getByText('Logged as worn today')).toBeVisible()
  await page.goto('/app/insights')
  await expect(page.getByRole('link', { name: /Studio Tee/ }).first()).toBeVisible()
  await expect(page.getByText('1 wears')).toBeVisible()
})

test('outfit list: duplicate creates a distinguishable copy, delete removes', async ({ page }) => {
  await bootstrapWithGarment(page, 'Dup Tee')
  await page.goto('/app/outfits/new')
  await page.getByLabel('Name').fill('Base Look')
  await page.locator('[aria-label="Garment tray"]').getByRole('button', { name: 'Dup Tee' }).click()
  await page.getByRole('button', { name: 'Save outfit' }).click()
  await expect(page).toHaveURL(/app\/outfits\/[\w-]+/, { timeout: 15000 })

  await page.goto('/app/outfits')
  await page.getByRole('button', { name: 'Actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Base Look (copy)', { timeout: 15000 })

  await page.goto('/app/outfits')
  await expect(page.getByText('Base Look (copy)')).toBeVisible()
  await page.getByRole('button', { name: 'Actions' }).nth(0).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByText('Outfit deleted')).toBeVisible()
})

test('insights: totals stay honest about missing prices and drill through', async ({ page }) => {
  await bootstrapWithGarment(page, 'No Price Coat')
  await page.goto('/app/insights')
  await expect(page.getByText(/without a price — total is\s+incomplete/)).toBeVisible()
  await expect(page.getByText('Complete your records')).toBeVisible()
  await page.getByRole('button', { name: 'Open in Collection →' }).click()
  await expect(page).toHaveURL(/app\/collection$/)
  await expect(page.getByRole('link', { name: /No Price Coat/ })).toBeVisible()
})

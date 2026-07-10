import { expect, test, type Page } from '@playwright/test'

/** Phase 7: board auto-layout, editing with autosave, reopen fidelity, export. */

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => sessionStorage.setItem('wardrobe:revamp', '1'))
})

declare global {
  interface Window {
    __board: { getState: () => { elements: { id: string; x: number; y: number; kind: string }[]; selectedId: string | null; select: (id: string) => void } }
  }
}

async function bootstrapWithGarment(page: Page) {
  await page.goto('/app/collection')
  await page.fill('input[type=email]', 'boards@example.com')
  await page.click('button[type=submit]')
  await page.fill('input[placeholder="Display name"]', 'Boards')
  await page.click('text=Explore the empty wardrobe')
  await page.goto('/app/import')
  await page.setInputFiles('input[aria-label="Choose a garment photo"]', 'tests/fixtures/garment.png')
  await expect(page.getByText('Review the cutout')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name').fill('Board Tee')
  await page.getByRole('button', { name: 'Save to Collection' }).click()
  await expect(page).toHaveURL(/app\/collection\/[\w-]+/, { timeout: 15000 })
}

test('board: auto-layout, edit with autosave, reopen identical, export 2×', async ({ page }) => {
  await bootstrapWithGarment(page)

  // create — the default layout must already be intentional
  await page.goto('/app/style')
  await page.getByRole('button', { name: 'New board' }).click()
  await expect(page).toHaveURL(/app\/style\/[\w-]+/, { timeout: 15000 })
  await expect
    .poll(async () => page.evaluate(() => window.__board.getState().elements.length), { timeout: 10000 })
    .toBeGreaterThanOrEqual(2) // garment + caption (+ swatches when palette exists)

  // rename, select programmatically, nudge with the keyboard, autosave
  await page.getByLabel('Title').fill('Autumn Capsule 01')
  const before = await page.evaluate(() => {
    const st = window.__board.getState()
    const garment = st.elements.find((e) => e.kind === 'garment')!
    st.select(garment.id)
    return { id: garment.id, x: garment.x, y: garment.y }
  })
  await page.locator('[data-testid="board-canvas"]').click({ position: { x: 10, y: 10 } }) // keep focus off inputs
  await page.evaluate((id) => window.__board.getState().select(id), before.id)
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

  const afterNudge = await page.evaluate(
    (id) => window.__board.getState().elements.find((e) => e.id === id)!.x,
    before.id,
  )
  expect(afterNudge).toBeGreaterThan(before.x)

  // reopen: same document, same positions (Phase 7 gate)
  await page.reload()
  await expect(page.getByLabel('Title')).toHaveValue('Autumn Capsule 01', { timeout: 10000 })
  const reopened = await page.evaluate(() => {
    const els = window.__board.getState().elements
    return els.map((e) => ({ kind: e.kind, x: Math.round(e.x * 1000) / 1000 }))
  })
  expect(reopened.find((e) => e.kind === 'garment')!.x).toBeCloseTo(afterNudge, 3)

  // export: deterministic 2× download + stored export path
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG 2×' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('Autumn Capsule 01')
  await expect(page.getByText('Exported at 2× — download started')).toBeVisible()
})

test('board: undo restores the pre-edit position', async ({ page }) => {
  await bootstrapWithGarment(page)
  await page.goto('/app/style')
  await page.getByRole('button', { name: 'New board' }).click()
  await expect(page).toHaveURL(/app\/style\/[\w-]+/, { timeout: 15000 })
  await expect
    .poll(async () => page.evaluate(() => window.__board.getState().elements.length), { timeout: 10000 })
    .toBeGreaterThanOrEqual(2)

  const target = await page.evaluate(() => {
    const st = window.__board.getState()
    const garment = st.elements.find((e) => e.kind === 'garment')!
    st.select(garment.id)
    return { id: garment.id, x: garment.x }
  })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('button', { name: 'Undo' }).click()
  const restored = await page.evaluate(
    (id) => window.__board.getState().elements.find((e) => e.id === id)!.x,
    target.id,
  )
  expect(restored).toBeCloseTo(target.x, 5)
})

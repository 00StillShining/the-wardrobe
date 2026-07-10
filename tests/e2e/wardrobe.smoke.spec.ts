import { expect, test } from '@playwright/test'

test('loads the wardrobe and explores sample receipts', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByText('THE WARDROBE')).toBeVisible()
  await expect(page.getByText('Turn the key')).toBeVisible()

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#rail$/)
  await expect(page.getByRole('heading', { name: 'Make the wardrobe yours' })).toBeVisible()
  await page.getByRole('button', { name: 'Explore wardrobe' }).click()
  await expect(page.getByRole('button', { name: '01 Rail' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Select' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add item' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open account and settings' })).toBeVisible()

  await page.getByRole('button', { name: '06 Post Tray' }).click()
  await expect(page).toHaveURL(/#post$/)
  await expect(page.getByRole('heading', { name: 'The Post Tray' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add a piece' })).toBeVisible()

  await page.getByRole('button', { name: 'Sample receipts' }).click()
  await expect(page.locator('.envelope')).toHaveCount(7)
  await expect(page.getByRole('button', { name: 'Open receipt: Your Bruno Atelier order #BA-4471 from orders@brunoatelier.com, received 2026-06-28' })).toBeVisible()

  await page.getByRole('button', { name: 'Open receipt: Your receipt from auto@northgate.example, received 2026-06-04' }).click()
  await page.getByRole('button', { name: 'Add manually' }).click()

  const name = page.getByLabel('Name')
  await name.fill('Look')
  await name.press('1')
  await expect(name).toHaveValue('Look1')
  await expect(page).toHaveURL(/#post$/)
})

test('keeps the post tray and station navigation within a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByText('Turn the key')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Make the wardrobe yours' })).toBeVisible()
  await page.getByRole('button', { name: 'Explore wardrobe' }).click()
  await expect(page.getByRole('button', { name: 'Post Tray' })).toBeVisible()
  await page.getByRole('button', { name: 'Post Tray' }).click()

  const postTray = await page.locator('.posttray').boundingBox()
  const stationNav = await page.locator('.station-nav').boundingBox()
  expect(postTray).not.toBeNull()
  expect(stationNav).not.toBeNull()
  expect(postTray!.x).toBeGreaterThanOrEqual(0)
  expect(postTray!.x + postTray!.width).toBeLessThanOrEqual(390)
  expect(postTray!.y + postTray!.height).toBeLessThanOrEqual(844)
  expect(stationNav!.x).toBeGreaterThanOrEqual(0)
  expect(stationNav!.x + stationNav!.width).toBeLessThanOrEqual(390)
})

test('routes onboarding directly into item creation and exposes settings', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Turn the key')).toBeVisible()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'Make the wardrobe yours' })).toBeVisible()
  await page.getByRole('button', { name: 'Add a piece' }).click()
  await expect(page).toHaveURL(/#post$/)
  await expect(page.getByLabel('Name')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose image' })).toBeVisible()

  await page.getByRole('button', { name: 'Open account and settings' }).click()
  await expect(page.getByRole('heading', { name: 'Account & settings' })).toBeVisible()
  await expect(page.getByLabel('Display name')).toBeVisible()
  await expect(page.getByText('Stored on this device')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset local wardrobe' })).toBeVisible()
})

test('protects data written by a newer storage schema', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('wardrobe:schema-version', JSON.stringify(999))
  })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Storage needs attention' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset local data' })).toBeVisible()
})

#!/usr/bin/env node
/**
 * Phase 1 gate screenshots — captures the revamp shell at the two gate
 * viewports (plan §14 Phase 1). Requires the dev server on :5183:
 *   npm run dev    (in another terminal)
 *   node scripts/phase1-screens.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.WARDROBE_BASE ?? 'http://localhost:5183'
const OUT = 'docs/rebuild/screens/phase1'

const ROUTES = [
  ['overview', '/app'],
  ['collection', '/app/collection'],
  ['outfits', '/app/outfits'],
  ['style', '/app/style'],
  ['insights', '/app/insights'],
  ['import', '/app/import'],
  ['settings', '/app/settings'],
  ['sign-in', '/auth/sign-in'],
  ['fixtures', '/app/fixtures', { scrollMain: true }],
]

const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]

const browser = await chromium.launch()
for (const [device, viewport] of VIEWPORTS) {
  mkdirSync(`${OUT}/${device}`, { recursive: true })
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  const page = await context.newPage()
  for (const [name, route, opts = {}] of ROUTES) {
    await page.goto(`${BASE}${route}?revamp`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(150)
    if (opts.scrollMain) {
      // the shell scrolls inside <main>, so step through it viewport by viewport
      const steps = await page.evaluate(() => {
        const main = document.querySelector('main')
        return main ? Math.ceil(main.scrollHeight / main.clientHeight) : 1
      })
      for (let i = 0; i < steps; i++) {
        await page.evaluate((step) => {
          const main = document.querySelector('main')
          if (main) main.scrollTop = step * main.clientHeight
        }, i)
        await page.waitForTimeout(120)
        await page.screenshot({ path: `${OUT}/${device}/${name}-${i + 1}.png` })
        console.log(`${device}/${name}-${i + 1}.png`)
      }
    } else {
      await page.screenshot({ path: `${OUT}/${device}/${name}.png`, fullPage: !!opts.fullPage })
      console.log(`${device}/${name}.png`)
    }
  }
  await context.close()
}
await browser.close()

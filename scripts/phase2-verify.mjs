#!/usr/bin/env node
/**
 * Phase 2 gate verification: destination captures, reduced-motion cut,
 * WebGL-off fallback, and camera-interruption continuity (plan §14 Phase 2).
 * Requires the dev server on :5183.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.WARDROBE_BASE ?? 'http://localhost:5183'
const OUT = 'docs/rebuild/screens/phase2'
const STATIONS = ['overview', 'collection', 'outfits', 'style', 'insights', 'import']
const routeFor = (s) => (s === 'overview' ? '/app' : `/app/${s}`)


async function ensureSignedIn(page) {
  // Phase 3 added the auth guard — sign in (local mode) + onboard if bounced,
  // then return true so the caller re-navigates to the intended route
  // (onboarding exits to /app/collection, not where we were headed)
  if (!/auth\/sign-in/.test(page.url())) return false
  await page.fill('input[type=email]', 'scene@example.com')
  await page.click('button[type=submit]')
  try {
    await page.fill('input[placeholder="Display name"]', 'Scene', { timeout: 4000 })
    await page.click('text=Explore the empty wardrobe')
  } catch {}
  await page.waitForTimeout(400)
  return true
}

const results = { captures: [], interruption: null, reducedMotion: null, fallback: null }
const browser = await chromium.launch()

for (const [device, viewport] of [
  ['desktop-1440', { width: 1440, height: 900 }],
  ['desktop-1280', { width: 1280, height: 800 }],
]) {
  mkdirSync(`${OUT}/${device}`, { recursive: true })
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  for (const station of STATIONS) {
    await page.goto(`${BASE}${routeFor(station)}?revamp&motion=full`, { waitUntil: 'networkidle' })
    if (await ensureSignedIn(page)) {
      await page.goto(`${BASE}${routeFor(station)}?revamp&motion=full`, { waitUntil: 'networkidle' })
    }
    await page.evaluate(() => document.fonts.ready)
    // door ritual (0.25s) + longest flight (1.4s) + settle margin
    await page.waitForTimeout(2600)
    await page.screenshot({ path: `${OUT}/${device}/${station}.png` })
    results.captures.push(`${device}/${station}.png`)
    console.log(`${device}/${station}.png`)
  }
  await ctx.close()
}

// —— interruption: spam destinations mid-flight, camera must stay continuous ——
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/app?revamp&motion=full`, { waitUntil: 'networkidle' })
  await ensureSignedIn(page)
  await page.waitForTimeout(1200)

  const probe = await page.evaluate(async () => {
    const rig = window.__rig
    const scene = window.__scene
    if (!rig || !scene) return { error: 'dev probes missing' }
    const samples = []
    const clickSeq = ['collection', 'insights', 'style', 'import', 'collection']
    const links = Object.fromEntries(
      [...document.querySelectorAll('nav a')].map((a) => [a.textContent.trim(), a]),
    )
    const labelFor = {
      collection: 'Collection',
      insights: 'Insights',
      style: 'Style Studio',
      import: 'Add / Import',
    }
    let clickIdx = 0
    const start = performance.now()
    return await new Promise((resolve) => {
      const iv = setInterval(() => {
        const t = performance.now() - start
        const p = rig.pos
        const g = rig.tgt
        const len = Math.hypot(g.x - p.x, g.y - p.y, g.z - p.z) || 1
        samples.push({
          t,
          ...p,
          dir: { x: (g.x - p.x) / len, y: (g.y - p.y) / len, z: (g.z - p.z) / len },
          flying: rig.flying,
        })
        // fire the next navigation every ~240 ms — always mid-flight
        if (clickIdx < clickSeq.length && t > 300 + clickIdx * 240) {
          links[labelFor[clickSeq[clickIdx]]]?.click()
          clickIdx++
        }
        if (t > 3600) {
          clearInterval(iv)
          let maxStep = 0
          let maxAngDeg = 0
          for (let i = 1; i < samples.length; i++) {
            const a = samples[i - 1]
            const b = samples[i]
            maxStep = Math.max(maxStep, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z))
            // view-direction angular step (the motion spec's ≤60°/s applies
            // to sustained pans; we record the peak for tuning)
            const va = a.dir
            const vb = b.dir
            if (va && vb) {
              const dot = Math.min(1, Math.max(-1, va.x * vb.x + va.y * vb.y + va.z * vb.z))
              maxAngDeg = Math.max(maxAngDeg, (Math.acos(dot) * 180) / Math.PI)
            }
          }
          resolve({
            samples: samples.length,
            maxStep,
            maxAngPerSample: maxAngDeg,
            finalStation: scene.getState().station,
            stillFlying: rig.flying,
          })
        }
      }, 50)
    })
  })
  // 50 ms samples: a snap/teleport between stations reads as a 2.5–4.5 unit
  // step; legitimate peak flight velocity stays well under 1.0
  probe.pass = !probe.error && probe.maxStep < 1.0 && probe.finalStation === 'collection' && !probe.stillFlying
  results.interruption = probe
  console.log('interruption:', JSON.stringify(probe))
  await ctx.close()
}

// —— reduced motion: instant cut, no flight ——
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/app/collection?revamp&motion=reduced`, { waitUntil: 'networkidle' })
  await ensureSignedIn(page)
  await page.goto(`${BASE}/app/collection?revamp&motion=reduced`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const st = await page.evaluate(() => ({
    station: window.__scene?.getState().station,
    flying: window.__rig?.flying,
  }))
  st.pass = st.station === 'collection' && st.flying === false
  results.reducedMotion = st
  mkdirSync(`${OUT}/states`, { recursive: true })
  await page.screenshot({ path: `${OUT}/states/reduced-motion.png` })
  console.log('reducedMotion:', JSON.stringify(st))
  await ctx.close()
}

// —— WebGL-off fallback: 2D app fully usable ——
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/app?revamp&scene=off`, { waitUntil: 'networkidle' })
  await ensureSignedIn(page)
  await page.goto(`${BASE}/app?revamp&scene=off`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const check = await page.evaluate(() => ({
    canvases: document.querySelectorAll('canvas').length,
    navLinks: document.querySelectorAll('nav a').length,
  }))
  await page.click('text=Collection >> nth=0')
  await page.waitForTimeout(300)
  check.routeWorks = page.url().includes('/app/collection') || (await page.evaluate(() => location.pathname)) === '/app/collection'
  check.pass = check.canvases === 0 && check.navLinks > 5 && check.routeWorks
  results.fallback = check
  await page.screenshot({ path: `${OUT}/states/fallback.png` })
  console.log('fallback:', JSON.stringify(check))
  await ctx.close()
}

await browser.close()
writeFileSync(`${OUT}/verify-results.json`, JSON.stringify(results, null, 2))
const ok = results.interruption?.pass && results.reducedMotion?.pass && results.fallback?.pass
console.log(ok ? 'PHASE2-VERIFY: PASS' : 'PHASE2-VERIFY: FAIL')
process.exit(ok ? 0 : 1)

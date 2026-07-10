#!/usr/bin/env node
/**
 * Two-user RLS verification harness (plan §10.5).
 *
 * Runs the cross-user access matrix against a REAL Supabase project once
 * credentials exist: user B attempts to read/write user A's rows and
 * storage objects, and every attempt must come back empty or denied.
 *
 * Usage:
 *   RLS_VERIFY_ALLOW=<project-ref>.supabase.co \
 *   SUPABASE_URL=https://<project-ref>.supabase.co \
 *   SUPABASE_ANON_KEY=... \
 *   RLS_USER_A_EMAIL=... RLS_USER_A_PASSWORD=... \
 *   RLS_USER_B_EMAIL=... RLS_USER_B_PASSWORD=... \
 *   node scripts/rls-verify.mjs
 *
 * Safety: refuses to run unless RLS_VERIFY_ALLOW exactly matches the
 * SUPABASE_URL hostname, so it cannot be pointed at a project by accident.
 * Use two disposable test accounts, never real users. Only the anon key is
 * used — never a service-role key.
 */

import { createClient } from '@supabase/supabase-js'

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'RLS_USER_A_EMAIL',
  'RLS_USER_A_PASSWORD',
  'RLS_USER_B_EMAIL',
  'RLS_USER_B_PASSWORD',
  'RLS_VERIFY_ALLOW',
]

const missing = required.filter((name) => !process.env[name])
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`)
  console.error('This harness needs a live project and two disposable test users.')
  process.exit(2)
}

const url = process.env.SUPABASE_URL
let hostname
try {
  hostname = new URL(url).hostname
} catch {
  console.error(`SUPABASE_URL is not a valid URL: ${url}`)
  process.exit(2)
}

if (process.env.RLS_VERIFY_ALLOW !== hostname) {
  console.error('Refusing to run: RLS_VERIFY_ALLOW does not match the target hostname.')
  console.error(`  target hostname:  ${hostname}`)
  console.error(`  RLS_VERIFY_ALLOW: ${process.env.RLS_VERIFY_ALLOW}`)
  console.error('Set RLS_VERIFY_ALLOW to the exact hostname to confirm intent.')
  process.exit(2)
}

const anonKey = process.env.SUPABASE_ANON_KEY

const newAnonClient = () =>
  createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })

const results = []
const record = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const signIn = async (label, email, password) => {
  const client = newAnonClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    console.error(`Could not sign in user ${label} (${email}): ${error?.message ?? 'no session'}`)
    process.exit(2)
  }
  return { client, userId: data.session.user.id }
}

const main = async () => {
  const a = await signIn('A', process.env.RLS_USER_A_EMAIL, process.env.RLS_USER_A_PASSWORD)
  const b = await signIn('B', process.env.RLS_USER_B_EMAIL, process.env.RLS_USER_B_PASSWORD)

  if (a.userId === b.userId) {
    console.error('User A and user B are the same account; use two distinct test users.')
    process.exit(2)
  }
  console.log(`User A: ${a.userId}`)
  console.log(`User B: ${b.userId}`)
  console.log('')

  const cleanup = []

  // ------------------------------------------------------------------
  // Database rows
  // ------------------------------------------------------------------

  // Sanity: A can create and read their own item.
  const { data: item, error: createError } = await a.client
    .from('wardrobe_items')
    .insert({
      user_id: a.userId,
      name: 'RLS verify probe',
      category: 'tops',
      layer_type: 'shirt',
    })
    .select()
    .single()
  record('A can create own wardrobe item', !createError, createError?.message)
  if (createError) {
    finish()
    return
  }
  cleanup.push(() => a.client.from('wardrobe_items').delete().eq('id', item.id))

  {
    const { data } = await a.client.from('wardrobe_items').select('id').eq('id', item.id)
    record('A can read own wardrobe item', (data ?? []).length === 1)
  }

  // B must not see, update, delete, or forge A's rows.
  {
    const { data, error } = await b.client.from('wardrobe_items').select('*').eq('id', item.id)
    record('B cannot select A item', !error && (data ?? []).length === 0, error?.message)
  }
  {
    const { data, error } = await b.client
      .from('wardrobe_items')
      .update({ name: 'stolen' })
      .eq('id', item.id)
      .select()
    record('B cannot update A item', !error && (data ?? []).length === 0, error?.message)
  }
  {
    const { data, error } = await b.client
      .from('wardrobe_items')
      .delete()
      .eq('id', item.id)
      .select()
    record('B cannot delete A item', !error && (data ?? []).length === 0, error?.message)
  }
  {
    const { error } = await b.client.from('wardrobe_items').insert({
      user_id: a.userId,
      name: 'forged into A account',
      category: 'tops',
      layer_type: 'shirt',
    })
    record('B cannot insert a row owned by A', Boolean(error), error ? '' : 'insert succeeded!')
  }

  // Child-table validation through both parents: B's own outfit must not
  // be able to reference A's item.
  {
    const { data: outfitB, error: outfitError } = await b.client
      .from('outfits')
      .insert({ user_id: b.userId, name: 'RLS verify outfit B' })
      .select()
      .single()
    if (outfitError) {
      record('B cannot link A item into own outfit', false, `outfit setup failed: ${outfitError.message}`)
    } else {
      cleanup.push(() => b.client.from('outfits').delete().eq('id', outfitB.id))
      const { error } = await b.client.from('outfit_items').insert({
        outfit_id: outfitB.id,
        item_id: item.id,
        layer_slot: 'top',
      })
      record('B cannot link A item into own outfit', Boolean(error), error ? '' : 'link succeeded!')
    }
  }

  // Import jobs.
  {
    const { data: job, error } = await a.client
      .from('import_jobs')
      .insert({ user_id: a.userId, idempotency_key: `rls-verify-${Date.now()}` })
      .select()
      .single()
    if (error) {
      record('B cannot select A import job', false, `job setup failed: ${error.message}`)
    } else {
      cleanup.push(() => a.client.from('import_jobs').delete().eq('id', job.id))
      const { data, error: readError } = await b.client
        .from('import_jobs')
        .select('*')
        .eq('id', job.id)
      record('B cannot select A import job', !readError && (data ?? []).length === 0, readError?.message)
    }
  }

  // ------------------------------------------------------------------
  // Storage
  // ------------------------------------------------------------------

  const probePath = `${a.userId}/rls-verify/probe.txt`
  {
    const { error } = await a.client.storage
      .from('originals')
      .upload(probePath, new Blob(['rls probe']), { contentType: 'text/plain', upsert: true })
    record('A can upload into own folder', !error, error?.message)
    if (!error) cleanup.push(() => a.client.storage.from('originals').remove([probePath]))
  }
  {
    const { data, error } = await b.client.storage.from('originals').download(probePath)
    record('B cannot download A object', Boolean(error) && !data, error ? '' : 'download succeeded!')
  }
  {
    const { error } = await b.client.storage
      .from('originals')
      .upload(`${a.userId}/rls-verify/intruder.txt`, new Blob(['intruder']), {
        contentType: 'text/plain',
      })
    record('B cannot upload into A folder', Boolean(error), error ? '' : 'upload succeeded!')
  }
  {
    const { data, error } = await b.client.storage.from('originals').list(`${a.userId}/rls-verify`)
    record(
      'B cannot list A folder',
      !error && (data ?? []).length === 0,
      error?.message ?? ((data ?? []).length > 0 ? 'listing returned objects!' : ''),
    )
  }
  {
    const { data, error } = await b.client.storage.from('originals').remove([probePath])
    // remove() silently skips rows the policy hides; verify the object survived.
    const removed = !error && (data ?? []).length > 0
    const { data: still } = await a.client.storage.from('originals').download(probePath)
    record('B cannot delete A object', !removed && Boolean(still))
  }

  // ------------------------------------------------------------------
  // Cleanup + verdict
  // ------------------------------------------------------------------

  for (const step of cleanup.reverse()) {
    try {
      await step()
    } catch {
      // best effort; probes are namespaced under rls-verify
    }
  }
  finish()
}

const finish = () => {
  const failed = results.filter((result) => !result.pass)
  console.log('')
  console.log(`${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length > 0) {
    console.log('RLS VERIFICATION FAILED — do not ship these policies.')
    process.exitCode = 1
  } else {
    console.log('RLS verification passed for the checked matrix.')
  }
}

main().catch((error) => {
  console.error('Harness crashed:', error)
  process.exit(2)
})

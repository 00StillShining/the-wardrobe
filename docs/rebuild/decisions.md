# Rebuild Decision Record

Phase 0 deliverable · started 2026-07-10 · per plan §20, every decision gets date, owner, and consequence. Claude continues with local scaffolding and typed adapters while items are OPEN, but never pretends they are configured (fail-closed in production).

## External decisions and credentials (plan §20)

| ID | Decision | Status | Owner | Consequence while OPEN |
|---|---|---|---|---|
| D-01 | Approve Supabase as backend (or supply an existing backend) | OPEN | User | Phase 3 blocked beyond local scaffolding; repositories built against typed interfaces + local test implementations. |
| D-02 | Staging + production project credentials | OPEN | User | No deployed environments; `.env.example` names the variables. |
| D-03 | Production domain + auth redirect URLs | OPEN | User | Auth callback config deferred to Phase 3/11. |
| D-04 | Approved sign-in providers (email magic link assumed as default) | OPEN | User | Onboarding built against `AuthService` interface. |
| D-05 | Production background-removal implementation/provider | OPEN | User | `ImageProcessingService` ships with client-side `@imgly/background-removal` adapter candidate + deterministic test adapter; current chroma-key worker retained as local fallback only. Note: `@imgly/background-removal` was just removed from deps in the hardening pass — re-adding it is a Phase 4 decision, not a default. |
| D-06 | Is Gmail/email receipt import required for first release? | OPEN | User | Treated as post-core (plan §10.7). No connection UI in production until configured. |
| D-07 | Legitimate price-data provider, or price comparison deferred | OPEN | User | MVP insights use manually recorded purchase prices only; sample retailer listings excluded from production. |
| D-08 | Error monitoring + analytics choices | OPEN | User | None wired; Phase 11 gate. |
| D-09 | Email sender + transactional templates | OPEN | User | Default Supabase templates until supplied. |
| D-10 | Midjourney commercial-use confirmation for publicly shipped assets | OPEN | User | Generated images stay out of shipped bundles; used as design reference only. ASSETS.md itself flags this. |
| D-11 | Privacy, terms, retention, support decisions (professional review) | OPEN | User | Engineering provides accurate data inventory/export/deletion; copy tracked as launch blocker. |
| D-12 | Reference devices + acceptable performance targets | OPEN | User | Interim: this M3 MacBook as reference laptop; plan §16 budgets provisional. |

## Decisions surfaced during Phase 0

| ID | Decision | Status | Owner | Notes |
|---|---|---|---|---|
| D-13 | Approve baseline checkpoint commit of the dirty worktree (25 modified + 13 untracked files, one coherent hardening pass) before any rebuild branch is created | **RESOLVED 2026-07-10** | User | User approved a single commit → `1807153` on `main`. |
| D-14 | `06-pinboard-style-studio.png` keyframe was selected by coordinate mis-click — re-review its 3 sibling candidates (job URL in sidecar) before Style Studio visual work | OPEN | User | Defer to Phase 7 at the latest; plan §7 already forbids using it as final layout without review. |
| D-15 | Midjourney pack Round 3 is absent from the delivered package (folders map to rounds 1,2,4,5,6,7,8) with no explanation | OPEN | User | Confirm whether Round 3 was skipped/rejected intentionally or assets are missing. No rebuild work blocks on this. |
| D-16 | Material tiles: derive PBR maps from the Midjourney tiles (seam-test first) vs. license true seamless PBR materials colour-matched to them | OPEN | User→Claude proposal at Phase 2 | Plan §7 recommends licensed PBR; tiles carry explicit not-PBR/seam-unverified warnings. |
| D-17 | Add `esbuild` as an explicit devDependency (currently only transitive via vite; `scripts/run-tests.mjs` imports it directly) | OPEN | Claude (needs no approval, folded into next infra commit) | Fragile under vite upgrades or strict installers. |
| D-18 | Rebuild branch name | **RESOLVED 2026-07-10** | User | `rebuild/modern-atelier`, created from `main` at `1807153`. |
| D-19 | Placement of `CLAUDE_FABLE_5_REBUILD_EXECUTION_PLAN.md` + `MIDJOURNEY_PROMPT_PACK.md` (repo root vs `docs/`) | PENDING USER | User | Both should be committed either way. ⚠ A live vim session (`.MIDJOURNEY_PROMPT_PACK.md.swp`, pid 44185 at audit time) had the prompt pack open — save/close before committing it so no unsaved edits are lost. Do not move the file while that session is open. |

## Phase 3 gate status (2026-07-10)

Verified locally: session guard with preserved deep-link, magic-link-shaped sign-in (local mode
resolves immediately), onboarding gate, session survives refresh, no privileged keys anywhere in
client output, migrations + RLS authored and unit-covered where runnable. **Blocked on D-01/D-02
(no Docker/Supabase CLI/credentials on this machine):** executing migrations, live RLS two-user
test (`scripts/rls-verify.mjs` is ready to run), storage policies, real magic-link round-trip.
The app runs in honest local-first mode behind the same interfaces until credentials arrive.

## Resolved

| ID | Decision | Resolved | By | Outcome |
|---|---|---|---|---|
| R-01 | Keep e2e baseline discrepancy visible (handoff: 1/4 pass; Phase 0 re-run: 4/4 pass) | 2026-07-10 | Claude | Both recorded in `baseline-2026-07-10.md`; blocking first-run generation remains a defect per plan §9.1 regardless of green tests. |
| R-02 | `.gitignore` gains `test-results/` and `*.swp` before checkpointing | 2026-07-10 | Claude | Prevents committing Playwright artifacts and vim swap files; applied in Phase 0. |

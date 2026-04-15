# Julia PM — Product TODO

**Status as of 2026-04-15:** Dashboard v3 is live. 10 sprint branches (A → C10) merged into `main` and deployed. Most of the original 55-item backlog shipped.

Tags: `[dash]` = dashboard feature, `[n8n]` = workflow change, `[plat]` = platform/infra, `[qc]` = Quebec-specific.

---

## ✅ Shipped 2026-04-13 → 2026-04-15 (v3)

**Sprint A — UX foundation:** keyboard layer + `⌘K`/`Ctrl+K` search · Smart Summary on tickets · saved views + filter chips · action-framed stat cards · `?` help badges · Inbox Today/This week/Later grouping · triage flow.

**Sprint B — depth + schema:** audit log + 30-day undo · tenant drawer (Chat/Tickets/Lease) · CSV export · bulk ticket actions · test-integration buttons · 7-day integration health strip · quiet hours / timezone / UI language preferences · `lib/tz.ts` centralized timezone.

**Sprint C1 — at-a-glance:** ticket timeline · urgency visual weight · All Clear celebration · property audit timeline · property financial snapshot. (Dashboard v3 experiments rolled back — Morning Huddle / donut / sparkline shelved; unused components cleaned up.)

**Sprint C2 — reporting + metrics:** `/reporting` page (30-day KPIs) · vendor performance columns · Fast badge · preferred vendor starring · availability dot · inbox snooze.

**Sprint C3 — communication:** 8 bilingual announcement templates · channel preview before send · searchable FAQ · collapsed video playlist.

**Sprint C4 — polish:** Crimson Pro greeting · contextual alerts strip · today divider · property health stripe · tenant avatars (EN clay / FR sage) · open-ticket badge · single sortable vendors table · phone/email quick actions.

**Sprint C5 — units:** `units` table · `tenants.unit_id` · multi-tenant per unit (couples, roommates) · occupancy math fix.

**Sprint C6 — lessees:** `lease_tenants` join · multi-lessee per lease (capped at 4).

**Sprint C7 — expenses:** `expenses` table · `ExpenseForm` · `PropertyExpenses` collapsible · receipt uploads · per-property yearly spend · portfolio-wide total.

**Sprint C8 — resolve & renew:** Resolve-ticket dialog with vendor attribution + inline expense · multi-lessee rent-increase distribution (joint legal service) · clickable tenant/property/phone/email on ticket detail.

**Sprint C9–C10:** occupancy bug fix · dashboard subtract (stats strip, 2 action cards, clickable category pills filter in-page) · vendors CategoryIcon + starred tint · empty states · reporting 2x2 grid · settings cleanup (infra moved to `/settings/advanced`).

---

## 🟡 OPEN — ranked by ROI

### Quick wins (≤ half day each)
- [ ] **A. Late-rent detection** `[dash]` — flag tenants past due date, surface on Reporting + property cards. ~3h.
- [ ] **B. Auto-accept cron for rent increases** `[dash][plat]` — nightly call to `autoAcceptExpiredRentIncreases()` so it doesn't require visiting the property page. ~30min.
- [ ] **C. Recurring property expenses** `[dash]` — insurance / property tax / school tax entries that auto-regenerate monthly/yearly. Gives Monthly income → net income. ~4h.
- [ ] **D. Disk usage alert (>80%)** `[plat]` — Telegram ping to Dion when live VPS crosses threshold. ~30min.
- [ ] **E. Expense receipt path test on live** `[plat]` — verify uploads actually persist. ~15min.

### Medium (1–2 days)
- [ ] **F. Scheduled broadcasts runner** `[dash][n8n]` — schema has `scheduled_for`, no cron yet. Cron route + n8n trigger.
- [ ] **G. AI translation polish diff view** `[dash][qc]` — originally #24. Toggle that shows FR ↔ EN diff for broadcasts.
- [ ] **H. Vendor magic-link Accept/Decline/Done** `[dash][n8n]` — tokenized links in dispatch email. Low scope vs full portal.
- [ ] **I. Ask Julia AI help agent** `[dash]` — docs-scoped tab on existing chat widget.
- [ ] **J. First-visit guided tour** `[dash]` — 60-second overlay walkthrough of v3 features for Julia.

### Big projects (multi-day, higher risk)
- [ ] **K. RL-31 tax slip generator** `[dash][qc]` — seasonal. **Prereq: register Quietly as Revenu Québec partner** (https://www.revenuquebec.ca/en/partners/registering-as-a-partner/) well before end-of-Feb filing deadline.
- [ ] **L. Tenant web portal** `[dash]` — tokenized magic links, read-only tickets/rent/lease. Biggest feature. Defer until Julia asks.
- [ ] **M. Lease renewal wizard** `[dash][qc]` — 90-day countdown → notice → track → auto-accept. (Rent-increase piece shipped; countdown UI is the gap.)
- [ ] **N. Full vendor portal** `[dash]` — upgrade from H when scale justifies. Tier 4.
- [ ] **O. Broadcast delivery dashboard** `[dash]` — open/read/reply where platforms support it.

---

## 🔵 Platform / tech debt (non-urgent)

- [ ] **P1. Postgres credentials refactor to `$env`** `[n8n][plat]` — last credential refactor; blocks multi-client templating.
- [ ] **P2. Webhook auth on `/ticket-management` and `/sms-intake`** `[n8n]` — open surface today.
- [ ] **P3. Gmail incoming polling** `[n8n]` — was removed from live; redeploy after fix on dev. Needed for inbound tenant email + RL-31 replies.
- [ ] **P4. Region pack abstraction** `[plat]` — Quebec = Pack #1. Isolate TAL / RL-31 / bilingual so Pack #2 is config.
- [ ] **P5. Per-client provisioning script** `[plat]` — 5h manual → 30min automated.
- [ ] **P6. Storage strategy (if scale demands)** `[plat]` — currently 29MB media after 3 weeks, ~500MB/yr projected. 50GB free on VPS. If we hit 80% or scale to multi-client, move media to S3 / Hetzner Object Storage / Backblaze B2.

---

## ⚪ Park (Tier 4 — until 2+ clients or clear demand)

- Drag-and-drop tenant between units
- OCR search of media photos
- A/B testing broadcasts
- Loading skeletons everywhere
- Error boundary fallback UI

---

## 📒 Post-deploy housekeeping (2026-04-15)

- [x] Merge sprint-c10-subtract → main (fast-forward, 40 commits)
- [x] Apply 8 schema migrations to live `quietly_db`
- [x] Deploy dashboard container; all pages return 200
- [x] Dev/live schema + code parity confirmed
- [x] Update `CLAUDE.md` + `TODO.md` (this file)
- [ ] Delete rollback snapshots after 7 days (~2026-04-22):
  - `srv1285597:/root/backups/quietly_db_20260415_154519.sql.gz`
  - `srv1285597:/docker/quietly-dash.bak-20260415_154519/`
  - docker image `n8n-dashboard:pre-c10-20260415`
- [ ] Watch live logs in the next 72h for real-data edge cases

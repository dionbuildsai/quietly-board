# Julia PM — Product TODO

Master backlog from the 2026-04-13 strategic audit. Tiered by ROI. Within each tier, ordered highest-return first.

Tags: `[dash]` = dashboard feature, `[n8n]` = workflow change, `[plat]` = platform/infra, `[qc]` = Quebec-specific.

---

## TIER 1 — Build first, next 2 sprints

- [ ] **1. RL-31 tax slip generator + bulk email** `[dash][qc]` — legally required annually; lease data already exists.
- [ ] **2. Inbox "Today View"** `[dash]` — Today / This Week / Later grouping; default Today expanded.
- [ ] **3. cmd-K full-text search** `[dash]` — tickets, messages, tenants; grouped results, live.
- [ ] **4. Smart Summary on ticket detail** `[dash]` — 3-line Haiku catch-up above conversation.
- [ ] **5. Tenant detail drawer** `[dash]` — Chat / Lease / Tickets / Payments / Notes tabs in right drawer.
- [ ] **6. Late-rent detection + auto-reminder** `[dash][n8n]` — payment tracking foundation.
- [ ] **7. Finish lease renewal wizard** `[dash][qc]` — 90-day countdown → notice → track → auto-accept.
- [ ] **8. Test-integration button on every Settings card** `[dash]` — "Send test message to me".
- [ ] **9. Audit log + 30-day undo on deletes** `[dash][plat]` — new Settings sub-tab, reverse chrono.
- [ ] **10. One-tap quick reply from Inbox** `[dash]` — inline mini composer, 3 saved replies.
- [ ] **11. Keyboard shortcut `?` overlay + Esc / `/` basics** `[dash]` — compounds with cmd-K.
- [ ] **12. Saved views / smart filter chips on Tickets** `[dash]` — "My approval", "Waiting vendor", "+ Save current".

## TIER 2 — High return, next quarter

- [ ] **13. Tenant web portal (tokenized magic link)** `[dash]` — read-only tickets, rent, lease, upload photos.
- [ ] **14. Vendor magic-link status update** `[dash][n8n]` — Accept / Decline / Done links in dispatch email.
- [ ] **15. Morning Huddle card on Dashboard** `[dash]` — Haiku-generated 3-sentence summary.
- [ ] **16. Action-framed stat cards** `[dash]` — "needs reply" not "open tickets"; zero = green check.
- [ ] **17. Ticket timeline strip per row** `[dash]` — 4–5 dot progression; green/purple/grey.
- [ ] **18. Unit ribbon: lease-end + rent-review only** `[dash][qc]` — inspection dropped; opt-in per property.
- [ ] **19. Property financial snapshot card** `[dash]` — monthly income + 7-day sparkline.
- [ ] **20. Property audit timeline** `[dash]` — collapsible reverse-chrono event log.
- [ ] **21. Announcement template library (seasonal, bilingual)** `[dash][qc]` — snow removal, water shutoff, renewal.
- [ ] **22. Announcement schedule / draft / recurring** `[dash]` — three-button footer.
- [ ] **23. Channel preview before broadcast send** `[dash]` — TG / WA / SMS / Email mockups.
- [ ] **24. AI translation polish mode for FR broadcasts** `[dash][qc]` — Haiku + "legal check" toggle + diff.
- [ ] **25. Bulk select + bulk actions on Tickets** `[dash]` — progressive disclosure; floating action bar.
- [ ] **26. CSV export for tickets, tenants, leases** `[dash]`.
- [ ] **27. Tenant filter by language / property / lease status** `[dash]` — chips row.
- [ ] **28. Quick "Open conversation" button on Tenants row** `[dash]` — right drawer, keeps list context.
- [ ] **29. Integration health timeline (7-day strip)** `[dash]` — one dot per day per channel, from n8n logs.
- [ ] **30. Signature + letterhead asset manager** `[dash]` — reused in TAL, email, PDFs.
- [ ] **31. Quiet hours / timezone / UI language preferences** `[dash]` — urgent overrides quiet hours.

## TIER 3 — Medium return or dependent on Tier 1/2

- [ ] **32. Reporting tab: SLA + financial KPIs** `[dash]` — avg resolution, occupancy trend, vacancy cost.
- [ ] **33. Weekly trendline sparkline on Dashboard** `[dash]`.
- [ ] **34. Time-saved streak + shareable** `[dash]` — flame icon, day counter, no shame on misses.
- [ ] **35. Inbox "All Clear" celebration state** `[dash]`.
- [ ] **36. Inbox snooze actions** `[dash]` — 1h / Tomorrow / Next week.
- [ ] **37. Urgency-inferred visual weight in Inbox** `[dash]` — red border on urgent, 70% opacity on info.
- [ ] **38. Inbox preview rail on Dashboard** `[dash]` — merged contextual alerts.
- [ ] **39. Tenant relationship health dot** `[dash]` — green/amber/grey; use sparingly.
- [ ] **40. Bulk message from selected tenants** `[dash]` — language auto-split.
- [ ] **41. Vendor performance card** `[dash]` — avg response, # jobs, last used; top 20% ringed.
- [ ] **42. Preferred vendor starring** `[dash][n8n]` — dispatcher reads starred first.
- [ ] **43. Vendor availability status dot** `[dash]` — "Usually replies in 3h".
- [ ] **44. "Request quote from all [category] vendors"** `[dash][n8n]` — fan-out + comparison table.
- [ ] **45. Broadcast delivery dashboard** `[dash]` — open / read / reply where platforms support it.
- [ ] **46. In-context `?` help badges** `[dash]` — 2-sentence plain-English tooltips.
- [ ] **47. "Ask Julia AI" help agent (docs-scoped)** `[dash]` — reuses existing widget, Data / Help tabs.
- [ ] **48. Searchable FAQ markdown** `[dash]` — search bar above Help videos.
- [ ] **49. First-visit guided tour replay** `[dash]` — 60-sec overlay walkthrough, dismissable.

## TIER 4 — Park until 2+ clients or clear demand

- [ ] **50. Drag-and-drop tenant between units** `[dash]`.
- [ ] **51. Full vendor portal** `[dash]` — upgrade path from #14 when scale justifies.
- [ ] **52. Full-text search of media (OCR photos)** `[dash]`.
- [ ] **53. A/B testing broadcasts** `[dash]`.
- [ ] **54. Loading skeletons everywhere** `[dash]`.
- [ ] **55. Error boundary fallback UI** `[dash]`.

---

## Platform prerequisites (non-user-facing, thread through Tier 1–2)

- [ ] **P1. Finish Postgres credentials refactor to `$env`** `[n8n][plat]` — blocks multi-client templating.
- [ ] **P2. Add auth to `/ticket-management` and `/sms-intake` webhooks** `[n8n][plat]` — open surface today.
- [ ] **P3. Re-enable Gmail incoming polling** `[n8n]` — needed for tenant-initiated email and RL-31 replies.
- [ ] **P4. Region pack abstraction (Quebec = Pack #1)** `[plat]` — isolate TAL / RL-31 / bilingual so Pack #2 is config, not fork.
- [ ] **P5. Per-client provisioning script** `[plat]` — 5h manual onboarding → 30min automated.

---

## Compressed Execution Plan (session-sized sprints)

Replaces the original 90-day pacing. Realistic total: **~8 focused sessions over 2–3 weeks**.

### Sprint A — one afternoon, zero-risk UI
Pure dashboard, no schema/n8n changes. Ship as one PR.
- #11 Keyboard shortcut `?` overlay + Esc / `/`
- #3 cmd-K full-text search (ILIKE / trigram fast path)
- #4 Smart Summary on ticket detail
- #12 Saved views / filter chips on Tickets
- #16 Action-framed stat cards on Dashboard
- #46 In-context `?` help badges
- #10 One-tap quick reply from Inbox
- #2 Inbox Today View grouping

### Sprint B — next session, low-risk (additive schema only)
- #9 Audit log + 30-day undo
- #5 Tenant detail drawer
- #28 Open-conversation quick button
- #27 Tenant filter chips
- #26 CSV export
- #25 Bulk select + bulk actions on Tickets
- #31 Quiet hours / timezone / UI language prefs
- #30 Signature + letterhead asset manager
- #8 Test-integration buttons
- #29 Integration health timeline

### Sprint C — third session, polish + dashboard depth
- #15 Morning Huddle
- #17 Ticket timeline strip per row
- #19 Property financial snapshot
- #20 Property audit timeline (falls out of #9)
- #32 Reporting tab
- #33 Weekly trendline sparkline
- #37 Urgency-inferred visual weight in Inbox
- #36 Inbox snooze
- #35 All Clear celebration
- #21 + #22 + #23 Announcement templates / schedule / preview
- #24 AI translation polish mode
- #41 + #42 + #43 Vendor performance / starring / availability
- #47 Ask Julia AI help agent
- #48 Searchable FAQ

### Sprint D — careful ones, one per dedicated session
Do NOT rush — legal / money / security stakes on a live system.
- #1 RL-31 generator (full day, Revenu Québec spec + review)
- #7 Finish lease renewal wizard (legal edge cases)
- #6 Late-rent detection + reminder (payment schema + rules)
- #13 + #14 Tenant portal + vendor magic link (shared auth pattern, one session together)
- P1 Postgres `$env` refactor (3-way audit, live deploy)
- P2 Webhook auth (token scheme + coordinate external callers)

### Deferred / backlog
Tier 3 items not listed in A / B / C (will naturally land after Sprint C)
Tier 4 items (park until 2+ clients)
P3 Gmail incoming polling, P4 region pack, P5 provisioning script

---

## Clarifications captured 2026-04-13

- **#18 (unit ribbon):** inspection dropped — not legally required in Quebec for standard residential rentals. Opt-in per property for insurance-driven cases.
- **#14 (vendor magic link):** downgraded from full vendor portal. Full portal = Tier 4 (#51), unlocks only at 5+ vendors × 10+ jobs/month.
- **#29 (integration health timeline):** 7-day dot strip on each Settings card, sourced from n8n execution logs. Green = channel sent/received OK that day, red = errors, grey = silent. Early warning before tenants notice.

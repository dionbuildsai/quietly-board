# Dashboard screenshots

Single "current snapshot" of every primary page on the dev PM dashboard
(`pm.srv1466948.hstgr.cloud`). Each file is overwritten on every regeneration
so there's always exactly one version per page.

## When to regenerate

Any time a dashboard deploy to dev changes something visible:

```bash
./tools/screenshot-dashboard.sh
```

Takes ~30 seconds for all 14 pages. Safe to re-run — nothing versioned here
is canonical state, just a visual reference for design review.

## Files

| File | Page |
|------|------|
| `01-dashboard.png`        | `/` — home dashboard |
| `02-inbox.png`            | `/inbox` — triage inbox |
| `03-tickets.png`          | `/tickets` — all tickets list |
| `04-properties.png`       | `/properties` — portfolio grid |
| `05-tenants.png`          | `/tenants` — grouped tenant list |
| `06-vendors.png`          | `/vendors` — sortable vendor table |
| `07-reporting.png`        | `/reporting` — 30-day KPIs |
| `08-announcements.png`    | `/announcements` — broadcast tool |
| `09-help.png`             | `/help` — FAQ + videos |
| `10-settings.png`         | `/settings` — integrations + preferences |
| `11-settings-audit.png`   | `/settings/audit` — activity log + undo |
| `12-settings-advanced.png`| `/settings/advanced` — env + creds ref |
| `13-changelog.png`        | `/changelog` — version history |
| `14-leases.png`           | `/leases` — lease management |

## Auth

The tool passes `admin:quietly2024` via URL basic-auth (dev server only).
If the basicauth creds change, update the `BASE_URL` arg or the default in
`tools/screenshot-dashboard.sh`.

## What's intentionally NOT captured

- Modals / dialogs (resolve ticket, expense form, etc.) — they need JS
  interaction to open
- Drawer-open states (tenant drawer, lease review)
- Responsive breakpoints — we only take 1440×900 desktop
- Ticket detail page (dynamic URL — would need to pick a ticket)
- Property detail page (same — would need to pick one)

If we need any of those, the script can be extended with a headless JS
driver (Playwright) later. For now: single static-page snapshot per route.

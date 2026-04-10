# PM System — Full Test Plan & Live Migration Guide

## Current State

| | Dev (srv1466948) | Live (srv1285597) |
|---|---|---|
| **n8n URL** | n8n.srv1466948.hstgr.cloud | n8n.srv1285597.hstgr.cloud |
| **Dashboard** | pm.srv1466948.hstgr.cloud | dash.srv1285597.hstgr.cloud |
| **Telegram Bot** | `8230685505` (PM Dev Bot) | `8460031715` (@dion_property_manager_bot) |
| **App DB** | pm_dev_db (1 tenant, 1 property, 1 vendor) | quietly_db (62 tenants, 3 properties, 11 vendors) |
| **n8n DB** | Postgres | SQLite (!) |
| **Config approach** | `$env` vars in docker-compose | Hardcoded in workflow nodes |
| **Workflows tested** | Telegram only | All channels (production) |

### Env Vars Dev Has That Live Needs

These 3 env vars must be added to the **live** docker-compose before importing updated workflows:

| Var | Dev Value | Live Value |
|-----|-----------|------------|
| `TELEGRAM_OWNER_CHAT_ID` | `6216258938` (Dion) | `6216258938` (Dion — same) |
| `WHATSAPP_PHONE_NUMBER_ID` | `1002910989571888` | `1002910989571888` (same) |
| `TWILIO_FROM_NUMBER` | `+15148319058` (Dion's test) | `+14389009998` (Julia's live number) |

Live already has: `TELEGRAM_BOT_TOKEN`, `ANTHROPIC_API_KEY`, `WHATSAPP_TOKEN`

---

## Part 1: Dev Testing (Do All Of This BEFORE Touching Live)

### Test 1: Telegram Message → AI Response
**Status: PASSED** (2026-04-03)
- Send "hello" to PM Dev Bot
- Verify: typing indicator → AI response → reply in Telegram
- Check: n8n executions for Channel Router (success), AI Agent (success), Response Dispatcher (success)

### Test 2: Telegram Maintenance Request (Full Ticket Flow)
- Send: "My kitchen sink is leaking badly"
- Verify:
  - [ ] Bot sends typing indicator
  - [ ] Bot replies asking clarifying questions
  - [ ] Ticket created in `maintenance_requests` table
  - [ ] Message logged in `messages` table with correct `ticket_id`
  - [ ] Owner notification sent to Dion's Telegram (chat ID from `$env.TELEGRAM_OWNER_CHAT_ID`)
  - [ ] Video suggestion appears (if Haiku matches one)
- Check query: `SELECT ticket_id, category, urgency, status FROM maintenance_requests ORDER BY created_at DESC LIMIT 1;`

### Test 3: Telegram Callback Buttons
- After receiving a video suggestion, click "Yes" or "No" button
- Verify:
  - [ ] Button press processed (Remove Buttons node replaces message text)
  - [ ] If "Yes": ticket status → resolved, confirmation sent
  - [ ] If "No": "someone will follow up" message sent
- After receiving an urgent ticket notification (Test 6), click "Auto Dispatch"
- Verify:
  - [ ] Vendor lookup works
  - [ ] Preview message sent to owner chat ID (not hardcoded)
  - [ ] Confirm/Next buttons work

### Test 4: Telegram Photo Upload
- **First: activate [Media] Handler workflow** (currently inactive on dev)
- Send a photo to the bot
- Verify:
  - [ ] Bot asks which ticket the photo is for (inline keyboard with open tickets)
  - [ ] After selecting ticket, photo is downloaded and saved
  - [ ] Photo linked to correct ticket in messages table
  - [ ] Photo visible in dashboard ticket detail

### Test 5: Telegram Registration (/start)
- Send `/start` to the bot from a NEW Telegram account (or clear the test tenant's telegram_id first)
- Verify:
  - [ ] Welcome Message node sends registration confirmation (uses `$env.TELEGRAM_BOT_TOKEN`, not credential)

### Test 6: Urgent Ticket Flow
- Send: "There is water pouring from my ceiling non-stop, it's flooding"
- Then reply to follow-up: "Yes it's really bad, water everywhere"
- Verify:
  - [ ] First message creates ticket with `urgency: not_urgent` (ambiguous first message)
  - [ ] Second message upgrades to `urgency: urgent`
  - [ ] Owner gets URGENT notification with Auto Dispatch / Show Contractors buttons
  - [ ] Buttons use `$env.TELEGRAM_OWNER_CHAT_ID` (not hardcoded `6216258938`)

### Test 7: WhatsApp Message
**Requires:** Valid `WHATSAPP_TOKEN` in docker-compose (current dev token is likely expired)
- Send a WhatsApp message to the test number
- Verify:
  - [ ] WhatsApp Meta workflow receives and forwards to Channel Router
  - [ ] AI responds
  - [ ] Reply sent back via WhatsApp (uses `$env.WHATSAPP_PHONE_NUMBER_ID`)

### Test 8: SMS Message
**Requires:** Twilio webhook pointing to dev n8n
- Send SMS or curl the webhook: `curl -X POST https://n8n.srv1466948.hstgr.cloud/webhook/sms-intake -d "From=+15148319058&Body=My heater is broken&MessageSid=test123"`
- Verify:
  - [ ] Parse SMS processes the message
  - [ ] AI responds
  - [ ] Reply sent via Twilio (uses `$env.TWILIO_FROM_NUMBER`)

### Test 9: Email Message
**Requires:** Gmail trigger polling (check if dionfwang credential works on dev)
- Send email to the monitored Gmail
- Verify:
  - [ ] Gmail trigger picks it up
  - [ ] AI responds
  - [ ] Reply sent via Gmail

### Test 10: Owner Message (Bot Paused)
- Open a ticket in the dev dashboard
- Toggle "Pause Bot" on the ticket
- Send a message as owner from the dashboard
- Verify:
  - [ ] Owner message logged as `sender='owner'`
  - [ ] Message dispatched to tenant via correct channel
  - [ ] Bot stays paused (no AI response to tenant's next message)
  - [ ] Bot auto-resumes when leaving ticket page

### Test 11: Ticket Management API
- `curl -X POST https://n8n.srv1466948.hstgr.cloud/webhook/tool-escalate-urgent -H "Content-Type: application/json" -d '{"ticket_id":"TK-TEST","category":"plumbing","description":"test","urgency":"urgent","tenant_name":"Test","phone":"15148319058","unit":"101","property":"Test Property"}'`
- Verify:
  - [ ] Urgent ticket created
  - [ ] Notify Landlord Code node sends Telegram message using `$env.TELEGRAM_BOT_TOKEN` + `$env.TELEGRAM_OWNER_CHAT_ID`

### Test 12: Voice Agent
- Call the dev phone number (if configured)
- Or curl the webhooks:
  - `POST /webhook/get-status` with `{"tenant_phone": "15148319058"}`
  - `POST /webhook/log-maintenance` with maintenance data
  - `POST /webhook/post-call-log` with call data
- Verify:
  - [ ] Notifications use `$env` vars (not hardcoded)

### Test 13: Dashboard Verification
- Open pm.srv1466948.hstgr.cloud
- Verify:
  - [ ] Dashboard loads, shows test tickets
  - [ ] Ticket detail shows conversation thread
  - [ ] AI Chat widget works
  - [ ] Sidebar notification badge works

---

## Part 2: Pre-Migration Checklist

Before touching the live server, confirm ALL of this:

- [ ] All 13 tests above pass on dev
- [ ] Zero errors in n8n execution log for the last 20 executions
- [ ] No `Get Config` references in any workflow (already verified)
- [ ] No hardcoded values (already verified)
- [ ] All $env references use correct key names

---

## Part 3: Live Migration Steps

### Step 1: Backup Live
```bash
ssh root@srv1285597.hstgr.cloud

# Backup all live workflows
docker exec n8n-n8n-1 n8n export:workflow --all --output=/tmp/live-backup/ --separate
docker cp n8n-n8n-1:/tmp/live-backup/ /root/backup-before-config-migration/

# Backup the app database
docker exec julia-postgres pg_dump -U quietly quietly_db > /root/backup-before-config-migration/quietly_db.sql

# Save current docker-compose
cp /docker/n8n/docker-compose.yml /root/backup-before-config-migration/docker-compose.yml.bak
```

### Step 2: Add Env Vars to Live docker-compose.yml
Add these 3 lines to the n8n service `environment:` section in `/docker/n8n/docker-compose.yml`:
```yaml
      - TELEGRAM_OWNER_CHAT_ID=6216258938
      - WHATSAPP_PHONE_NUMBER_ID=1002910989571888
      - TWILIO_FROM_NUMBER=+14389009998
```
**Note:** `TWILIO_FROM_NUMBER` is `+14389009998` on live (Julia's number), NOT `+15148319058` (Dion's test number).

Also verify these already exist with correct live values:
- `TELEGRAM_BOT_TOKEN` = live bot token (`8460031715:...`)
- `ANTHROPIC_API_KEY` = set
- `WHATSAPP_TOKEN` = live permanent token (not the expired dev one)

### Step 3: Export Dev Workflows
```bash
# On your Mac
cd /tmp/pm-dev-workflows
# The 8 JSON files are already here from the migration work
```

### Step 4: Import to Live
```bash
# Upload to live server
scp /tmp/pm-dev-workflows/*.json root@srv1285597.hstgr.cloud:/tmp/import/

# SSH to live
ssh root@srv1285597.hstgr.cloud

# IMPORTANT: Live uses different container names — check first
docker ps --format '{{.Names}}' | grep n8n

# Import each workflow (adjust container name as needed)
for f in /tmp/import/*.json; do
  docker cp $f <n8n-container>:/tmp/import/$(basename $f)
  docker exec <n8n-container> n8n import:workflow --input=/tmp/import/$(basename $f)
done

# Recreate n8n to pick up new env vars
cd /docker/n8n && docker compose up -d n8n
```

### Step 5: Publish All Workflows
Open n8n.srv1285597.hstgr.cloud in browser. For each of the 8 PM workflows:
1. Open the workflow
2. Click "Publish"
3. Verify it activates (green toggle)

### Step 6: Verify Live
- Send a test Telegram message to the live bot
- Check n8n execution log — should show success for Channel Router → AI Agent → Response Dispatcher
- Check dashboard loads correctly
- Monitor for 30 minutes — watch for any errors

---

## Part 4: Rollback Plan

If anything breaks on live:

```bash
ssh root@srv1285597.hstgr.cloud

# Restore docker-compose
cp /root/backup-before-config-migration/docker-compose.yml.bak /docker/n8n/docker-compose.yml

# Re-import old workflows
for f in /root/backup-before-config-migration/*.json; do
  docker cp $f <n8n-container>:/tmp/rollback/$(basename $f)
  docker exec <n8n-container> n8n import:workflow --input=/tmp/rollback/$(basename $f)
done

# Restart n8n with old env
cd /docker/n8n && docker compose up -d n8n

# Publish all workflows in n8n UI
```

---

## Known Issues to Address Before/During Migration

1. **Live n8n uses SQLite** for workflow storage, dev uses Postgres. The `n8n import:workflow` CLI works for both, but the import process may differ slightly.

2. **Media Handler import is broken** on dev (FK constraint on `workflow_publish_history`). On live (SQLite), this may not be an issue. If it fails, use the same SQL workaround or import via the n8n API.

3. **3 live workflows may have different IDs** than dev (`owner-msg-sender-001`, `x6LjYZQ2l05BS8uP`, `JO26ruzPNp1MQThL`). Before importing, verify IDs match: `SELECT id, name FROM workflow_entity WHERE name LIKE '%Owner%' OR name LIKE '%WhatsApp%' OR name LIKE '%Voice%';`

4. **Telegram credential** (`property_management`, ID `5uwoGp7iX1GQkMcu`) — the Telegram Trigger node still uses this credential for webhook registration. The bot token in this credential must match the `TELEGRAM_BOT_TOKEN` env var. On live, verify the credential has the live bot token.

5. **WhatsApp credential** (`we3yhVhUwWRnkTGz`) — native WhatsApp nodes that we didn't convert still use this credential for auth. The `phoneNumberId` field now comes from `$env`, but the access token comes from the credential. Verify the credential has the live permanent token.

6. **File volume path**: Dev mounts `/docker/projects/pm/files:/files`, live mounts `/local-files:/files`. Media files are stored at `/files/media/` inside the container. No workflow changes needed — the mount point inside the container is the same (`/files`).

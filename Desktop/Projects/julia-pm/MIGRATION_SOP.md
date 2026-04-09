# Migration SOP — Dev → Live

## Audit performed: 2026-04-08, post-credential-refactor deployment

This document covers three things:
1. **Live env var → node usage audit** — every `$env.` reference in every live workflow node
2. **Complete dev vs live comparison** — what's the same, what's different, why
3. **SOP for safe dev→live migration** — step-by-step procedure with rollback

---

# Part 1: Live Env Var Audit

## 1.1 Env vars set on LIVE n8n container

| Variable | Value (masked) | Usage |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `8460031715:...lZ8` | ✅ USED by 19 nodes |
| `TELEGRAM_OWNER_CHAT_ID` | `6274604148` (Julia) | ⚠️ Set, not used by any workflow (settings table is the actual source) |
| `WHATSAPP_TOKEN` | `EAAMZAlW...` | ✅ USED by 11 nodes |
| `WHATSAPP_PHONE_NUMBER_ID` | `971537566052793` | ✅ USED by 5 nodes |
| `TWILIO_ACCOUNT_SID` | `ACafa0bc...b2a1` | ✅ USED by 1 node (Download Media Immediate, SMS) |
| `TWILIO_AUTH_TOKEN` | `8cf5ea36...72a2` | ✅ USED by 1 node |
| `TWILIO_FROM_NUMBER` | `+14389009998` | ⚠️ Set, not used by any workflow yet (pre-staged for Twilio refactor) |
| `ANTHROPIC_API_KEY` | `sk-ant-api03...thB7ugAA` | ✅ USED by 1 node (Match Video AI) |
| `WEBHOOK_URL` | `https://n8n.srv1285597.hstgr.cloud/` | ✅ USED by 1 node (Forward to WA Intake) |
| `N8N_API_KEY` | `quietly-internal-api-2026-def` | ⚠️ Set, not used by any workflow |
| `GOOGLE_DRIVE_ROOT_FOLDER` | folder ID | ⚠️ Set, not used by PM workflows |
| `GOOGLE_DRIVE_UNSORTED_FOLDER` | folder ID | ⚠️ Set, not used by PM workflows |
| `GOOGLE_SHEET_REGISTRY_ID` | sheet ID | ⚠️ Set, not used by PM workflows |
| `GENERIC_TIMEZONE` | `America/Toronto` | ⚠️ Used internally by n8n (not via `$env.`) |
| `DB_POSTGRESDB_*` | postgres internal | ⚠️ Used internally by n8n (not via `$env.`) |

### Summary
- **7 env vars actively used** by `$env.` references in live workflows: `TELEGRAM_BOT_TOKEN`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `WEBHOOK_URL`
- **5 env vars set but unused** by workflows: `TELEGRAM_OWNER_CHAT_ID`, `TWILIO_FROM_NUMBER`, `N8N_API_KEY`, `GOOGLE_DRIVE_*`, `GOOGLE_SHEET_REGISTRY_ID`
- These unused vars are not harmful — they're either pre-staged for future refactors or used internally by n8n itself

## 1.2 Per-node env var usage (live workflows post-deploy)

### [Intake] Channel Router (17 nodes use $env)
| Node | Env Vars | Status |
|---|---|---|
| Welcome Message | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Remove Buttons | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Send List | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Dispatch Ack | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Build Preview Buttons | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Resolved Ack | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Not Resolved Ack | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Match Video AI | `$env.ANTHROPIC_API_KEY` | ✅ |
| Send Video Followup | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Reopen Ack | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Send Typing | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Send Category Prompt | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Media Category Ack | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| TG Get File Path | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| TG Download Photo | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Send WA Question | `$env.WHATSAPP_PHONE_NUMBER_ID`, `$env.WHATSAPP_TOKEN` | ✅ |
| Download Media Immediate | `$env.TELEGRAM_BOT_TOKEN`, `$env.TWILIO_ACCOUNT_SID`, `$env.TWILIO_AUTH_TOKEN` | ✅ |

### [AI] Conversation Agent (3 nodes)
| Node | Env Vars | Status |
|---|---|---|
| Notify Landlord (dead code) | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Notify Non-Urgent (dead code) | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Send Owner Notification | `$env.TELEGRAM_BOT_TOKEN` | ✅ |

### [Response] Channel Dispatcher (3 nodes)
| Node | Env Vars | Status |
|---|---|---|
| Send Telegram | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Send WhatsApp | `$env.WHATSAPP_PHONE_NUMBER_ID`, `$env.WHATSAPP_TOKEN` | ✅ |
| Video Follow-up | `$env.TELEGRAM_BOT_TOKEN` | ✅ |

### [Owner] Message Sender (2 nodes)
| Node | Env Vars | Status |
|---|---|---|
| Send Telegram | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| Send WhatsApp | `$env.WHATSAPP_PHONE_NUMBER_ID`, `$env.WHATSAPP_TOKEN` | ✅ |

### [Ticket] Management (1 node)
| Node | Env Vars | Status |
|---|---|---|
| Notify Landlord | `$env.TELEGRAM_BOT_TOKEN` | ✅ |

### [Media] Upload Handler (4 nodes)
| Node | Env Vars | Status |
|---|---|---|
| TG Get File | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| TG Download | `$env.TELEGRAM_BOT_TOKEN` | ✅ |
| WA Get Media URL | `$env.WHATSAPP_TOKEN` | ✅ |
| WA Download | `$env.WHATSAPP_TOKEN` | ✅ |

### [Intake] WhatsApp Meta (5 nodes)
| Node | Env Vars | Status |
|---|---|---|
| Forward to WA Intake | `$env.WEBHOOK_URL` | ✅ |
| Send WA Confirmation | `$env.WHATSAPP_PHONE_NUMBER_ID`, `$env.WHATSAPP_TOKEN` | ✅ |
| Send WA Ticket Prompt | `$env.WHATSAPP_PHONE_NUMBER_ID`, `$env.WHATSAPP_TOKEN` | ✅ |
| Download WA Media | `$env.WHATSAPP_TOKEN` | ✅ |
| WA Media Ack | `$env.WHATSAPP_PHONE_NUMBER_ID`, `$env.WHATSAPP_TOKEN` | ✅ |

### Voice Agent (1 node)
| Node | Env Vars | Status |
|---|---|---|
| Send Voice Notification | `$env.TELEGRAM_BOT_TOKEN` | ✅ |

**TOTAL: 36 nodes use `$env.` references across 8 workflows. ALL resolve correctly.**

## 1.3 Hardcoded value audit (LIVE post-deploy)

| Hardcoded value | Live count | Expected | Status |
|---|---|---|---|
| Live Telegram bot token (`8460031715:AAE1...`) | 0 | 0 | ✅ |
| Live WhatsApp token prefix (`EAAMZAlW3vRrMBQ8...`) | 0 | 0 | ✅ |
| Production WhatsApp phone ID (`971537566052793`) | 0 | 0 | ✅ |
| Test WhatsApp phone ID (`1002910989571888`) | 2 | 2 | ✅ (in WA Meta filter) |
| Telegram saved cred ID (`5uwoGp7iX1GQkMcu`) | 1 | 1 | ✅ (Telegram Trigger only — required for webhook) |
| WhatsApp saved cred ID (`we3yhVhUwWRnkTGz`) | 0 | 0 | ✅ |

---

# Part 2: Dev vs Live Complete Comparison

## 2.1 Infrastructure

| Component | LIVE (srv1285597) | DEV (srv1466948) |
|---|---|---|
| **n8n version** | 2.10.4 | 2.10.4 |
| **n8n container** | `n8n-n8n-1` | `core-n8n-1` |
| **Dashboard container** | `julia-dash` | `pm-dash` |
| **n8n URL** | `https://n8n.srv1285597.hstgr.cloud` | `https://n8n.srv1466948.hstgr.cloud` |
| **Dashboard URL** | `https://julia.srv1285597.hstgr.cloud` | `https://pm.srv1466948.hstgr.cloud` |
| **Postgres** | `quietly-postgres` (internal) | `quietly-postgres` (internal) |
| **n8n DB name** | `n8n` (postgres) | `n8n` (postgres) |
| **App DB name** | `quietly_db` | `pm_dev_db` |
| **Dashboard auth** | `quietly2024` (basic) | `quietly2024` (basic) |
| **Compose file** | `/docker/n8n/docker-compose.yml` | `/docker/core/docker-compose.yml` (n8n) + `/docker/projects/pm/docker-compose.yml` (dashboard) |

## 2.2 Channel infrastructure

| Channel | LIVE | DEV |
|---|---|---|
| **Telegram bot** | `@dion_property_manager_bot` (`8460031715`) | `@Dev_Property_Management_bot` (`8230685505`) |
| **Telegram webhook** | Auto-registered to live n8n via Telegram Trigger | Auto-registered to dev n8n via Telegram Trigger |
| **WhatsApp Meta App** | `n8n` (`872554515351219`) | `Quietly PM Dev` (`933608786120731`) |
| **WhatsApp number** | `+14389009998` (Julia, prod) — Phone ID `971537566052793` | `+15551830681` (Meta sandbox test) — Phone ID `1002910989571888` |
| **WhatsApp webhook** | `https://n8n.srv1285597.hstgr.cloud/webhook/whatsapp-intake` | `https://n8n.srv1466948.hstgr.cloud/webhook/whatsapp-intake` |
| **Twilio account** | Same Twilio account, same SID, same auth token | Same Twilio account, same SID, same auth token |
| **Twilio webhook** | Configured to LIVE `https://n8n.srv1285597.hstgr.cloud/webhook/sms-intake` | NOT configured to dev (SMS messages can only be tested by simulating webhook calls or using live) |
| **Gmail** | `dionfwang` Gmail OAuth (`ws18m1zty0x1WwiD`) | Same credential ID, but encrypted with live's encryption key — fails to decrypt on dev |

## 2.3 Webhook routing reality

| Tenant action | Where it lands |
|---|---|
| Tenant texts production WhatsApp number `+14389009998` | LIVE n8n only |
| Dion texts dev test number `+15551830681` | BOTH live AND dev n8n receive webhooks (test WABA shared between Meta apps) — but **live filter drops it** (`Parse Meta Message` returns `[]`), so only dev processes it |
| Tenant SMS to `+14389009998` | LIVE n8n only |
| Tenant Telegram to `@dion_property_manager_bot` | LIVE n8n only |
| Dion Telegram to `@Dev_Property_Management_bot` | DEV n8n only |
| Tenant emails Julia | LIVE n8n only (Gmail Trigger polls every 60s) |
| Dev Gmail Trigger | Cannot decrypt credential, throws "bad decrypt" warning, never polls |

## 2.4 Notification routing

Both live and dev use the same "Is Dion?" filter to redirect notifications to Dion when his phone (`5148319058`) is the tenant. The filter exists in:
- AI Conversation Agent → Send Owner Notification
- Voice Agent → Send Voice Notification

| Workflow runs on | Default chat ID | When tenant phone contains `5148319058` |
|---|---|---|
| LIVE | `6274604148` (Julia) from settings table | Overridden to `6216258938` (Dion) |
| DEV | `6216258938` (Dion) from settings table | Same — already Dion |

## 2.5 Workflow node parity

All 8 PM workflows have **identical node counts** between dev, live, and local git. The only parameter difference between dev and live is **intentional**:

| Workflow | Difference | Reason |
|---|---|---|
| `[Intake] WhatsApp Meta` → `Parse Meta Message` | LIVE has filter: `if (incomingPhoneId === '1002910989571888') return [];` DEV does NOT have filter | Dev needs to PROCESS the test number; live needs to DROP it |

Every other workflow node parameter is byte-identical between dev and live.

## 2.6 Env var differences (intentional)

| Variable | LIVE | DEV |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `8460031715:...` (live bot) | `8230685505:...` (dev bot) |
| `TELEGRAM_OWNER_CHAT_ID` | `6274604148` (Julia) | `6216258938` (Dion) |
| `WHATSAPP_TOKEN` | Live Meta app token | Dev Meta app token (System User) |
| `WHATSAPP_PHONE_NUMBER_ID` | `971537566052793` (Julia prod) | `1002910989571888` (test) |
| `WHATSAPP_PHONE_ID` (dashboard) | `971537566052793` | `1002910989571888` |
| `WEBHOOK_URL` | `https://n8n.srv1285597.hstgr.cloud/` | `https://n8n.srv1466948.hstgr.cloud/` |
| `N8N_HOST` | `n8n.srv1285597.hstgr.cloud` | `n8n.srv1466948.hstgr.cloud` |
| `TWILIO_FROM_NUMBER` | `+14389009998` (Julia prod) | `+15148319058` (Dion personal — not actually used) |
| `DB_NAME` (dashboard) | `quietly_db` | `pm_dev_db` |

## 2.7 Env var matches (same on both)

- `ANTHROPIC_API_KEY` — same Claude account
- `TWILIO_ACCOUNT_SID` — same Twilio account
- `TWILIO_AUTH_TOKEN` — same Twilio account
- `ELEVENLABS_API_KEY` (dashboard only) — same account
- `DASHBOARD_PASSWORD` — same basic auth
- `GENERIC_TIMEZONE` — `America/Toronto`
- `DB_POSTGRESDB_*` — same internal Docker Postgres

## 2.8 Database isolation (verified 2026-04-08)

Live and dev are on **completely separate VPS hosts** with **completely separate Postgres servers**:

| | LIVE | DEV |
|---|---|---|
| VPS hostname | `srv1285597` | `srv1466948` |
| Postgres container IP | `172.18.0.8` | `172.19.0.4` |
| Postgres data volume | `/opt/postgres/data` | `/var/lib/docker/volumes/core_postgres_data/_data` |
| n8n DB name | `n8n` (same name, different physical DB) | `n8n` (same name, different physical DB) |
| App DB name | `quietly_db` | `pm_dev_db` |

**No cross-contamination risk.** Both containers happen to be named `quietly-postgres` and both use a database called `n8n`, but they're physically isolated on different machines. Importing a workflow on dev does NOT touch live's database.

---

# Part 3: SOP for Dev → Live Migration

## 3.1 Pre-flight checklist

Before any live deployment, verify ALL of these:

### Local code state
- [ ] Local git repo is clean (`git status` shows no uncommitted changes)
- [ ] Local workflows in `~/Desktop/Projects/julia-pm/workflows/` are the canonical source
- [ ] Recent commits include the changes you want to deploy
- [ ] CLAUDE.md and any audit docs are updated

### Pre-audit (3-way diff)
1. **Export LIVE workflows** to a temp dir for backup AND audit reference
2. **Export DEV workflows** for comparison (should match LOCAL except for known intentional diffs)
3. **Compare LOCAL ↔ DEV** — they should be byte-identical except for:
   - WhatsApp Meta `Parse Meta Message` filter (LOCAL has it, DEV doesn't)
4. **Compare LOCAL ↔ LIVE** for each affected workflow — list every node that will change
5. **Categorize each change** as: type-conversion, token-swap, param-diff, cred-removed
6. **Flag any unexpected diffs** (especially `cred-removed` on Postgres/Gmail nodes — those should be preserved)

### Critical: 5-regression check
Verify these LIVE-only fixes are present in LOCAL before deploying:
- [ ] AI Agent `Send Owner Notification` has `isDion ? '6216258938' : ownerChatId`
- [ ] Voice Agent `Send Voice Notification` has same Is Dion filter
- [ ] Intake `Match Video AI` uses `$env.ANTHROPIC_API_KEY` (NOT `'ANTHROPIC_API_KEY_SET_IN_N8N_ENV'`)
- [ ] Intake `Show Preview` uses `$('Parse Callback').item.json.chat_id` (NOT hardcoded `'6216258938'`)
- [ ] Intake `Build Preview Buttons` uses dynamic chat_id

### Live infrastructure check
- [ ] All required env vars set on live n8n container (run `docker exec n8n-n8n-1 env | grep -E '...'`)
- [ ] Live container is healthy
- [ ] No active executions in progress (check recent execution table)
- [ ] Production traffic is low (after-hours window)

## 3.2 Backup procedure (mandatory)

**Always take a fresh backup immediately before deploying.** The backup files from yesterday are not enough — workflows may have changed.

```bash
# Step 1: Create timestamped backup directory in n8n container
TS=$(date +%Y%m%d-%H%M%S)
ssh root@srv1285597.hstgr.cloud "docker exec n8n-n8n-1 mkdir -p /tmp/live_backup_$TS"

# Step 2: Export each PM workflow into the container's tmp dir
ssh root@srv1285597.hstgr.cloud "
for wf in 6uqrzVIcH8GFznDf 5WW7m5IiqvJoHWZ1 ErGEhkdaWj0zTmQI owner-msg-sender-001 \\
          CnUFSXbeIk9GNI5t media-upload-handler-001 x6LjYZQ2l05BS8uP JO26ruzPNp1MQThL; do
  docker exec n8n-n8n-1 n8n export:workflow --id=\$wf \\
    --output=/tmp/live_backup_$TS/\$wf.json
done
"

# Step 3: Copy from container to host AND to local laptop (3-tier backup)
ssh root@srv1285597.hstgr.cloud "docker cp n8n-n8n-1:/tmp/live_backup_$TS/ /tmp/host_live_backup_$TS/"
mkdir -p /tmp/live_backup_$TS
scp -q "root@srv1285597.hstgr.cloud:/tmp/host_live_backup_$TS/*.json" /tmp/live_backup_$TS/

# Step 4: Verify
ls /tmp/live_backup_$TS/  # Should show 8 files
```

**Also backup the docker-compose** if you're touching env vars:
```bash
ssh root@srv1285597.hstgr.cloud "cp /docker/n8n/docker-compose.yml /docker/n8n/docker-compose.yml.bak.$TS"
```

## 3.3 Workflow deployment order

Deploy in **safest first** order. Each workflow imported separately, then n8n restarted ONCE at the end (cleaner than restarting after each).

### Order
1. **Voice Agent** — least risky, 1 node change, no webhook trigger
2. **Ticket Management** — internal webhooks only
3. **Media Upload Handler** — called via Execute Workflow
4. **Owner Message Sender** — internal dashboard webhook
5. **Response Channel Dispatcher** — called from AI Agent
6. **AI Conversation Agent** — called from Intake
7. **Intake Channel Router** — biggest, has Telegram Trigger
8. **WhatsApp Meta Intake** — has Meta webhook + filter

### Per-workflow deploy command pattern

```bash
# Stage the local file on live server
scp -q "/Users/dion/Desktop/Projects/julia-pm/workflows/<file>.json" \
  "root@srv1285597.hstgr.cloud:/tmp/deploy_<file>.json"

# Copy into n8n container and import
ssh root@srv1285597.hstgr.cloud "
docker cp /tmp/deploy_<file>.json n8n-n8n-1:/tmp/deploy.json
docker exec n8n-n8n-1 n8n import:workflow --input=/tmp/deploy.json 2>&1 | grep -E 'Successfully|error|fail'
docker exec n8n-n8n-1 n8n update:workflow --id=<workflow_id> --active=true 2>&1 | grep -E 'error|fail' || echo 'OK'
"
```

After all 8 are imported (without restarting n8n yet):

```bash
# Single restart to activate all
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose restart n8n"

# Wait for activation, then check logs
sleep 10
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose logs n8n --tail 80 2>&1 | grep -iE 'activat|error' | grep -v Python | grep -v deprecation"
```

## 3.4 Post-deploy verification

### Automated checks (run immediately)

1. **All 8 PM workflows active in DB:**
```sql
SELECT id, active, name FROM workflow_entity 
WHERE id IN ('6uqrzVIcH8GFznDf', '5WW7m5IiqvJoHWZ1', 'ErGEhkdaWj0zTmQI',
             'owner-msg-sender-001', 'CnUFSXbeIk9GNI5t', 'media-upload-handler-001',
             'x6LjYZQ2l05BS8uP', 'JO26ruzPNp1MQThL');
-- All should show active=true
```

2. **Verify 5 critical fixes in deployed workflows** (re-export + grep):
```bash
# AI Agent Send Owner Notification: must have Is Dion filter
# Voice Agent Send Voice Notification: must have Is Dion filter
# Intake Match Video AI: must use $env.ANTHROPIC_API_KEY
# Intake Show Preview: must use dynamic chat_id
# Intake Build Preview Buttons: must use dynamic chat_id
```

3. **Verify zero hardcoded tokens remain:**
```bash
# Should be 0 across all 8 workflows:
# - Live Telegram bot token (8460031715:AAE1...)
# - Live WhatsApp token prefix (EAAMZAlW3vRrMBQ8...)
# - Production WhatsApp phone ID (971537566052793)
# - WhatsApp saved credential ID (we3yhVhUwWRnkTGz)
```

4. **Verify Telegram Trigger preserved:** must still have `5uwoGp7iX1GQkMcu` credential

5. **Verify env vars set:** all `$env.` references in deployed workflows must resolve

### Manual end-to-end test (from your phone)

After automated checks pass, test from a real phone:

1. **Telegram:** Send message to `@dion_property_manager_bot` → wait for bot reply
2. **SMS:** Text `+14389009998` → wait for bot reply
3. **WhatsApp:** Message `+14389009998` on WhatsApp → wait for bot reply
4. **Video matching:** Send "my kitchen sink is clogged" → reply should include video link
5. **Notification routing:** Verify ticket notification arrives in YOUR Telegram (`@dion_property_manager_bot`), not Julia's
6. **Dispatch flow:** Click "Auto Dispatch" on a notification → verify preview goes to YOUR chat
7. **Live dashboard:** Open `julia.srv1285597.hstgr.cloud` → verify new tickets appear

### Verify no Julia notifications

After your test messages, run a brute-force scan:
```bash
# For each AI Agent execution in the test window:
# 1. Check Send Owner Notification output → ownerChatId must be 6216258938 (Dion)
# 2. Search execution data for any "chat_id":"6274604148" pattern (should be 0)
# 3. Julia chat ID 6274604148 should only appear as "Get Owner Chat ID" lookup result, never as send target
```

## 3.5 Rollback procedure

If anything breaks:

### Single workflow rollback
```bash
# Re-import the backup of the failing workflow
TS=20260408-184256  # use the backup timestamp
ssh root@srv1285597.hstgr.cloud "
docker cp /tmp/host_live_backup_$TS/<workflow_id>.json n8n-n8n-1:/tmp/rollback.json
docker exec n8n-n8n-1 n8n import:workflow --input=/tmp/rollback.json
docker exec n8n-n8n-1 n8n update:workflow --id=<workflow_id> --active=true
"
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose restart n8n"
```

### Full rollback (all 8 workflows)
```bash
# Re-import all backup files
TS=20260408-184256
ssh root@srv1285597.hstgr.cloud "
for wf in 6uqrzVIcH8GFznDf 5WW7m5IiqvJoHWZ1 ErGEhkdaWj0zTmQI owner-msg-sender-001 \\
          CnUFSXbeIk9GNI5t media-upload-handler-001 x6LjYZQ2l05BS8uP JO26ruzPNp1MQThL; do
  docker cp /tmp/host_live_backup_$TS/\$wf.json n8n-n8n-1:/tmp/rb_\$wf.json
  docker exec n8n-n8n-1 n8n import:workflow --input=/tmp/rb_\$wf.json
  docker exec n8n-n8n-1 n8n update:workflow --id=\$wf --active=true
done
cd /docker/n8n && docker compose restart n8n
"
```

### Compose rollback
```bash
ssh root@srv1285597.hstgr.cloud "
cp /docker/n8n/docker-compose.yml.bak.$TS /docker/n8n/docker-compose.yml
cd /docker/n8n && docker compose up -d n8n dashboard
"
```

## 3.6 Lessons learned (what NOT to do)

### Don't do these
1. **Don't deploy LOCAL to DEV.** LOCAL has the WhatsApp filter that drops test traffic — deploying it to dev would prevent dev from processing the test number.
2. **Don't delete the Telegram Trigger credential.** It's the one native credential that must be preserved (required for Telegram webhook registration).
3. **Don't restart n8n without warning.** Tenant messages mid-restart can be lost (Telegram retries, WhatsApp retries within 1h, Twilio is fire-and-forget).
4. **Don't deploy without a fresh backup.** Yesterday's backup may be stale.
5. **Don't skip the 3-way audit.** LOCAL/DEV can drift from LIVE in subtle ways.
6. **Don't deploy multiple workflows with overlapping changes.** Always test the simpler ones first.
7. **Don't deploy during tenant active hours** (8am-8pm typically).
8. **Don't bypass the regression checks.** The 5 critical fixes were almost lost — check them every time.

### Do these
1. **Always commit + push to git BEFORE deploying.** Provides a code-level backup.
2. **Always backup live workflows immediately before deploy.**
3. **Always test on dev first** (with simulated webhooks for non-Telegram channels).
4. **Always restart n8n once at the end** rather than after each workflow import.
5. **Always verify with execution data**, not just dashboard appearances.
6. **Always check the "Is Dion?" filter** is preserved in any workflow with notification logic.

## 3.7 Quick command reference

```bash
# Check live env var
ssh root@srv1285597.hstgr.cloud "docker exec n8n-n8n-1 sh -c 'echo \$VAR_NAME'"

# Export live workflow
ssh root@srv1285597.hstgr.cloud "
docker exec n8n-n8n-1 n8n export:workflow --id=<wfid> --output=/tmp/wf.json
docker cp n8n-n8n-1:/tmp/wf.json /tmp/wf.json
"
scp root@srv1285597.hstgr.cloud:/tmp/wf.json /tmp/wf.json

# List recent live executions
ssh root@srv1285597.hstgr.cloud "docker exec quietly-postgres psql -U quietly -d n8n -t -c \"
SELECT e.id, w.name, e.status, e.\\\"startedAt\\\"
FROM execution_entity e JOIN workflow_entity w ON e.\\\"workflowId\\\" = w.id
WHERE e.\\\"startedAt\\\" > NOW() - INTERVAL '15 minutes'
ORDER BY e.\\\"startedAt\\\" DESC LIMIT 20;
\""

# Get execution data (find chat_id targets)
ssh root@srv1285597.hstgr.cloud "docker exec quietly-postgres psql -U quietly -d n8n -At -c \"
SELECT data::text FROM execution_data WHERE \\\"executionId\\\" = <id>;
\"" > /tmp/exec.txt
```

---

## Status as of 2026-04-08 23:00 UTC

✅ **Live deployment of credential refactor is COMPLETE**
- All 8 PM workflows deployed
- All 36 `$env.` references resolve correctly
- 5 critical regression fixes verified present
- Zero hardcoded tokens
- Telegram Trigger native credential preserved
- WhatsApp Meta filter (drop test traffic) preserved
- 2 test executions confirmed Julia received zero notifications (Is Dion filter working)

⚠️ **Pending end-to-end manual verification from your phone** (Telegram + SMS + WhatsApp + dispatch + video matching)

## Next sessions
1. Twilio credential refactor (separate session)
2. Gmail credential refactor (separate session)
3. SQL Runner test payload bug fix

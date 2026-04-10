# Live Deployment Audit — 2026-04-07

3-way audit (LOCAL ↔ DEV ↔ LIVE) of all 8 PM workflows before deploying the Telegram + WhatsApp credential refactor to production.

## Source files compared

- **LIVE:** `srv1285597.hstgr.cloud` — n8n workflow exports as of 2026-04-07 20:30
- **DEV:** `srv1466948.hstgr.cloud` — n8n workflow exports as of 2026-04-07 20:30
- **LOCAL:** `~/Desktop/Projects/julia-pm/workflows/*.json` — git HEAD

## Workflows audited

| ID | File | Live nodes | Local nodes |
|---|---|---|---|
| `6uqrzVIcH8GFznDf` | Intake_Channel_Router | 88 | 88 |
| `5WW7m5IiqvJoHWZ1` | AI_Conversation_Agent | 27 | 27 |
| `ErGEhkdaWj0zTmQI` | Response_Channel_Dispatcher | 9 | 9 |
| `owner-msg-sender-001` | Owner_Message_Sender | 8 | 8 |
| `CnUFSXbeIk9GNI5t` | Ticket_Management | 19 | 19 |
| `media-upload-handler-001` | Media_Upload_Handler | 18 | 18 |
| `x6LjYZQ2l05BS8uP` | WhatsApp_Meta_Intake | 26 | 26 |
| `JO26ruzPNp1MQThL` | Voice_Agent_Log_Maintenance_Request | 21 | 21 |

Node counts match across all 3 sources. All differences are inside existing nodes (parameters, code, credential bindings).

## Migration scope (LIVE → LOCAL changes)

| Workflow | Total node changes | Type conversions | Token swaps | Cred ref removed |
|---|---|---|---|---|
| Intake Channel Router | 20 | 3 | 13 | 3 |
| AI Conversation Agent | 4 | 1 | 0 | 1 |
| Response Channel Dispatcher | 3 | 1 | 3 | 1 |
| Owner Message Sender | 3 | 1 | 2 | 1 |
| Ticket Management | 1 | 1 | 0 | 1 |
| Media Upload Handler | 4 | 0 | 2 | 2 |
| WhatsApp Meta Intake | 4 | 2 | 3 | 2 |
| Voice Agent | 1 | 0 | 1 | 0 |
| **TOTAL** | **40** | **9** | **24** | **11** |

- **Type conversions:** Native Telegram/WhatsApp nodes → HTTP Request nodes
- **Token swaps:** Hardcoded `8460031715:AAE1...` and `971537566052793` → `$env.TELEGRAM_BOT_TOKEN` / `$env.WHATSAPP_PHONE_NUMBER_ID`
- **Cred ref removed:** Native node → HTTP Request, no credential needed (Bearer header instead)

## CRITICAL REGRESSIONS — Must fix before deploy

LIVE has 4 fixes that LOCAL/DEV are missing. These were added directly to live in past sessions and never made it back into git. Deploying current LOCAL would erase them.

### 1. AI Conversation Agent — `Send Owner Notification` missing "Is Dion?" filter

**Severity:** 🔴 CRITICAL — would notify Julia for every test message Dion sends

**Live code (correct):**
```javascript
const ownerChatId = $('Get Owner Chat ID').first().json.owner_chat_id;
const ticket = $('Generate Ticket').item.json;
const isUrgent = ticket.urgency === 'urgent';
const botToken = $env.TELEGRAM_BOT_TOKEN || '8460031715:...';
// Is Dion testing? Route to Dion instead of Julia
const tenantPhone = $('Generate Ticket').item.json.phone || '';
const isDion = tenantPhone.includes('5148319058');
const chatId = isDion ? '6216258938' : ownerChatId;

// ... build text ...

const body = { chat_id: chatId, text, parse_mode: 'HTML' };
// ... POST to Telegram API ...
return [{ json: { sent: true, ownerChatId: chatId, ticketId: ticket.ticket_id, isUrgent } }];
```

**Local code (broken):**
```javascript
// Filter MISSING — uses ownerChatId directly
const body = { chat_id: ownerChatId, text, parse_mode: 'HTML' };
return [{ json: { sent: true, ownerChatId, ticketId: ticket.ticket_id, isUrgent } }];
```

### 2. Voice Agent — `Send Voice Notification` missing "Is Dion?" filter

**Severity:** 🔴 CRITICAL — Voice call tests would notify Julia

Same pattern as #1: live has the `isDion` check, local doesn't. Filter checks `$('Edit Fields').item.json.phone` instead of `$('Generate Ticket')` since Voice Agent has different upstream nodes.

### 3. Intake Channel Router — `Match Video AI` has placeholder API key

**Severity:** 🔴 CRITICAL — would break video matching for ALL tenant messages

**Live code (correct):**
```javascript
'x-api-key': '<REDACTED — full Anthropic API key hardcoded>'
```

**Local code (broken):**
```javascript
'x-api-key': 'ANTHROPIC_API_KEY_SET_IN_N8N_ENV'  // placeholder string, not interpolated
```

**Fix:** Use `$env.ANTHROPIC_API_KEY` (env var exists on both servers).

### 4. Intake Channel Router — `Show Preview` hardcoded chat_id

**Severity:** 🟡 MEDIUM — vendor preview goes to wrong person when Julia clicks dispatch

**Live code (correct):**
```javascript
return {
  json: {
    chat_id: $('Parse Callback').item.json.chat_id,  // dynamic — whoever pressed the button
    text: text,
    ticket_id: ticketId,
    ...
  }
};
```

**Local code (broken):**
```javascript
return {
  json: {
    chat_id: '6216258938',  // hardcoded Dion
    ...
  }
};
```

Same issue likely exists in `Build Preview Buttons` — needs verification.

## Other LIVE-only content (not regressions, but to preserve)

### Telegram dispatch flow Code nodes use `$('Parse Callback').item.json.chat_id`
This is the April 4 dynamic dispatch routing fix. Must verify these nodes preserve the dynamic reference after the credential refactor:
- `Show Preview`
- `Build Preview Buttons`
- `Send List`
- `Dispatch Ack`

### Hardcoded credentials in LIVE that are intentionally swapped to $env in LOCAL
These are the actual point of the refactor — not regressions:
- 20 references to live Telegram bot token `8460031715:AAE1...` → `$env.TELEGRAM_BOT_TOKEN`
- 7 references to production phone ID `971537566052793` → `$env.WHATSAPP_PHONE_NUMBER_ID`
- 5 references to credential `5uwoGp7iX1GQkMcu` (Telegram saved cred) → removed (HTTP nodes)
- 7 references to credential `we3yhVhUwWRnkTGz` (WhatsApp saved cred) → removed (HTTP nodes)

## Pre-deployment checklist

Before importing any workflow to live:

- [ ] Fix all 4 regressions in LOCAL
- [ ] Verify `Build Preview Buttons` preserves dynamic chat_id
- [ ] Deploy fixed LOCAL to DEV
- [ ] Test on DEV: send Telegram from your number → verify Dion gets notification, Julia doesn't
- [ ] Test on DEV: send a message that should match a video → verify Match Video AI returns a match
- [ ] Test on DEV: full vendor dispatch flow → verify preview goes to correct chat
- [ ] Take fresh backup of all 8 LIVE workflows immediately before deploy
- [ ] Have rollback files ready (`/tmp/audit/live/*.json`)

## Deployment plan (workflow-by-workflow)

Order matters — deploy least-risky first, build confidence, then critical path:

1. **Voice Agent** (1 node change, no webhook trigger) — safest first deploy
2. **Ticket Management** (1 node change, internal webhooks only)
3. **Media Upload Handler** (4 changes, called via Execute Workflow)
4. **Owner Message Sender** (3 changes, internal webhook)
5. **Response Channel Dispatcher** (3 changes, called from AI Agent)
6. **AI Conversation Agent** (4 changes, called from Intake)
7. **Intake Channel Router** (20 changes, has Telegram Trigger — biggest)
8. **WhatsApp Meta Intake** (4 changes, has Meta webhook)

Between each:
- Verify workflow is active in DB
- Curl a test webhook if available
- Check `docker compose logs n8n --tail 20` for errors
- Wait 30 seconds before next import

## Risk register

| # | Risk | Severity | Probability | Mitigation |
|---|---|---|---|---|
| 1 | Julia gets test notifications | 🔴 HIGH | 100% | Fix regression #1 + #2 BEFORE deploy |
| 2 | Video matching broken | 🔴 HIGH | 100% | Fix regression #3 BEFORE deploy |
| 3 | Vendor dispatch preview wrong chat | 🟡 MED | 100% when triggered | Fix regression #4 BEFORE deploy |
| 4 | Voice agent test notifies Julia | 🔴 HIGH | When voice triggered | Fix regression #2 BEFORE deploy |
| 5 | Telegram Trigger webhook re-registration fails | 🟡 MED | Low | Native trigger preserved, n8n re-registers automatically |
| 6 | Workflow import fails | 🟢 LOW | Very low | Done many times today, idempotent |
| 7 | Production execution mid-deploy | 🟡 MED | ~10s window | Deploy at low-traffic time |
| 8 | Postgres credential breaks (false alarm) | 🟢 N/A | 0% | Verified all Postgres nodes still have cred id `JlETYTnhAwFrsmL9` |

## Backup files

- **Live compose backup:** `/docker/n8n/docker-compose.yml.bak.20260407-201128` (on srv1285597)
- **Live workflows snapshot:** `/tmp/audit/live/live_*.json` (8 files, local laptop)
- **Live PM Meta filter (Parse Meta Message):** Already deployed earlier today, in current live state

## Status

**As of 2026-04-07 20:40:** Audit complete, deployment BLOCKED until 4 regressions are patched in LOCAL. Next session: apply fixes, test on dev, then deploy to live.

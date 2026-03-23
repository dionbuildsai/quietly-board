# Julia Inc — Property Management Automation

## Project Overview
Property management automation for **Julia Inc** (Quebec-based). 5 n8n workflows (149 nodes) handle tenant messages across Telegram, Email, SMS, and WhatsApp — auto-classifying issues, creating tickets, suggesting repair videos, dispatching vendors, and replying via AI.

**n8n Instance:** `https://n8n.srv1285597.hstgr.cloud`
**Dashboard:** `https://dash.srv1285597.hstgr.cloud` — Next.js dashboard (Docker)
**NocoDB:** `https://nocodb.srv1285597.hstgr.cloud`
**GitHub (workflows):** `dionbuildsai/quietly-board` (branch: main)
**GitHub (dashboard):** `dionbuildsai/quietly-dash` (branch: main)
**Project Dir (workflows):** `~/Desktop/Quietly/Client Automations/Julia/Property_Management/`
**Project Dir (dashboard):** `~/Desktop/Quietly/quietly-dash/`
**Database:** PostgreSQL ("Quietly DB" — credential ID: `JlETYTnhAwFrsmL9`)

---

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │         [Intake] Channel Router (76 nodes)    │
  Telegram ────────►│  Normalize → Lookup Tenant → Log Message     │
  Email (Gmail) ───►│  → Build AI Payload → Call AI Agent          │
  SMS (Twilio) ────►│  → AI Video Match (Haiku)                    │
  WhatsApp ────────►│  Callbacks: dispatch, video, resolve_yes/no  │
                    └──────────────┬───────────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────────────┐
                    │       [AI] Conversation Agent (27 nodes)      │
                    │  Claude Sonnet 4 → Classify → Create Ticket  │
                    │  → Should Resolve? → Resolve Ticket          │
                    │  → Ask Resolution Confirmation               │
                    └──────────────┬───────────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────────────┐
                    │    [Response] Channel Dispatcher (9 nodes)    │
                    │  Routes reply → Telegram/Email/SMS/WhatsApp  │
                    │  + Video follow-up buttons (Telegram)        │
                    └──────────────────────────────────────────────┘

                    ┌──────────────────────────────────────────────┐
                    │      [Ticket] Management (19 nodes)           │
                    │  Webhook API for ticket ops + SQL runner      │
                    └──────────────────────────────────────────────┘
```

---

## Workflows (in `workflows/` directory)

| Workflow | n8n ID | Nodes | Purpose |
|----------|--------|-------|---------|
| **[Intake] Channel Router** | `6uqrzVIcH8GFznDf` | 76 | All 4 channel triggers, normalize, tenant lookup, log message, AI handoff, AI video match (Haiku), callback dispatch, resolve_yes/no callbacks |
| **[AI] Conversation Agent** | `5WW7m5IiqvJoHWZ1` | 27 | Claude Sonnet 4 agent + Haiku classifier, ticket creation, resolve flow (Should Resolve? → Resolve Ticket → Ask Resolution Confirmation) |
| **[Response] Channel Dispatcher** | `ErGEhkdaWj0zTmQI` | 9 | Route reply to channel + video follow-up buttons on Telegram |
| **[Media] Upload Handler** | `Iyv7PotiAq2beRae` | 18 | Download media from Telegram/WhatsApp, upload to Google Drive, update pending_media, return drive URL |
| **[Ticket] Management** | `CnUFSXbeIk9GNI5t` | 19 | Webhook API endpoints + SQL runner |
| **[Owner] Message Sender** | `owner-msg-sender-001` | 8 | Webhook `POST /owner-message` → log to messages + dispatch via channel |
| **Voice Agent** | `JO26ruzPNp1MQThL` | 25 | ElevenLabs phone agent: convai-init webhook, PM_get_status, PM_log_maintenance, PM_post_call_log |

---

## Voice Agent (ElevenLabs)

**Phone:** +14389009998 (Twilio → ElevenLabs)
**ElevenLabs Agent ID:** `agent_6201km9s1231fdm8ajv5e55gyf8j`
**ElevenLabs Agent Name:** Julia — Property Management
**ElevenLabs API Key:** `sk_57816803559387cff8890341b07837e9966fe34ee982ad23`
**LLM:** Gemini 2.5 Flash
**Voices:** Sarah (English, `EXAVITQu4vr4xnSDxMaL`), Charlotte (French, `XB0fDUnXU5powFXDhCwa`)
**TTS Model:** `eleven_flash_v2`

### How Tenant Lookup Works
**IMPORTANT:** ElevenLabs `conversation_initiation_client_data_webhook` (workspace level) is **NOT called for inbound Twilio phone calls** — client-side only (web SDK/widget). The `/webhook/convai-init` n8n flow exists but is never triggered for real calls.

**Correct approach:** Agent calls `PM_get_status` as its **very first action** when the tenant speaks. This auto-fills `tenant_phone` via `dynamic_variable: "system__caller_id"` (always available on phone calls) and returns name, unit, open tickets. The agent addresses the caller by name from this result.

- Agent must NEVER ask for name, unit number, or phone — always from PM_get_status
- If PM_get_status finds no record → proceed without a name, do not ask
- **Emergency protocol**: NEVER tell tenant to vacate/leave — that is the landlord's decision; tenant may need to stay to open door for contractors. Say "your safety is the priority, team is being notified right away."
- **Natural speech**: Agent uses brief fillers ("Sure", "Of course", "Let me see") and says "One moment..." before calling PM_log_maintenance only. PM_post_call_log is called silently at end of call — agent says nothing before or after it (step 6 in system prompt)
- **Silence filler** (`soft_timeout_config`): "Mm, let me see..." (fires when turn timeout is reached)
- **Telegram recipients**:
  - **Dion:** 6216258938 — always receives all notifications
  - **Julia:** 6274604148 — receives notifications ONLY when it is NOT Dion testing
  - **Filter logic (Is Dion? IF node):** checks if tenant phone contains `5148319058` (Dion's number). If TRUE → Dion only. If FALSE → also send to Julia.
  - Voice Agent uses `={{ $('Edit Fields').item.json.phone }}` as the check value
  - AI Conversation Agent uses `={{ $('Generate Ticket').item.json.phone }}` as the check value
  - This filter covers ALL channels: phone (caller ID), Telegram (looked up from tenants table), SMS, WhatsApp, Email — all resolve to Dion's phone 15148319058 for his test account (Aisha Brown)

### Voice Agent n8n Tools
| Tool (webhook path) | Method | Purpose |
|---------------------|--------|---------|
| `/webhook/convai-init` | POST | Exists but NOT called for Twilio inbound — kept for future web use |
| `/webhook/get-status` | POST | Tenant info + open tickets by phone — called first on every call |
| `/webhook/log-maintenance` | POST | Create new maintenance ticket |
| `/webhook/post-call-log` | POST | Log call transcript to call_logs table |

### PM_log_maintenance Tool Config (ElevenLabs)
- `tenant_phone`: LLM fills from `{{system__caller_id}}` in system prompt (digits only, strip +)
- `tenant_name`: LLM fills from PM_get_status result
- `unit_number`: LLM fills from PM_get_status result
- `channel` → `constant_value: "phone"`
- Required: `category`, `description`, `urgency`, `tenant_message`

**PM_get_status / PM_post_call_log** — `tenant_phone` auto-filled via `dynamic_variable: "system__caller_id"` (always available on phone calls). `call_id` auto-filled via `dynamic_variable: "system__conversation_id"`.

**Key rule:** Agent must CALL PM_log_maintenance — not say "I'm logging". Tool call first, confirm after.

### convai-init Flow (n8n, kept but not used for phone calls)
`Convai Init` → `Extract Phone` (Code: strip non-digits from caller_id) → `SQL Tenant Lookup` (Postgres: COALESCE LEFT JOIN) → `Format Init` (Code: build response) → `Respond Init`

- `$helpers.httpRequest` is NOT available in this n8n Code node context — always use Postgres nodes for DB access

### log-maintenance chain (n8n)
```
Log Maintenance → Edit Fields → Lookup Tenant Info → Merge for Insert → Insert rows in a table → Urgent?
  ├─(urgent)─► Send Urgent Notification → Is Dion? (urgent)
  │               ├─(TRUE / Dion)──────► Respond to Webhook
  │               └─(FALSE / Julia)────► Send Urgent Notification - Julia → Respond to Webhook
  └─(not urgent)► Send a text message → Is Dion? (text)
                    ├─(TRUE / Dion)──────► Respond to Webhook
                    └─(FALSE / Julia)────► Send text message - Julia → Respond to Webhook
```

- `Lookup Tenant Info` (Postgres): fetches `tenant_email` + `property_name` by `$json.phone`. Uses **MAX() aggregate** (`COALESCE(MAX(...))`) so query always returns exactly 1 row even with no match — prevents chain stoppage. `alwaysOutputData: true`.
  - SQL: `SELECT COALESCE(MAX(t.email), '') AS tenant_email, COALESCE(MAX(TRIM(COALESCE(p.name,'') || ' ' || COALESCE(p.address,''))), '') AS property_name FROM tenants t LEFT JOIN properties p ON t.property_id = p.id WHERE t.phone = '{{ $json.phone }}';`
- `Merge for Insert` (Code): combines Edit Fields + Lookup, populates ALL columns: `tenant_phone`, `unit_number`, `description`, `property`, `tenant_email` (aliases so both column name variants are filled).
- **Ticket ID**: `TK-` + last 8 chars of `$now.toMillis().toString(36).toUpperCase()` — alphanumeric, not timestamp.
- **Urgent? (IF node)**: checks `$json.urgency === "urgent"` after Insert rows — routes to either urgent or non-urgent Telegram.
- **Send Urgent Notification** (Telegram): `URGENT TICKET TK-XXXX` with inline keyboard — **Auto Dispatch** (`dispatch||TK-XXXX||category`) and **Show Contractors** (`manual||TK-XXXX||category`) buttons. Same callback_data format as text channel dispatch flow.
- **Send a text message** (non-urgent Telegram): `NEW TICKET TK-XXXX`. Fields: Category, Tenant, Unit, Property (full address), Summary. No phone/email/urgency/keywords. `appendAttribution: false`.
- **PM_log_maintenance `description`**: Narrative 2-sentence format — "Tenant [name] is [X]. AI is [clarifying Y]." (ElevenLabs tool field description updated)
- **PM_log_maintenance `tenant_phone`**: `dynamic_variable: "system__caller_id"`, `description: ""` — auto-filled from Twilio caller ID, always present. Added to `required` array. (description must be empty when dynamic_variable is set — mutually exclusive)

### ElevenLabs Agent — Auto Hang-up
- `end_call` built-in tool enabled
- Call flow step 7: After `PM_post_call_log` returns → immediately call `end_call`
- Agent says nothing after PM_post_call_log — just hangs up

### Git Note
`workflows/Intake_Channel_Router.json` in git has `ANTHROPIC_API_KEY_SET_IN_N8N_ENV` as a placeholder for the Haiku API call in `Match Video AI`. The live n8n workflow has the real key. Set `ANTHROPIC_API_KEY` in n8n environment if redeploying from git.

---

## Channel Status (all verified)

| Channel | Trigger | Tenant Lookup | Reply | Tested |
|---------|---------|--------------|-------|--------|
| Telegram | Telegram Trigger | telegram_id | Bot API (HTTP) | Yes |
| Email | Gmail poll (1 min) | Case-insensitive email, extracts from "Name \<email\>" | Gmail | Yes |
| SMS | Webhook POST `/sms-intake` | Phone (strips + prefix from Twilio) | Twilio | Yes |
| WhatsApp | Meta webhook POST `/whatsapp-intake` | Phone RIGHT(10) | WhatsApp Business API | Yes |

### Channel-Specific Notes
- **SMS:** Parse SMS code node handles Twilio's `application/x-www-form-urlencoded` format (From/Body/MessageSid)
- **WhatsApp:** GET webhook at `/whatsapp-intake` handles Meta callback verification. Status updates (sent/delivered/read) filtered in Parse WhatsApp.
- **Email:** Unknown senders silently dropped (no reply to spam/newsletters)

---

## AI Behavior

### Models
| Node | Model | Purpose |
|------|-------|---------|
| Julia AI | Claude Sonnet 4 | Main conversation (3 exchanges per issue) |
| Haiku Classifier | Claude Haiku 4.5 | Action classification, urgency |
| Haiku Dispatch | Claude Haiku 4.5 | Vendor message generation |
| Haiku Confirm | Claude Haiku 4.5 | Confirmation message |

### Key Prompt Rules
- **Language:** Default English, match tenant's language (detects from message, not DB)
- **No signature:** Don't sign messages with Julia or company name (tenant messages only)
- **Always ask first:** Never assume severity. "Smoke" → ask if cooking/cigarette/fire. Only suggest leaving unit after tenant confirms real danger.
- **Never mention 911** or emergency services
- **3 exchanges max** per issue, then wrap up
- **Cost-saving & liability rules:** Primary goal is tenant self-help. Suggest tenant buys own tools (plunger, drain snake). Never say "we'll send someone" or "we'll take care of it" — creates liability. Only escalate after tenant confirms self-help failed. Use vague language: "we'll assess next steps".

### Ticket Classification
- **ALWAYS creates ticket** on any issue/request/question (even on first message while asking questions)
- Only `false` for greetings, thank-yous, or existing ticket for **same category** continuing same conversation
- **Different category = new ticket**: if tenant switches topics (e.g. open pest_control ticket but now mentions a dripping faucet → create new plumbing ticket)
- **Urgency:** `urgent` (only confirmed emergencies), `not_urgent` (default), `info_request` (non-maintenance)
- **Urgency on message_count=1: ALWAYS `not_urgent`** — no exceptions, even for scary-sounding messages
- `urgent` only when message_count ≥ 2 AND tenant has explicitly confirmed danger
- **Categories:** plumbing, electrical, hvac, appliance, pest_control, locksmith, general_maintenance, lease_admin, parking, general_inquiry
- **`resolve_ticket`:** classifier outputs `true` when tenant confirms issue is fixed ("it's working now", "the plunger worked") — triggers Resolve Ticket flow in AI Agent

### Video Suggestions
- `repair_videos` table: 8 YouTube videos with keywords array + category
- Video search runs in **Intake Channel Router** (not AI Agent) — `Search Repair Videos` → `AI Video Match` code node
- Matching uses **Claude Haiku API** (not keyword scoring): sends tenant message + video list, Haiku returns index or "none"
- Only suggests video when Haiku is confident — strict matching (exact problem match required)
- On Telegram: Response Dispatcher sends follow-up "Did this video help?" with Yes ✅ / No ❌ buttons (callbacks: `video_yes`, `video_no`)
- **Yes** → updates ticket status to `resolved`
- **No** → sends "someone will follow up" message

### Resolve Flow (tenant-initiated)
- If classifier sets `resolve_ticket: true` (tenant says issue is fixed):
  1. `Should Resolve?` IF node checks the flag
  2. `Resolve Ticket` — UPDATE maintenance_requests SET status='resolved' (latest open ticket by chat_id)
  3. `Ask Resolution Confirmation` — sends "Is your problem resolved?" Yes ✅ / No ❌ (callbacks: `resolve_yes`, `resolve_no`)
- `resolve_yes` callback in Intake: sends ack confirmation to tenant
- Message history query filters to open tickets only (excludes messages from closed/resolved tickets)

### Dispatch Flow (Telegram callbacks)
1. Urgent ticket → landlord notification with Auto Dispatch / Show Contractors buttons
2. Auto Dispatch → Lookup Vendor → AI Vendor Msg (Haiku) → Show Preview → Confirm buttons
3. Confirm → Email vendor + Dispatch Ack
4. Urgency escalation UPDATE also sets category + keywords

---

## Database Tables

| Table | Key Columns |
|-------|-------------|
| **tenants** | name, phone, email, telegram_id, property_id (FK), unit_number, language_pref |
| **maintenance_requests** | ticket_id, tenant_name, phone, property, unit, channel, category, urgency, status, summary |
| **messages** | chat_id, ticket_id, sender, message_text, channel, external_message_id |
| **vendors** | vendor_name, email, phone, category |
| **repair_videos** | title, video_url, category, keywords (array), description |
| **properties** | name, address, manager_name, manager_id, twilio_number |
| **pending_media** | ticket_id, chat_id, file_id, file_url, status |
| **call_logs** | tenant_id, request_id (FK), elevenlabs_call_id, tenant_phone, duration_sec, full_transcript |

### Dedup
- `external_message_id` with partial unique index
- `INSERT ... ON CONFLICT DO NOTHING`
- IDs: email=Gmail ID, telegram=`tg_{msg_id}_{chat_id}`, sms=`sms_{sid}_{phone}`, whatsapp=`wa_{message_id}`

---

## Credentials

| Service | Credential Name | ID |
|---------|----------------|-----|
| PostgreSQL | Quietly DB | `JlETYTnhAwFrsmL9` |
| Gmail (trigger) | dionfwang | `ws18m1zty0x1WwiD` |
| Gmail (send) | dionbuildsai gmail | `ib5ffoxInNyz8gYt` |
| Anthropic | Anthropic account | `jOOjmB3sv6fwkbDV` |
| Twilio | Twilio account | `ijmhKNa9AFRv7Rjr` |
| Telegram (tenant bot) | property_management | `5uwoGp7iX1GQkMcu` |
| WhatsApp API | WhatsApp account | `we3yhVhUwWRnkTGz` |

---

## Key Business Details
- **Company:** Julia Inc (Quebec, Canada)
- **Emergency Line:** 438-900-9998
- **Owner (Dion) Telegram Chat ID:** 6216258938
- **Julia Telegram Chat ID:** 6274604148
- **Twilio Number:** +14389009998
- **WhatsApp Phone Number ID:** 1002910989571888
- **Meta App ID:** 872554515351219

---

## Production Hardening
- All SQL text fields escaped with `.replace(/'/g, "''")`
- All Telegram send nodes use `parse_mode: HTML`
- Telegram response truncated to 4090 chars
- Vendor queries capped with LIMIT 10
- Get Open Tickets uses DISTINCT
- Merge Tenant + Message code node with try/catch for channel-agnostic data flow
- Message linking filtered by channel (Link Messages to Ticket + Link Ongoing Messages include `AND channel = ...`)
- Video Follow-up returns `{ video_skipped: true }` instead of `[]` when no video (fixes execution order bug)
- Video matching via Haiku API has 10s timeout with graceful fallback (returns `has_video: false`)
- Message history query filters to open tickets only — no bleedover from closed conversations
- Media Upload Handler returns `{ drive_file_id, drive_url, drive_filename }` via `Return Result` node

---

## Dashboard (`quietly-dash`)
- **Tech:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui, pg (node-postgres)
- **Font:** DM Sans
- **Colors:** Primary `#573CFA`, Neutral `#1C1A27`, Danger `#E8083E`, Success `#02864A`, Secondary `#F88D1A`
- **Deployed:** Docker container `quietly-dash` on `n8n_default` network, Traefik reverse proxy
- **Pages:** Dashboard (stat cards, animated time-saved banner, category pills, recent tickets with sort headers), Inbox (unread ticket notifications with animated dismiss), Tickets (cascading property→tenant filters, sort headers, clickable rows), Ticket Detail (chat-style message thread filtered by channel; phone channel shows call recording player instead of message thread), Tenants (CRUD), Vendors (CRUD, table layout), Properties (CRUD)
- **Phone channel — call recording player:** Ticket Detail detects `ticket.channel === "phone"` → queries `call_logs` by phone + timestamp proximity (±15min, closest match) → renders `<CallRecordingPlayer>` with duration and `<audio>` element. Audio streamed via `/api/call-audio/[convId]` proxy (server-side, hides ElevenLabs API key). `call_logs.elevenlabs_call_id` is the ElevenLabs conversation ID. Proxy buffers full MP3 and returns `Content-Length` + `Accept-Ranges: bytes` so the browser progress bar is linear and starts at position 0.
- **Sidebar title:** "Property Management" (no icon) — replaced the "Q Quietly" icon+text in `sidebar.tsx` for both desktop and mobile header.
- **Phone channel icon:** `channel-icon.tsx` has explicit `phone` entry (`text-purple-500`, label "Phone") — no longer falls through to Telegram icon.
- **Notifications:** `viewed_at` column on `maintenance_requests` tracks read state. Sidebar badge polls `/api/unread` every 15s. Resolved/closed tickets auto-excluded from inbox.
- **Auto-refresh:** Dashboard refreshes every 30s via client-side router.refresh()
- **AI Chat:** Bottom-left floating widget, Claude Haiku 4.5 answers natural language questions about the database (read-only SELECT queries)
- **Mobile:** Hamburger sidebar, scrollable tables, full-width dialogs
- **DB Auth:** `pg_hba.conf` has `trust` for Docker network `172.18.0.0/16` — no password needed for internal containers
- **Owner messaging (Phase 2):** When bot is paused, a text input appears at the bottom of the conversation card. Owner types a message, hits Enter or Send — it POSTs to n8n webhook `POST /webhook/owner-message`, which logs to `messages` table as `sender='owner'` and dispatches via the ticket's channel (Telegram/SMS/WhatsApp/Email). Input hidden for phone channel (call recording view).
- **Bot toggle (Phase 1):** `bot_paused BOOLEAN DEFAULT FALSE` on `maintenance_requests`. Ticket Detail page has `BotToggleButton` (amber = paused, muted = active). Toggle calls `toggleBotPaused` server action → flips DB flag. Intake Router checks flag before calling AI Agent (see n8n section below).
  - **Auto-resume:** Bot automatically resumes when owner leaves the ticket page (component unmount → `fetch keepalive`) or closes the tab (`beforeunload` → `navigator.sendBeacon`). Both call `POST /api/resume-bot`. This ensures only one ticket can be paused at a time per owner session.
  - **Per-tenant isolation:** n8n query filters by the incoming message's phone/telegram_id/email, so pausing one tenant's bot never affects other tenants.

### Bot Pause — n8n Intake Router
- **Check Bot Paused** node (id: `check-bot-paused-001`, Postgres): queries `SELECT bot_paused FROM maintenance_requests WHERE ticket_id = $ticket_id` using phone/telegram_id/email match
- **Bot Active?** node (id: `bot-active-check-001`, IF): `$json.bot_paused === false` → TRUE branch goes to `Call AI Agent`, FALSE branch stops (messages still logged, AI skipped)
- Inserted between `Build AI Payload` → `Check Bot Paused` → `Bot Active?` → `Call AI Agent`
- Media upload path is unaffected (separate branch before AI payload)

---

## Known Risks
- Telegram bot token hardcoded in HTTP Request nodes
- Ticket Management + SMS webhooks have no auth
- If Claude API goes down, tenant gets no reply
- WhatsApp status updates create ~3 empty 13ms executions per message
- Dashboard has no login auth (relies on URL obscurity; Traefik basicauth planned)

## Before Client Deployment
- [ ] Switch WhatsApp to Live mode in Meta
- [ ] Create WhatsApp permanent token (System User)
- [ ] Add production WhatsApp number
- [ ] Set Gmail credential to client's inbox
- [ ] Add real tenants to database
- [ ] Verify SMS delivery (check Twilio logs)

---

## Server Access
- **Host:** srv1285597.hstgr.cloud (IP: 76.13.96.3)
- **SSH:** `ssh root@srv1285597.hstgr.cloud` — claude-code ed25519 key in `/root/.ssh/authorized_keys`
- **PostgreSQL:** `docker exec -i $(docker ps --filter 'name=postgres' -q) psql -U quietly -d quietly_db`
- **CRITICAL — n8n workflow Postgres patches require restart:** Direct `UPDATE workflow_entity SET nodes=...` in Postgres does NOT invalidate n8n's in-memory workflow cache. The updated nodes will exist in DB but n8n keeps running the old version. Always restart n8n after patching: `cd /docker/n8n && docker compose restart n8n`. New workflows also need a `shared_workflow` row (`projectId: OG7kkLwgqLqxkXvS`, `role: workflow:owner`) or n8n will fail to activate them.
- **Dashboard deployment (SCP method):** Server `/docker/quietly-dash` is NOT a git repo. Deploy via:
  ```bash
  scp -r ~/Desktop/Quietly/quietly-dash/* root@srv1285597.hstgr.cloud:/docker/quietly-dash/
  ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose build dashboard && docker compose up -d dashboard"
  ```
- **Docker Compose:** `/docker/n8n/docker-compose.yml` — dashboard service is `quietly-dash`, image built from `/docker/quietly-dash`
- **ELEVENLABS_API_KEY** is set in docker-compose.yml env for the dashboard container

## Technical Notes
- Webhook nodes created via API need `webhookId` field (UUID) for production registration
- Telegram webhook must be re-registered via n8n UI toggle after deactivate/reactivate
- Format Context passes `language_pref: detect from message` (not DB field)
- Video search (Search Repair Videos + AI Video Match) runs in Intake, BEFORE calling AI Agent — result passed in AI payload
- Classify Action runs in AI Agent after response generation — ticket_id available via Generate Ticket
- Video resolve callback uses chat_id to look up latest ticket (not ticket_id)
- Resolve Ticket uses chat_id to find latest open ticket (UPDATE WHERE ticket_id = subquery)
- `resolve_yes`/`resolve_no`/`mc` (media_cat) are new callback routes in Intake Channel Router switch
- Message linking includes `AND channel = ...` to prevent cross-channel ticket pollution
- Dashboard message query filters by channel; falls back to chat_id only if ticket_id returns 0 messages
- AI Conversation Agent notification routing: `Is Urgent?` TRUE → `Notify Landlord` (Dion 6216258938) → `Is Dion? (notify)` → TRUE: done / FALSE: `Notify Landlord - Julia` (6274604148) → done. `Is Urgent?` FALSE → `Notify Non-Urgent` (HTTP node, Dion only, no Julia copy)
- **Dion's test account in DB:** Aisha Brown — phone `15148319058`, telegram_id `6216258938`, email `dionbuildsai@gmail.com`
- Manual trigger → Clear Messages → Clear Tickets (for dev/testing)
- Intake Switch node has `fallbackOutput: "extra"` for unrecognized callback actions

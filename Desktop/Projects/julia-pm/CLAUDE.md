# Julia Inc — Property Management Automation

## Project Overview
**STATUS: LIVE IN PRODUCTION (2026-03-27)**

Property management automation for **Julia Inc** (Quebec-based). 8 n8n workflows + 2 utility workflows handle tenant messages across Telegram, Email, SMS, and WhatsApp — auto-classifying issues, creating tickets, suggesting repair videos, dispatching vendors, and replying via AI. Voice agent (ElevenLabs) handles phone calls.

**n8n Instance:** `https://n8n.srv1285597.hstgr.cloud`
**Dashboard:** `https://julia.srv1285597.hstgr.cloud` — Next.js dashboard (Docker, Traefik basicauth)
**NocoDB:** `https://nocodb.srv1285597.hstgr.cloud`
**GitHub (workflows):** `dionbuildsai/quietly-board` (branch: main)
**GitHub (dashboard):** `dionbuildsai/quietly-dash` (branch: main)
**Project Dir (workflows):** `~/Desktop/Projects/julia-pm/`
**Project Dir (dashboard):** `~/Desktop/Quietly/quietly-dash/`
**Database:** PostgreSQL ("Quietly DB" — credential ID: `JlETYTnhAwFrsmL9`)

---

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │         [Intake] Channel Router (88 nodes)    │
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
| **[Intake] Channel Router** | `6uqrzVIcH8GFznDf` | 88 | All 4 channel triggers, normalize, tenant lookup, log message, AI handoff, AI video match (Haiku), callback dispatch, resolve_yes/no callbacks, immediate media download |
| **[AI] Conversation Agent** | `5WW7m5IiqvJoHWZ1` | 27 | Claude Sonnet 4 agent + Haiku classifier, ticket creation, resolve flow (Should Resolve? → Resolve Ticket → Ask Resolution Confirmation) |
| **[Response] Channel Dispatcher** | `ErGEhkdaWj0zTmQI` | 9 | Route reply to channel + video follow-up buttons on Telegram |
| **[Media] Upload Handler** | `Iyv7PotiAq2beRae` | 18 | Download media from Telegram/WhatsApp, save locally, update pending_media, return file URL |
| **[Ticket] Management** | `CnUFSXbeIk9GNI5t` | 19 | Webhook API endpoints + SQL runner |
| **[Owner] Message Sender** | `owner-msg-sender-001` | 8 | Webhook `POST /owner-message` → log to messages + dispatch via channel |
| **[Intake] WhatsApp Meta** | `x6LjYZQ2l05BS8uP` | 26 | Meta webhook adapter: verify GET, parse messages, route callbacks (video_yes/no), media handling, forward regular messages to Channel Router via wa-intake |
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
`Match Video AI` in Intake Channel Router uses `$env.ANTHROPIC_API_KEY` for the Haiku API call. Ensure `ANTHROPIC_API_KEY` is set in n8n container environment.

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

### WhatsApp Meta Adapter (`[Intake] WhatsApp Meta`)
Separate workflow that handles the Meta webhook directly:
```
WA Verify GET → Return Challenge (Meta callback verification)
WA Message POST → Parse Meta Message → Is WA Callback?
  ├─ TRUE → Handle WA Callback → Resolve Ticket (status='closed') → Build Confirmation → Send WA Confirmation → Log Closure
  └─ FALSE → Forward to WA Intake (HTTP POST to /webhook/wa-intake)
```
- `Handle WA Callback` determines msg text + resolveTicket flag from button presses (video_yes/video_no)
- `Resolve Ticket` sets `status='closed'` and returns `ticket_id`
- `Build Confirmation` assembles "Ticket TK-XXXXX has been closed. Great! Glad the video helped..."
- `Send WA Confirmation` uses HTTP Request with `$env.WHATSAPP_TOKEN` (Bearer auth)
- `Log Closure` inserts `sender='system'` message into messages table so closure shows in dashboard conversation

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
| **messages** | chat_id, ticket_id, sender (tenant/bot/owner/system), message_text, channel, external_message_id |
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

### Native n8n Credentials (still in use)
| Service | Credential Name | ID | Notes |
|---------|----------------|-----|-------|
| PostgreSQL | Quietly DB | `JlETYTnhAwFrsmL9` | All Postgres nodes |
| Gmail (trigger) | dionfwang | `ws18m1zty0x1WwiD` | Gmail poll trigger |
| Gmail (send) | dionbuildsai gmail | `ib5ffoxInNyz8gYt` | Sending emails |
| Telegram (trigger only) | property_management | `5uwoGp7iX1GQkMcu` | Webhook registration only |

### Environment Variables (refactored — `$env` in docker-compose)
| Variable | Service | Used By |
|----------|---------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram | 22 nodes (all except Trigger) |
| `WHATSAPP_TOKEN` | WhatsApp | 7 nodes (all WA nodes) |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp | 6 nodes |
| `TWILIO_ACCOUNT_SID` | Twilio | 2 Send SMS nodes |
| `TWILIO_AUTH_TOKEN` | Twilio | 2 Send SMS nodes |
| `TWILIO_FROM_NUMBER` | Twilio | 2 Send SMS nodes |
| `ANTHROPIC_API_KEY` | Anthropic | Match Video AI (Haiku) |
| `WEBHOOK_URL` | n8n | Forward to WA Intake |
| `ELEVENLABS_API_KEY` | ElevenLabs | Dashboard call audio proxy |

---

## Key Business Details
- **Company:** Julia Inc (Quebec, Canada)
- **Emergency Line:** 438-900-9998
- **Owner (Dion) Telegram Chat ID:** 6216258938
- **Julia Telegram Chat ID:** 6274604148
- **Twilio Number:** +14389009998
- **WhatsApp Phone Number ID:** 971537566052793 (production — Julia's PM number +14389009998, same as Twilio)
- **WhatsApp Test Phone Number ID:** 1002910989571888 (Meta sandbox — NOT used in workflows)
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
- Media Upload Handler returns `{ file_url, filename }` via `Return Result` node

---

## Dashboard (`quietly-dash`)
- **Tech:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui, pg (node-postgres)
- **Font:** DM Sans
- **Colors:** Primary `#573CFA`, Neutral `#1C1A27`, Danger `#E8083E`, Success `#02864A`, Secondary `#F88D1A`
- **Deployed:** Docker container `julia-dash` on `n8n_default` network, Traefik reverse proxy with basicauth
- **Pages:** Dashboard (stat cards, time-saved banner, category pills, recent tickets, renewals alert), Inbox (unread notifications), Tickets (filters, sort, clickable rows), Ticket Detail (chat-style thread, call recording for phone), Tenants (CRUD), Vendors (CRUD), Properties (property cards with occupancy bars → property detail with unit management), Announcements (broadcast with per-channel breakdown), Help (tutorial videos), Settings (integrations + Gmail OAuth + signature upload), Changelog
- **Property Detail** (`/properties/[id]`): Unit-first view with stat cards (total units, occupied, vacant, leases, tickets). Each unit shows tenant + lease + rent. Click to expand for tenant edit, lease review, and rent increase notices. "Add Unit" button for creating new units. Leases uploaded via AI extraction (Claude Sonnet reads PDF) or manual entry.
- **Lease Management:** Upload lease PDF → Claude Sonnet extracts all fields (sections A-H of Quebec bail form: parties, dwelling, term, rent, services, conditions, signature) → review/edit → confirm. Stored in `leases` table with `extracted_data` JSONB.
- **Rent Increase Notices:** Generate official TAL form (TAL-806A-E English / TAL-806-E French) with auto-filled fields from lease data. Julia enters increase type (flat $, %, or new amount) → PDF generated with `pdf-lib` → preview → email to tenant as attachment via Gmail OAuth. Tracks 1-month response window with auto-acceptance on silence. Signature image embedded from Settings upload.
- **Announcements:** Broadcast to tenants by property with per-channel breakdown (who received, who skipped, who failed). Supports Telegram, WhatsApp, SMS, Email. Bilingual translation support.
- **Phone channel — call recording player:** Ticket Detail detects `ticket.channel === "phone"` → queries `call_logs` by phone + timestamp proximity (±15min, closest match) → renders `<CallRecordingPlayer>` with duration and `<audio>` element. Audio streamed via `/api/call-audio/[convId]` proxy (server-side, hides ElevenLabs API key). `call_logs.elevenlabs_call_id` is the ElevenLabs conversation ID. Proxy buffers full MP3 and returns `Content-Length` + `Accept-Ranges: bytes` so the browser progress bar is linear and starts at position 0.
- **Sidebar title:** "Property Management" (no icon) — replaced the "Q Quietly" icon+text in `sidebar.tsx` for both desktop and mobile header.
- **Phone channel icon:** `channel-icon.tsx` has explicit `phone` entry (`text-purple-500`, label "Phone") — no longer falls through to Telegram icon.
- **Notifications:** `viewed_at` column on `maintenance_requests` tracks read state. Sidebar badge polls `/api/unread` every 15s. Resolved/closed tickets auto-excluded from inbox.
- **Auto-refresh:** Dashboard refreshes every 30s via client-side router.refresh()
- **AI Chat:** Bottom-right floating widget, Claude Haiku 4.5 answers natural language questions about the database (read-only SELECT queries)
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
- Ticket Management + SMS webhooks have no auth
- If Claude API goes down, tenant gets no reply
- WhatsApp status updates create ~3 empty 13ms executions per message
- Postgres nodes still use native n8n credential (not refactored to `$env`)
- Gmail incoming email polling not deployed (removed from live — needs proper dev testing before redeployment)

## Deployment Policy
**CRITICAL: This system is LIVE with a real client. Zero errors tolerated.**
- Every change MUST be verified before deploying — no exceptions
- Never deploy untested code to production
- Always backup n8n workflows before importing changes
- Keep changes minimal and targeted — do not refactor surrounding code
- After deploying, verify the dashboard loads and key flows still work
- If unsure whether a change is safe, ASK before deploying
- n8n workflow changes: backup → import → publish → restart → verify

**App went live: 2026-03-27**

### Post-Launch Monitoring
- Watch for Claude API failures (tenant gets no reply)
- Monitor WhatsApp status update noise (~3 empty executions per message)
- n8n FK constraint log spam (`workflow_published_version` blocking history cleanup) — non-fatal but noisy

---

## Server Access
- **Host:** srv1285597.hstgr.cloud (IP: 76.13.96.3)
- **SSH:** `ssh root@srv1285597.hstgr.cloud` — claude-code ed25519 key in `/root/.ssh/authorized_keys`
- **PostgreSQL (app data):** `docker exec -i $(docker ps --filter 'name=postgres' -q) psql -U quietly -d quietly_db`
- **n8n workflow storage:** Live n8n (srv1285597) uses SQLite internally for workflow/credential storage. Dev n8n (srv1466948) uses Postgres (`DB_TYPE=postgresdb`). Postgres is used for app data (tenants, tickets, messages, etc.) via the "Quietly DB" credential on both servers. Do NOT use `psql` queries against `workflow_entity` expecting to change n8n behavior — use `n8n import:workflow` CLI or the n8n UI instead.
- **n8n workflow updates:** Use `n8n import:workflow --input=file.json` inside the n8n container, then restart: `docker compose restart n8n`. The `user-management:reset` command wipes the owner account — you'll need to re-create it via the setup screen.
- **Dashboard deployment (SCP method):** Server `/docker/quietly-dash` is NOT a git repo. Deploy via:
  ```bash
  scp -r ~/Desktop/Quietly/quietly-dash/* root@srv1285597.hstgr.cloud:/docker/quietly-dash/
  ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose build dashboard && docker compose up -d dashboard"
  ```
- **Docker Compose:** `/docker/n8n/docker-compose.yml` — dashboard service is `julia-dash`, image built from `/docker/quietly-dash`
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
- AI Conversation Agent notification routing: `Is Urgent?` → (both branches) → `Get Owner Chat ID` (settings table) → `Send Owner Notification` (Code node). Has "Is Dion?" check: if tenant phone contains `5148319058`, sends to Dion (`6216258938`) instead of Julia. Orphaned nodes `Notify Landlord` and `Notify Non-Urgent` are dead code (no connections).
- Voice Agent notification routing: same pattern — `Get Owner Chat ID` → `Send Voice Notification` with "Is Dion?" check.
- **Dispatch flow** (Intake Channel Router): `Show Preview`, `Build Preview Buttons`, `Send List`, `Dispatch Ack` all use `$('Parse Callback').item.json.chat_id` — dynamically routes to whoever pressed the Telegram button (Julia or Dion).
- **Dion's test account in live DB:** "Dion Dev" — phone `15148319058`, telegram_id `6216258938`, email `dionbuildsai@gmail.com`. "Is Dion?" filter suppresses Julia notifications for Dion's test messages across all channels.
- Manual trigger → Clear Messages → Clear Tickets (for dev/testing)
- Intake Switch node has `fallbackOutput: "extra"` for unrecognized callback actions
- **ANTHROPIC_API_KEY** must be set in BOTH n8n AND dashboard containers in docker-compose.yml (Match Video AI code node uses `$env.ANTHROPIC_API_KEY` for direct Haiku API calls)
- **WHATSAPP_TOKEN** must be set in BOTH n8n AND dashboard containers (WA media download + ticket prompt code nodes use `$env.WHATSAPP_TOKEN`)
- **Sender naming:** All AI messages use `sender='bot'` in the messages table. Dashboard displays it as "Bot". Old messages that said "Julia AI" were migrated to "bot" on 2026-03-27. Dashboard code matches both `"bot"` and `"Julia AI"` for backwards compatibility.
- **n8n Code nodes:** Use `$env.VAR_NAME` to access env vars (NOT `process.env`). Use `this.helpers.getBinaryDataBuffer(0, binaryKey)` for binary data (NOT `Buffer.from(binary.data, 'base64')`). `this.getCredentials()` is NOT available in Code node v2.
- **n8n import:workflow overwrites live workflows** — the git JSON may differ from the live n8n version (e.g., live has hardcoded API keys, dedicated WhatsApp video nodes). Always export from n8n history before importing from git. Use `workflow_history` table to find the correct `versionId`.
- **n8n Postgres node only runs first SQL statement** — multi-statement queries silently ignore everything after the first `;`. Split into separate Postgres nodes if needed.
- **n8n published versions:** After import+publish, delete stale entries in `workflow_published_version` if n8n keeps running old code. When no published version exists, n8n falls back to `workflow_entity`.

## Media Upload (Telegram + WhatsApp + SMS)
- Photos saved to `/local-files/media/` on host (mounted as `/files/media/` in n8n, `/app/media/` in dashboard)
- Dashboard serves media via `/api/media/[filename]` API route
- **Immediate download pattern:** All channels download photos immediately on receipt (not after ticket selection). Photos appear in dashboard instantly.
- **Telegram + SMS flow (Intake):** `Has Media?` → `Save Pending Media` → `Download Media Immediate` → `Update Pending Status` → `Link Media Immediate` (auto-assigns ticket_id) → `Get Tickets for Media` → `Send Category Prompt`
- **WhatsApp flow (WhatsApp Meta):** `Is Media?` → `Save WA Pending Media` → `Log WA Media Message` → `Download WA Media` → `Update WA Pending` → `Link WA Media Immediate` (auto-assigns ticket_id) → `Has Caption?` → `Get WA Tickets` → `Send WA Ticket Prompt`
- Ticket delete cleans up: orphaned messages, pending_media rows, AND actual files from disk (`/app/media/`)
- `Link Media Immediate` / `Link WA Media Immediate` set `ticket_id` via subquery to latest open ticket for the tenant
- **Cross-channel:** Photos sent on Telegram can be linked to a WhatsApp ticket and vice versa

## Documentation
- **CLAUDE.md** (this file) — system architecture, workflows, database, credentials, technical reference
- **RUNBOOK.md** — operational procedures: restarts, deployments, common fixes, emergency procedures, database operations
- **CLIENT_ONBOARDING_PLAYBOOK.md** — technical playbook for onboarding new PM clients (4-6 hours)
- **MIGRATION_SOP.md** — dev→live migration procedures, env var audit
- **Materials/system-guide.html** — client-facing complete system guide (styled HTML, A-to-Z reference)
- **Materials/onboarding.html** — onboarding guide (subset of system guide)
- **Materials/tenant-welcome-email.html** — email template for tenants (English + French)
- **Materials/sop-tenant-integration.html** — SOP for adding tenants
- **archive/audit-docs/DEPLOYMENT_AUDIT_2026-04-07.md** — 3-way audit findings, deployment plan

---

## Cross-Channel Behavior
- `Link Ongoing Messages` now has channel filter (fixed 2026-03-29) — messages only link to tickets from the same channel
- AI Classifier creates separate tickets for DIFFERENT issues in the same category (e.g., sink leak ≠ clogged drain, even though both plumbing)
- Conversation query shows ALL messages with matching `ticket_id` regardless of channel
- Dashboard: tickets list and detail page show multi-channel icons when messages come from multiple channels
- Dashboard: conversation bubbles show colored channel icon next to sender name

---

## Changelog

**Full changelog archived:** `archive/audit-docs/CHANGELOG_ARCHIVE.md`

### Key Milestones
- **2026-03-27:** System went live in production
- **2026-03-29:** Julia onboarded as first live client (60 tenants, 3 properties)
- **2026-04-02:** Immediate media download pattern implemented (WhatsApp), dev server migration
- **2026-04-04:** Immediate media download (Telegram + SMS), "Is Dion?" notification filter, dynamic dispatch routing
- **2026-04-05:** Telegram + WhatsApp credential refactor complete (29 nodes → `$env`)
- **2026-04-07:** Dev WhatsApp isolation, 3-way audit found + fixed 5 regressions, environment dashboard
- **2026-04-10:** Twilio refactor deployed to live, phone SMS follow-up feature, dashboard v1.5
- **2026-04-11:** CLAUDE.md audit + cleanup, Gmail OAuth refactor (4 send nodes → dashboard token), announcements per-channel breakdown, advanced settings page, broadcast channel brand icons
- **2026-04-12:** Lease management (upload PDF + AI extraction + manual entry), property detail page (unit-first view with occupancy, stat cards, collapsible sections), property form (civic number, street, postal code), rent increase notice system (TAL form PDF generation + email delivery + response tracking + auto-accept), signature upload for documents, UI polish (card shadows, table styling, sidebar cleanup)
- **2026-04-13/14:** Dashboard v3 overhaul on dev only. Sprint A/B/C1 delivered on feature branches (`sprint-a-ux`, `sprint-b-depth`, `sprint-c1-glance`). Main and live untouched. Master roadmap at `TODO.md` (55 items in 4 tiers). See "Dashboard v3" section below.

## Dashboard v3 Rework (dev-only, 2026-04-13 → 2026-04-14)

**Live is untouched since 2026-04-12.** All work is on five feature branches never merged to main. Dev VPS `pm.srv1466948.hstgr.cloud` runs the `sprint-c3-comms` tip.

### Branch ledger

| Branch | Tip | Status | What it adds (on top of the one above) |
|--------|-----|--------|------------------------------------------|
| `main` | `75a1e23` | frozen | Dashboard v2.0 (2026-04-12) |
| `sprint-a-ux` | `070a40a` | merged into b | UX foundation |
| `sprint-b-depth` | `baef181` | merged into c1 | Schema depth + tz helper |
| `sprint-c1-glance` | `f724b0a` | merged into c2 | At-a-glance polish (dashboard reverted, non-dashboard kept) |
| `sprint-c2-metrics` | `20d79b3` | merged into c3 | Reporting, vendor perf, snooze |
| `sprint-c3-comms` | `4edd857` | **current dev tip** | Templates, preview, FAQ, collapsed videos |

Each branch is committed + pushed to `origin`. No branch has ever been merged to main — they're stacked.

### Feature-by-feature inventory (all on dev)

#### Sprint A (`sprint-a-ux`) — UX foundation
- Global keyboard layer (`⌘K` / `/` / `?` / Esc) with cheat-sheet overlay
- cmd-K command palette + `/api/search` (ILIKE across tickets/tenants/properties/vendors/messages)
- Smart Summary on ticket detail — Haiku 3-line catch-up above the conversation
- Saved views + quick-filter chips on Tickets (Urgent / Waiting / Last 24h / Resolved this week + localStorage custom views)
- Action-framed stat cards ("Needs your reply", "Waiting on vendor") with zero-state green check and help badges
- Reusable `<HelpBadge>` component for inline `?` tooltips
- Inbox Today / This week / Later grouping + triage flow (click row → expand Smart Summary → Open thread / Dismiss; no inline reply to prevent replying without context)

#### Sprint B (`sprint-b-depth`) — schema + tz
- Smart Summary caching on `maintenance_requests` (JSONB + msg-count invalidation → ~90% fewer Haiku calls)
- Audit log (`audit_log` table) wrapping all delete actions; 30-day undo at `/settings/audit`
- Tenant detail drawer (Chat / Tickets / Lease tabs) on `/tenants`
- Tenant filter chips (language EN/FR, property, search)
- CSV export endpoints for tickets, tenants, leases (`/api/export/*`)
- Bulk select + sticky floating bar on Tickets (Mark resolved / Waiting vendor / Reopen)
- Test-integration button for Telegram on Settings
- 7-day integration health strip (messages per channel per day)
- Preferences form: quiet hours + timezone + UI language, urgent-overrides-quiet toggle
- `src/lib/tz.ts` — centralized timezone helper; all server-side date strings route through `America/Toronto` (handles EDT↔EST automatically; never hardcode `"EST"`). Migrated the Telegram test message, CSV filenames, rent-increase response deadlines, and integration-health day buckets

#### Sprint C1 (`sprint-c1-glance`) — at-a-glance (dashboard reverted)
- **Dashboard page:** all experimental dashboard redesigns were rolled back. The dashboard page is currently the Sprint B version (Time Saved banner + 5 stat cards + category pills + Recent tickets).
- **Non-dashboard items kept:**
  - `TicketTimeline` 5-stage progress strip (received → AI replied → owner → vendor → resolved) — compact variant on the Tickets list (xl+ column), labeled variant on the ticket detail header
  - Urgency visual weight in Inbox (urgent = 3px red left border + larger tenant name; info_request = 70% opacity)
  - All Clear celebration with weekly resolved count
  - Property audit timeline (collapsible section on property detail, reads `audit_log` via `/api/audit/entity`)
  - Property financial snapshot card (monthly income + occupancy % + vacant-value estimate)
- **Unused dead code still present:** `MorningHuddle`, `CategoryDonut`, `TicketVolumeChart`, `ActionInbox`, `Sparkline`. They can be garbage-collected or reused later.

#### Sprint C2 (`sprint-c2-metrics`) — reporting + vendor perf + snooze
- `/reporting` page: 30-day KPIs (total tickets, resolved count, avg + median resolution, tickets per tenant, urgent rate %, occupancy %), top-categories bar meter, slowest-open tickets list. Sidebar link with BarChart3 icon.
- Vendor performance columns on `/vendors`: avg resolution, job count, resolved count, last job
- "Fast" badge on top-20% of vendors (min 2 jobs) by avg resolution time
- Preferred vendor starring — click the star; starred vendors sort to top of their category
- Availability dot on vendor rows: green = job in last 30d, grey = quiet
- Inbox snooze menu on each triaged row: 1 hour / Tomorrow 9 AM / Next Monday 9 AM. Snoozed tickets hidden from Inbox via `getUnreadTickets` filter until `snoozed_until <= NOW()`.

#### Sprint C3 (`sprint-c3-comms`) — communication polish
- Announcement template library: `TemplatePicker` dropdown in the broadcast compose box. 8 bilingual templates (snow removal, water shutoff, heating start, renewal window, fire alarm test, garbage schedule, elevator maintenance, welcome new tenant). One click fills EN + FR.
- Channel preview before send: "Send Announcement" button became "Preview & send". Shows mockups of the final message per channel (Telegram bubble, WhatsApp bubble, SMS with char count + part warning, Email with subject).
- Searchable FAQ on `/help`: markdown source at `src/content/faq.md` → parsed by `/api/faq` → `FaqSearch` component at top of Help page with debounced query and expandable answers.
- Collapsed video playlist: videos section now defaults closed. Compact rows with YouTube thumbnail + title. Click plays inline autoplay iframe; close returns to list.

### Schema applied to `pm_dev_db` only (all additive)

```
migrations/sprint-b.sql
  · maintenance_requests.smart_summary JSONB + _msg_count + _at
  · audit_log (id, created_at, actor, action, entity_type, entity_id,
              entity_label, before_data, after_data, undoable_until,
              undone_at, notes)
  · settings rows for quiet_hours_*, timezone, ui_language, urgent_overrides_quiet

migrations/sprint-c1.sql
  · morning_huddle_cache (date PK, text, generated_at, owner_hint)

migrations/sprint-c2.sql
  · vendors.is_preferred BOOLEAN DEFAULT FALSE
  · vendors.last_job_at TIMESTAMPTZ
  · maintenance_requests.snoozed_until TIMESTAMPTZ + partial index

migrations/sprint-c3.sql
  · announcement_templates (id, slug, title_en, body_en, title_fr,
                            body_fr, category, icon, is_builtin)
  · broadcasts.status + scheduled_for + template_id + body_fr + created_by
  · 8 seed templates in announcement_templates
```

### Known unfinished (deferred or not started)

| Area | Status | Notes |
|------|--------|-------|
| Dashboard redesign | Rolled back to Sprint B | Every v3 attempt was rejected. Tree of deferred components (MorningHuddle, charts) remains in codebase for reuse. |
| #56 "Who did the job?" on resolve | Not started | Added to TODO.md. Would feed vendor stats for jobs done outside dispatch. |
| #22 Scheduled broadcasts | Schema ready, runner missing | Needs n8n workflow or Next.js cron to fire due `scheduled_for` rows. |
| #24 AI translation polish diff view | Not started | Existing `/api/translate` covers the basic case. |
| #47 "Ask Julia AI" help agent (docs-scoped) | Not started | Chat widget already answers data questions. Adding a "Help" tab to it is small. |
| Sprint D (careful ones) | Not started | RL-31, finish renewal wizard, late-rent detection, tenant portal, vendor magic link, Postgres `$env` refactor, webhook auth |
| Tier 4 | Park | Drag-drop tenants, full vendor portal, OCR media, A/B broadcasts, loading skeletons, error boundaries |

### Dev deploy flow — ALWAYS exclude docker-compose.yml
```bash
cd ~/Desktop/Projects/quietly-dash
rsync -az --exclude node_modules --exclude .next --exclude .git \
  --exclude files --exclude dash --exclude docker-compose.yml \
  ./ root@srv1466948.hstgr.cloud:/docker/projects/pm/
ssh root@srv1466948.hstgr.cloud "cd /docker/projects/pm && docker compose build pm-dash && docker compose up -d pm-dash"
```
Secrets (DB password, Telegram/WhatsApp/Twilio/Anthropic/ElevenLabs keys, Gmail OAuth creds) live ONLY in the server's compose file. An rsync with `--delete` or without the exclude will wipe it.

### Seed data on `pm_dev_db`

- 5 demo tickets (TK-DEMO001-005) — mixed urgency, varied dates, one info_request
- 19 seed "completed" tickets (TK-SEED001-019) dispatched to demo vendors with varying resolution times for Sprint C2 stats
- 13 demo vendors across plumbing / electrical / hvac / appliance / pest / locksmith / general — 3 pre-starred
- 8 announcement templates (bilingual, seasonal)
- Cleanup (when needed): `DELETE FROM maintenance_requests WHERE ticket_id LIKE 'TK-DEMO%' OR ticket_id LIKE 'TK-SEED%';` and vendor cleanup per `seed comments in script history`.

## Dev Server Setup (srv1466948.hstgr.cloud)
- **PM Dashboard:** pm.srv1466948.hstgr.cloud (password: quietly2024)
- **n8n:** n8n.srv1466948.hstgr.cloud
- **n8n version:** 2.10.4 (pinned to match live)
- **n8n database:** Postgres (`DB_TYPE=postgresdb`). Database `n8n` on `quietly-postgres` container.
- **n8n Postgres (app data):** `pm_dev_db` on same `quietly-postgres` container (test data — 1 tenant, 1 property, 1 vendor)
- **Docker Compose:** `/docker/core/docker-compose.yml`
- **n8n workflow publishing:** After `n8n import:workflow`, must click **Publish** in n8n UI. No CLI command to publish.
- **Settings table:** `pm_dev_db.settings` — 14 keys across 8 categories. Dashboard settings page at `/settings`.
- **Config approach:** All config values use `$env.KEY_NAME` (synchronous). No Get Config Postgres nodes. Settings table is for dashboard only.
- **Telegram:** Dev bot token `8230685505:AAF360s5aQrSR9nUw5EQscMjyH7PND0oYuU` (separate from live). All nodes use `$env.TELEGRAM_BOT_TOKEN`. Only Telegram Trigger uses native credential.
- **WhatsApp:** All nodes use `$env.WHATSAPP_TOKEN` + `$env.WHATSAPP_PHONE_NUMBER_ID` (dev test number `1002910989571888`). Separate Meta App `Quietly PM Dev` (App ID `933608786120731`).
- **Dev WhatsApp isolation:** Live n8n drops test number traffic via filter in `Parse Meta Message`. Dev processes it.
- **n8n credential encryption mismatch:** Native nodes using saved credentials (Gmail, Postgres) fail with "bad decrypt" on dev. Code nodes using `$env` work fine. Credential IDs are the same on both servers, so dev→live import works (live has its own encrypted copies).
- **Media mount:** `/docker/projects/pm/files/media:/app/media` (same dir n8n writes to). Permissions `chmod 777`.
- **Published versions required:** n8n 2.10.4 requires entries in `workflow_published_version` for sub-workflows called via Execute Workflow.

## Gmail OAuth (Dashboard-managed)

All email goes through the dashboard OAuth token. Julia connects her Gmail once on the Settings page.

- **Dashboard OAuth flow:** `/api/auth/google` → Google consent → stores refresh_token in `settings` table
- **Token endpoint:** `/api/auth/google/token` — n8n calls `http://julia-dash:3000/api/auth/google/token` to get Bearer tokens
- **n8n env var:** `DASHBOARD_INTERNAL_URL=http://julia-dash:3000` (live) / `http://pm-dash:3000` (dev)
- **4 n8n send nodes converted:** Response Dispatcher, Owner Message Sender, Email Vendor, Broadcast Email Sender — all use Code nodes with `$env.DASHBOARD_INTERNAL_URL`
- **Gmail incoming polling:** Removed from live (was causing errors). Incoming email channel disabled until properly tested on dev.
- **Scopes:** `gmail.readonly`, `gmail.send`, `userinfo.email`
- **Connected on live:** `juliagoldimmobilier@gmail.com`
- **Disconnect/reconnect:** Available on Settings page

## Database Tables (Additional)

| Table | Key Columns |
|-------|-------------|
| **leases** | tenant_id, property_id, file_path, original_filename, extracted_data (JSONB), status, confidence_flags, confirmed_at |
| **rent_increases** | lease_id, tenant_id, current_rent, proposed_rent, increase_type, increase_value, notice_window_start/end, notice_sent_at, response_status, response_deadline, pdf_path |
| **broadcasts** | property_id, message_text, channels, sent_count, failed_count, skipped_count, results (JSONB per-channel breakdown) |

## Remaining Work

### Planned Features
- **Gmail incoming email polling** — Built but removed from live. Needs `\$env` fix and dev testing before redeployment.
- **Owner photo sending from dashboard** — Allow owner to send images back to tenants. ~2-3 hours.
- **Media management page** — Gallery view of all uploads, filterable by tenant/ticket.
- **RL-31 tax slips** — Annual tax document generation and delivery to tenants. Depends on lease data.

### Tech Debt
- **Postgres credential refactor** — all Postgres nodes use saved credential. Biggest scope, lowest priority.
- **n8n FK constraint log spam** — `workflow_published_version` rows blocking history cleanup. Non-fatal but noisy.

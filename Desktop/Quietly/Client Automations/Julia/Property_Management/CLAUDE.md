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
| **Voice Agent** | `JO26ruzPNp1MQThL` | 17 | ElevenLabs phone agent: convai-init webhook, PM_get_status, PM_log_maintenance, PM_post_call_log |

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

### log-maintenance Telegram Notification
`Insert rows in a table` → `Send a text message` (direct, no IF gate)

- **Always fires** for every phone ticket (urgent and non-urgent)
- Message uses urgency-conditional emoji: `🚨 URGENT PHONE TICKET` vs `📞 New Phone Ticket`
- Includes: tenant name, phone, unit, issue summary, urgency, timestamp
- **Note:** The old IF node (`urgency == "urgent"`) was removed — LLM always assigns `not_urgent` by default, so the gate was silently dropping all notifications

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
| **call_logs** | tenant_id, request_id (FK), duration_sec, full_transcript |

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
- **Owner Telegram Chat ID:** 6216258938
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
- **Pages:** Dashboard (stat cards, animated time-saved banner, category pills, recent tickets with sort headers), Inbox (unread ticket notifications with animated dismiss), Tickets (cascading property→tenant filters, sort headers, clickable rows), Ticket Detail (chat-style message thread filtered by channel), Tenants (CRUD), Vendors (CRUD, table layout), Properties (CRUD)
- **Notifications:** `viewed_at` column on `maintenance_requests` tracks read state. Sidebar badge polls `/api/unread` every 15s. Resolved/closed tickets auto-excluded from inbox.
- **Auto-refresh:** Dashboard refreshes every 30s via client-side router.refresh()
- **AI Chat:** Bottom-left floating widget, Claude Haiku 4.5 answers natural language questions about the database (read-only SELECT queries)
- **Mobile:** Hamburger sidebar, scrollable tables, full-width dialogs
- **DB Auth:** `pg_hba.conf` has `trust` for Docker network `172.18.0.0/16` — no password needed for internal containers

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
- **PostgreSQL:** `docker exec -i $(docker ps --filter 'name=postgres' -q) psql -U quietly -d quietly_db`

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
- Manual trigger → Clear Messages → Clear Tickets (for dev/testing)
- Intake Switch node has `fallbackOutput: "extra"` for unrecognized callback actions

# Julia Inc - Property Management Automation

## Project Overview
Property management automation system for **Julia Inc** (Quebec-based). Uses n8n workflows to handle tenant messages across multiple channels (Email, SMS, Telegram, Voice) and manage maintenance requests, vendor dispatch, and ticket tracking.

**Primary Database:** PostgreSQL ("Quietly DB" - credential ID: `JlETYTnhAwFrsmL9`)
**Visual Interface:** NocoDB (connected to PostgreSQL)
**Source of Truth:** PostgreSQL
**Sync:** One-way: PostgreSQL -> Google Sheets (Sheets is a read-only mirror)

## Architecture Decision
> **PostgreSQL is the single source of truth.** All READS come from PostgreSQL. All WRITES go to PostgreSQL first, then mirror to Google Sheets for secondary visibility. NocoDB provides the visual/UI layer on top of PostgreSQL.

---

## Data Flow Pattern
```
[Tenant Message] → [n8n Workflow] → [PostgreSQL (primary write)] → [Google Sheets (mirror sync)]
                                          ↕
                                      [NocoDB (visual UI)]
```

- **READS:** Always from PostgreSQL
- **WRITES:** PostgreSQL INSERT/UPDATE first → then Google Sheets append/update (one-way sync)
- **Google Sheets:** Kept as a secondary mirror for visibility, NOT for reading

---

## Workflows

### 1. Tenant Message Handler
**Files:**
- Original: `Property Management - Tenant Message Handler (11).json`
- Migrated: `Property Management - Tenant Message Handler (MIGRATED).json` (172 nodes, PG + Sheets mirrors)
- Optimized (old): `Property Management - Tenant Message Handler (OPTIMIZED).json`
- **Current: `Tenant Message Handler.json`** (use this one)

**Purpose:** Multi-channel inbox that receives tenant messages, classifies them, auto-replies, logs tickets, and dispatches vendors.

#### Input Channels:
| Channel | Trigger | Details |
|---------|---------|---------|
| Email | Gmail Trigger (every minute, unread) | Credential: `dionbuildsai gmail` |
| SMS (Urgent) | Webhook: `/ec42e035-...` | From Twilio |
| SMS (General) | Webhook: `/12b2d2db-...` | From Twilio |
| SMS (Other) | Webhook: `/51a88b30-...` | From Twilio |
| Telegram | Telegram Trigger | Bot: `property_management` |

#### Core Flow:
1. **Normalize** incoming message (extract sender, channel, message body)
2. **Tenant Lookup** — PostgreSQL query by email/phone/telegram_id
3. **Merge Data** — consolidation node (Email/SMS via Prepare Data, Telegram via Prepare Telegram Data)
4. **Check open tickets** — relatability check against existing tickets (Get Open Tickets, `alwaysOutputData: true`)
5. **Classify** message using Claude (urgency, category, summary)
6. **Route** based on urgency:
   - **Urgent (sequential chain):** Ack tenant → Create ticket (PG + Sheets) → Lookup vendor → AI vendor message → Email + SMS vendor → Get message history → AI landlord briefing → Owner Telegram approval (accept/decline) → Delete processing msg
   - **Not Urgent:** Ack tenant → Create ticket (PG + Sheets)
   - **Request/Question/Conversation/Not Our Responsibility:** AI response → Create ticket (PG + Sheets)
7. **Log ticket** to PostgreSQL (then mirrors to Sheets)
8. **Log messages** to PostgreSQL messages table
9. **Telegram Bot Features:** Registration, ticket relatability check, photo handling, owner approval

#### PostgreSQL Node Summary (current `Tenant Message Handler.json`):

**10 READ nodes** (executeQuery — complex SELECTs with JOINs/COALESCE/CASE WHEN):
- Lookup Tenant, Get Tenant Info, Get Tenant Info (Photo), Lookup by Phone
- Get Open Tickets, Get Open Tickets (Photo), Get Message History
- Lookup Vendor, Lookup Vendor for Approval, Lookup Ticket

**6 WRITE nodes** (manual column mapping — parameterized queries):
- Create Ticket (INSERT into maintenance_requests)
- Update Ticket: Accepted, Update Ticket: Declined (UPDATE maintenance_requests status)
- Update Tenant Telegram ID (UPDATE tenants)
- Update Ticket Media (UPDATE maintenance_requests media)
- Log Pending Media (UPDATE pending_media)

**2 WRITE nodes** (manual column mapping — pre-existing):
- Log Telegram Message, Log Message (INSERT into messages)

**1 WRITE node** (executeQuery — subquery too complex for manual):
- Update Message Ticket (UPDATE messages with subquery)

**1 Google Sheets mirror** remains: Mirror Ticket to Sheets (append to Open tickets tab)

---

### 2. Voice Agent - Log Maintenance Request (`Voice Agent — Log Maintenance Request.json`)
**Purpose:** ElevenLabs voice agent integration. Already fully on PostgreSQL — no changes needed.

| Webhook | Table | Purpose |
|---------|-------|---------|
| `GET /log-maintenance` | `maintenance_requests` | Insert new maintenance request |
| `POST /get-status` | `maintenance_requests` | Query last 5 requests by tenant phone |
| `POST /post-call-log` | `call_logs` | Log call data (duration, transcript) |

**Emergency Flow:** urgency = "emergency" → Telegram alert to owner (chat ID: 6216258938)

---

## PostgreSQL Tables

### `tenants` (existing — altered)
- id (uuid PK), **name** (text, NOT NULL), phone, email, property_id (uuid FK → properties), unit_number, language_pref (default 'fr'), **telegram_id** (added), **lease_start** (added), **lease_end** (added), **rent_amount** (added), **emergency_contact** (added), **notes** (added), **status** (added, default 'active'), created_at
- **Indexes:** phone, email, telegram_id
- **Note:** Column is `name` not `tenant_name`. Uses `property_id` FK (not text property name). Workflow aliases: `name AS "Tenant Name"`, `unit_number AS "Unit"`

### `vendors` (new — created)
- id (uuid), vendor_name, email, phone, category, created_at, updated_at
- **Index:** category
- **Categories:** plumbing, electrical, hvac, appliance, pest_control, locksmith, general_maintenance, landscaping, cleaning

### `maintenance_requests` (existing — altered to consolidate tickets)
- id (uuid PK), ticket_id (text UNIQUE), tenant_name, **tenant_phone**, property, **unit_number**, channel, category, description, urgency, status (default 'new'), keywords, vendor, assigned_to, tenant_message, **telegram_chat_id**, **media_url**, created_at, updated_at, resolved_at
- **Added columns:** ticket_id, channel, type, summary, keywords, vendor, tenant_message, telegram_id, media, property, unit, tenant_email, phone
- **Indexes:** ticket_id, tenant_phone, property, status, channel, telegram_chat_id, phone
- **FK:** call_logs.request_id → maintenance_requests.id
- **Dual columns** (voice agent uses originals, handler uses aliases):
  - `tenant_phone` (voice) / `phone` (handler)
  - `unit_number` (voice) / `unit` (handler)
  - `telegram_chat_id` (voice) / `telegram_id` (handler)
  - `media_url` (voice) / `media` (handler)
- **READ queries use COALESCE** to normalize: `COALESCE(phone, tenant_phone) AS phone`
- **Statuses:** new, wait_for_approval, vendor_contacted, manual_review, in_progress, closed

### `messages` (new — created, then altered)
- id (uuid), chat_id, ticket_id, sender, message_text, media, channel, created_at, **message_id** (added), **telegram_id** (added)
- **Indexes:** chat_id, ticket_id, message_id, telegram_id
- **Note:** `message_id` stores Telegram message ID; Update Message nodes match on this column

### `pending_media` (new — created)
- id (uuid), ticket_id, chat_id, file_id, file_url, status (pending/attached), created_at
- **Indexes:** chat_id, ticket_id

### `call_logs` (existing — no changes)
- id, tenant_id, property_id, request_id (FK → maintenance_requests), duration_sec, full_transcript, elevenlabs_call_id, created_at

### `properties` (existing — no changes)
- id (uuid PK), name (text NOT NULL), address, manager_name, manager_email, manager_phone, twilio_number, faq_doc_url, created_at
- **Referenced by:** tenants.property_id

---

## Google Sheets (Mirror Only)
**Document ID:** `1be3u-2jYUYnyRGs2AhcZP07qlrLmCIDW-o0_HO8LvpY`

| Tab | GID | Purpose | Sync Direction |
|-----|-----|---------|---------------|
| Tenants | 0 | Tenant contact info | PG → Sheets |
| Vendors | 329427099 | Vendor contacts by category | PG → Sheets |
| Open tickets | 1654455059 | Active support tickets | PG → Sheets |
| Messages | 1066278066 | Conversation logs | PG → Sheets |
| pending_media | 1367448199 | Photo/media uploads | PG → Sheets |

---

## Credentials & Services
| Service | Credential Name | ID |
|---------|----------------|-----|
| PostgreSQL | Quietly DB | `JlETYTnhAwFrsmL9` |
| Gmail | dionbuildsai gmail | `ib5ffoxInNyz8gYt` |
| Google Sheets | dionbuildsai Sheets | `WNOgZsgLVbrx2XuZ` |
| Anthropic | Anthropic account | `jOOjmB3sv6fwkbDV` |
| Twilio | Twilio account | `ijmhKNa9AFRv7Rjr` |
| Telegram (owner alerts) | transaction-bot | `0MEpmtcQTyFrwyJp` |
| Telegram (tenant bot) | property_management | `5uwoGp7iX1GQkMcu` |

## Key Business Details
- **Company:** Julia Inc
- **Location:** Quebec, Canada (Civil Code of Quebec applies)
- **Emergency Line:** 438-900-9998
- **Callback Number:** 514-831-9058
- **Owner Telegram Chat ID:** 6216258938
- **n8n Instance:** `https://n8n.srv1285597.hstgr.cloud`
- **Twilio Number:** +14389009998

## AI Models Used (Optimized)
- Claude Haiku 4.5 — ALL AI calls (zero Sonnet). 7 total: unified classifier, relatability check, vendor message x2, landlord briefing, request/question response, no-responsibility response
- Templates replace formulaic AI calls: urgent ack, non-urgent ack, conversational, ticket-exists ack (bilingual FR/EN)

---

## SQL Migration Scripts
Located in `sql/` directory. Run in order:
1. `001_create_vendors.sql` — Create vendors table
2. `002_create_messages.sql` — Create messages table
3. `003_create_pending_media.sql` — Create pending_media table
4. `004_alter_tenants.sql` — Add telegram_id to tenants
5. `005_alter_maintenance_requests.sql` — Add ticket columns for consolidation
6. `006_run_all.sql` — Run all scripts in order
7. `007_alter_messages.sql` — Add message_id and telegram_id to messages
8. `008_add_manager_id.sql` — Add manager_id to properties for multi-manager routing

## Server Access
- **Host:** srv1285597.hstgr.cloud (IP: 76.13.96.3)
- **SSH:** root@76.13.96.3
- **PostgreSQL:** Docker container (`quietly-postgres`), accessed via: `docker exec -i $(docker ps --filter 'name=postgres' -q) psql -U quietly -d quietly_db`
- **DB Credentials:** host=quietly-postgres, port=5432, db=quietly_db, user=quietly

## Migration Status (2026-02-25)
- [x] SQL schema changes executed (tables created, columns added)
- [x] 3 new tables created: vendors, messages, pending_media
- [x] tenants table: added telegram_id, lease_start, lease_end, rent_amount, emergency_contact, notes, status
- [x] maintenance_requests table: added type, summary, tenant_email + alias columns (phone, unit, telegram_id, media, property)
- [x] messages table: added message_id, telegram_id columns (007_alter_messages.sql)
- [x] Data populated: 15 tenants, 27 vendors (3 per category), 3 properties
- [x] Tenant queries use JOIN with properties table to resolve property address
- [x] SQL aliases match Google Sheets column names (Tenant Name, Phone, Unit, Property, Vendor Name, Email)
- [x] Migrated workflow JSON generated with correct column names and aliases
- [x] **v2 fix:** PG WRITE nodes use exact upstream node expressions ($('Node Name').item.json.field) instead of generic $json.field
- [x] **v2 fix:** maintenance_requests READ queries use COALESCE for cross-source column compatibility
- [x] **v2 fix:** "Append or update row in sheet" correctly maps to maintenance_requests (not pending_media)
- [x] Migrated workflow imported into n8n

## Current Architecture (2026-03-14 rebuild)

The old 135-node monolith (`Tenant Message Handler.json`) has been replaced with **4 active sub-workflows** (90 nodes total):

### Workflow Files (in `workflows/` directory)

| Workflow | n8n ID | Nodes | Purpose |
|----------|--------|-------|---------|
| **[Intake] Channel Router** | `6uqrzVIcH8GFznDf` | 42 | Receives messages from all channels, normalizes, looks up tenant, hands off to AI Agent. Also handles callback dispatch flow (vendor lookup, preview, confirm). |
| **[AI] Conversation Agent** | `5WW7m5IiqvJoHWZ1` | 23 | Claude Sonnet 4 AI agent — classifies, generates tickets, decides urgency, notifies landlord |
| **[Response] Channel Dispatcher** | `ErGEhkdaWj0zTmQI` | 8 | Routes AI response back to correct channel (Telegram, Email, SMS, WhatsApp) |
| **[Ticket] Management** | `CnUFSXbeIk9GNI5t` | 17 | Webhook API for ticket creation, escalation, lookup, video search |

> **Note:** `Ticket & Vendor Dispatch` (`3EfPAdyF5VRCpjLc`) is archived — vendor dispatch is handled directly in the Intake callback flow.

### Data Flow
```
[Telegram/Email/SMS] → [Intake] → [AI Agent] → [Response Dispatcher] → [Reply to tenant]
                                       ↓
                              [Create Ticket + Notify Landlord]
                                       ↓
                         [Callback buttons: Auto Dispatch / Show Contractors]
                                       ↓
                              [Intake callback branch → Vendor Dispatch → Email/SMS vendor]
```

### AI Models Used
| Node | Model | Purpose |
|------|-------|---------|
| Julia AI (main agent) | Claude Sonnet 4 | Conversation, classification, ticket generation |
| Haiku Classifier | Claude Haiku 4.5 | Action classification, urgency detection |
| Haiku Dispatch | Claude Haiku 4.5 | Vendor message generation |
| Haiku Confirm | Claude Haiku 4.5 | Confirmation message generation |

### Production Fixes Applied (2026-03-14/15)
- [x] Removed Check Duplicate / Is New Message nodes (bypassed dedup that depended on missing `external_message_id` column)
- [x] All Telegram send nodes use `parse_mode: HTML` (fixes MarkdownV2 entity parsing errors with underscores, hyphens, etc.)
- [x] Create Ticket SQL: all text fields escaped with `.replace(/'/g, "''")` (fixes SQL injection from apostrophes like "doesn't")
- [x] Log Inbound Message / Log AI Response / Link Messages: all SQL fields properly escaped
- [x] Haiku Dispatch/Confirm switched from Sonnet 4.5 to Haiku 4.5 (was 33s per dispatch, now ~5-8s)
- [x] Normalize nodes route directly to Lookup Tenant (dedup nodes removed)
- [x] Removed orphan manual trigger node (Clear Messages/Tickets kept for manual dev use)
- [x] Vendor Dispatch workflow: fixed broken `$('Merge Data')` references → `$('Start')`
- [x] Full audit: 0 critical, 0 high, 0 warnings across all 4 active workflows

### Dedup Strategy
- `external_message_id` column added to messages table with partial unique index (WHERE != '')
- Log Inbound Message uses `INSERT ... ON CONFLICT (external_message_id) DO NOTHING`
- Each channel generates unique IDs: email=Gmail ID, telegram=`tg_{msg_id}_{chat_id}`, sms=`sms_{timestamp}_{phone}`

### Ticket Classification
- ALL tenant messages create tickets (except greetings/thank yous)
- **Urgency levels:** `urgent`, `not_urgent`, `info_request`
- **Maintenance categories:** plumbing, electrical, hvac, appliance, pest_control, locksmith, general_maintenance
- **Non-maintenance categories:** `lease_admin` (lease copies, renewals), `parking`, `general_inquiry`
- Only `urgent` tickets trigger landlord Telegram notification
- Landlord views all tickets in NocoDB `maintenance_requests` table, sorted by urgency

### Log Inbound Message
- Uses `$('Normalize Telegram')?.item?.json` references (not `$json`) because `$json` at that point is the Lookup Tenant result, not the message data

### Known Limitations
- Telegram webhook must be re-registered via n8n UI toggle when workflow is deactivated/reactivated via API
- WhatsApp channel configured but not yet tested end-to-end

## Deployment Steps
1. ~~Run SQL scripts~~ (DONE)
2. ~~Populate tenants, vendors, properties~~ (DONE)
3. ~~Import migrated workflow~~ (DONE)
4. ~~Run 008_add_manager_id.sql~~ (DONE)
5. ~~Rebuild into 5 sub-workflows~~ (DONE)
6. ~~End-to-end testing: Telegram → AI → Response~~ (DONE - working)
7. ~~Add `external_message_id` column + unique index + ON CONFLICT dedup~~ (DONE)
8. [ ] Test Email and SMS channels end-to-end
9. [ ] WhatsApp channel integration

### Properties Table (updated)
- id (uuid PK), name, address, manager_name, manager_email, manager_phone, twilio_number, faq_doc_url, **manager_id** (text, default '6216258938'), created_at

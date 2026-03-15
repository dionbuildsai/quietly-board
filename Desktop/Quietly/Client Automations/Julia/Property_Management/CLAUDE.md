# Julia Inc — Property Management Automation

## Project Overview
Property management automation for **Julia Inc** (Quebec-based). 4 n8n workflows handle tenant messages across Telegram, Email, SMS, and WhatsApp — auto-classifying issues, creating tickets, dispatching vendors, and replying via AI.

**n8n Instance:** `https://n8n.srv1285597.hstgr.cloud`
**NocoDB:** `https://nocodb.srv1285597.hstgr.cloud`
**GitHub:** `dionbuildsai/quietly-board` (branch: main)
**Project Dir:** `~/Desktop/Quietly/Client Automations/Julia/Property_Management/`
**Database:** PostgreSQL ("Quietly DB" — credential ID: `JlETYTnhAwFrsmL9`)

---

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │         [Intake] Channel Router (50 nodes)    │
  Telegram ────────►│  Normalize → Lookup Tenant → Log Message     │
  Email (Gmail) ───►│  → Build AI Payload → Call AI Agent          │
  SMS (Twilio) ────►│                                              │
  WhatsApp ────────►│  Also: Callback dispatch flow (vendor        │
                    │  lookup, preview, confirm, email vendor)     │
                    └──────────────┬───────────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────────────┐
                    │       [AI] Conversation Agent (23 nodes)      │
                    │  Claude Sonnet 4 → Classify → Create Ticket  │
                    │  → Log Response → Notify Landlord (urgent)   │
                    └──────────────┬───────────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────────────┐
                    │    [Response] Channel Dispatcher (8 nodes)    │
                    │  Routes reply back to: Telegram / Email /    │
                    │  SMS / WhatsApp based on original channel    │
                    └──────────────────────────────────────────────┘

                    ┌──────────────────────────────────────────────┐
                    │      [Ticket] Management (17 nodes)           │
                    │  Webhook API for ticket creation, escalation, │
                    │  lookup, video search (used by AI Agent tools)│
                    └──────────────────────────────────────────────┘
```

---

## Workflows (in `workflows/` directory)

| Workflow | n8n ID | Nodes | Purpose |
|----------|--------|-------|---------|
| **[Intake] Channel Router** | `6uqrzVIcH8GFznDf` | 50 | Receives messages from all 4 channels, normalizes, looks up tenant, logs message, hands off to AI Agent. Also handles Telegram callback dispatch flow (vendor lookup, preview, confirm, email vendor). |
| **[AI] Conversation Agent** | `5WW7m5IiqvJoHWZ1` | 23 | Claude Sonnet 4 main agent + Haiku classifier. Classifies urgency/category, creates tickets, notifies landlord for urgent issues. |
| **[Response] Channel Dispatcher** | `ErGEhkdaWj0zTmQI` | 8 | Routes AI response back to Telegram / Email / SMS / WhatsApp. Truncates Telegram to 4090 chars. |
| **[Ticket] Management** | `CnUFSXbeIk9GNI5t` | 17 | Webhook API endpoints for ticket creation, urgent escalation, ticket lookup, video search. |

> `Ticket & Vendor Dispatch` (`3EfPAdyF5VRCpjLc`) is archived — vendor dispatch is handled in the Intake callback flow.

---

## Channel Status (all verified working)

| Channel | Trigger | Tenant Lookup | Reply Method | Tested |
|---------|---------|--------------|--------------|--------|
| Telegram | Telegram Trigger | `telegram_id` match | Telegram Bot API | Yes |
| Email | Gmail poll (every 1 min) | Case-insensitive email match | Gmail reply | Yes |
| SMS | Webhook POST `/sms-intake` | Phone LIKE match | Twilio SMS | Yes |
| WhatsApp | Meta webhook POST `/whatsapp-intake` | Phone RIGHT(10) match | WhatsApp Business API | Yes |

### Channel-Specific Notes
- **Email:** Normalize Email extracts email from Gmail "Name \<email\>" format. Unknown senders are silently dropped (no reply to spam/newsletters).
- **SMS:** Webhook accepts POST only.
- **WhatsApp:** Meta sends delivery status webhooks (sent/delivered/read) — Parse WhatsApp filters these out. 3 empty ~13ms executions per message is cosmetic/expected.
- **WhatsApp verification:** GET webhook at `/whatsapp-intake` returns `hub.challenge` for Meta callback verification.

---

## AI Models

| Node | Model | Purpose |
|------|-------|---------|
| Julia AI | Claude Sonnet 4 | Main conversation agent |
| Haiku Classifier | Claude Haiku 4.5 | Action classification, urgency detection |
| Haiku Dispatch | Claude Haiku 4.5 | Vendor message generation |
| Haiku Confirm | Claude Haiku 4.5 | Confirmation message generation |

---

## Ticket Classification

ALL tenant messages create tickets except greetings/thank yous.

| Urgency | Examples | Landlord Notified? |
|---------|----------|-------------------|
| `urgent` | Water leak, fire, gas smell, no heat, security breach | Yes — Telegram with inline buttons |
| `not_urgent` | Appliance, pest, slow drain, cosmetic repairs | No |
| `info_request` | Lease questions, parking, payment inquiries | No |

**Maintenance categories:** plumbing, electrical, hvac, appliance, pest_control, locksmith, general_maintenance
**Non-maintenance categories:** lease_admin, parking, general_inquiry

Landlord views all tickets in NocoDB `maintenance_requests` table, sortable by urgency.

---

## Data Flow Details

### Message Logging
- **Merge Tenant + Message** Code node (try/catch across all 4 Normalize nodes) combines normalized message data + tenant data before INSERT
- Required because `$json` after Lookup Tenant is the tenant record, not the message
- The merged `$json` has `norm_message`, `norm_channel`, `norm_chat_id`, `norm_ext_id` fields

### Dedup
- `external_message_id` column on messages table with partial unique index (`WHERE != ''`)
- Log Inbound Message uses `INSERT ... ON CONFLICT (external_message_id) DO NOTHING`
- IDs per channel: email=Gmail ID, telegram=`tg_{msg_id}_{chat_id}`, sms=`sms_{timestamp}_{phone}`, whatsapp=`wa_{message_id}`

### Dispatch Flow (Telegram callbacks)
1. Landlord gets urgent ticket notification with inline buttons (Auto Dispatch / Show Contractors)
2. Click → Intake callback branch → Parse Callback → Route Action
3. `dispatch` → Lookup Vendor → AI Vendor Msg (Haiku) → Show Preview → Send Preview with buttons
4. `confirm_dispatch` → Confirm Vendor → AI Confirm Msg → Email Vendor → Dispatch Ack

---

## PostgreSQL Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **tenants** | Tenant contacts | name, phone, email, telegram_id, property_id (FK), unit_number, language_pref |
| **maintenance_requests** | Tickets | ticket_id, tenant_name, phone, property, unit, channel, category, urgency, status, summary, tenant_message |
| **messages** | All messages | chat_id, ticket_id, sender, message_text, channel, external_message_id |
| **vendors** | Vendor contacts | vendor_name, email, phone, category |
| **properties** | Buildings | name, address, manager_name, manager_id, twilio_number |
| **pending_media** | Photo uploads | ticket_id, chat_id, file_id, file_url, status |
| **call_logs** | Voice calls | tenant_id, request_id (FK), duration_sec, full_transcript |

### Ticket Statuses
`open` → `wait_for_approval` → `vendor_contacted` → `in_progress` → `closed`

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
| WhatsApp Trigger | WhatsApp OAuth account | `o4wvMotZj7fX2wct` |

---

## Key Business Details
- **Company:** Julia Inc
- **Location:** Quebec, Canada (Civil Code of Quebec applies)
- **Emergency Line:** 438-900-9998
- **Callback Number:** 514-831-9058
- **Owner Telegram Chat ID:** 6216258938
- **Twilio Number:** +14389009998
- **WhatsApp Phone Number ID:** 1002910989571888
- **WhatsApp Business Account ID:** 168784515265314
- **Meta App ID:** 872554515351219

---

## Production Hardening (completed 2026-03-15)
- All SQL text fields escaped with `.replace(/'/g, "''")`
- All Telegram send nodes use `parse_mode: HTML`
- Telegram response truncated to 4090 chars
- Vendor queries capped with LIMIT 10
- Email sender extracted from "Name \<email\>" format
- Email tenant lookup is case-insensitive
- Get Open Tickets uses DISTINCT
- Unknown email senders silently dropped (no spam replies)
- WhatsApp status webhooks filtered in Parse WhatsApp
- Full audit: 0 critical, 0 high, 0 warnings

---

## Known Risks (accepted)
- Telegram bot token hardcoded in 4 HTTP Request nodes (Send Telegram, Send List, Dispatch Ack, Notify Non-Urgent)
- Ticket Management webhooks have no auth (called internally by AI Agent)
- SMS Webhook has no auth (called by Twilio)
- If Claude API goes down, tenant gets no reply (no fallback handler)
- Race condition: two simultaneous messages could create duplicate tickets (low probability)
- WhatsApp status updates create 3 empty ~13ms executions per message (filtered, cosmetic only)

---

## Before Client Deployment

| Priority | Item | Status |
|----------|------|--------|
| Required | Switch WhatsApp to **Live mode** in Meta | Pending |
| Required | Create WhatsApp **permanent token** (System User) | Pending |
| Required | Add **production WhatsApp number** (currently test +1 555 183 0681) | Pending |
| Required | Verify Gmail credential is the **client's inbox** (currently `dionfwang`) | Pending |
| Required | Add **real tenants** to database (currently test data) | Pending |
| Optional | Add `.gitignore` (repo root is `/Users/dion`) | Pending |
| Optional | Move Telegram bot token to credential node | Pending |
| Optional | Add Claude API fallback message | Pending |

---

## Server Access
- **Host:** srv1285597.hstgr.cloud (IP: 76.13.96.3)
- **SSH:** root@76.13.96.3
- **PostgreSQL:** `docker exec -i $(docker ps --filter 'name=postgres' -q) psql -U quietly -d quietly_db`
- **DB Credentials:** host=quietly-postgres, port=5432, db=quietly_db, user=quietly

## SQL Migration Scripts (in `sql/`)
1. `001_create_vendors.sql` — Create vendors table
2. `002_create_messages.sql` — Create messages table
3. `003_create_pending_media.sql` — Create pending_media table
4. `004_alter_tenants.sql` — Add telegram_id to tenants
5. `005_alter_maintenance_requests.sql` — Add ticket columns
6. `006_run_all.sql` — Run all scripts in order
7. `007_alter_messages.sql` — Add message_id and telegram_id to messages
8. `008_add_manager_id.sql` — Add manager_id to properties

## Technical Notes
- Webhook nodes created via API need `webhookId` field (UUID) to register in production mode
- Telegram webhook must be re-registered via n8n UI toggle when workflow is deactivated/reactivated via API
- Log Inbound Message uses "Merge Tenant + Message" Code node with try/catch because `$('Normalize X')?.item?.json` throws when node hasn't executed

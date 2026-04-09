# Client Onboarding Playbook

Technical playbook for spinning up a new property management AI instance for a new client. This is the **operator's checklist** — not the client-facing onboarding doc (`onboarding-runbook-2026-03-29.md` is for clients).

**Audience:** Dion / future operator
**Goal:** Get a new client (e.g., "ACME Property Management") fully onboarded in 4-6 hours
**Prerequisite:** Existing live Julia PM working as the reference template

---

## Decision: Multi-tenant or Per-client?

You have two architectural options for hosting multiple clients:

### Option A: Per-client n8n + dashboard (recommended)
Each client gets their own n8n container, dashboard container, and database. Fully isolated.
- **Pros:** Total isolation, easy to debug, can customize per-client, easy to cancel/migrate
- **Cons:** More resources, more containers to manage, separate backups
- **Cost:** ~$10-20/month per client (small VPS or shared VPS)

### Option B: Multi-tenant (single n8n + tenant-aware workflows)
One n8n instance handles many clients via per-tenant routing logic.
- **Pros:** Cheaper, easier to push updates
- **Cons:** Big refactor of all workflows, single point of failure, harder to customize
- **Not currently supported** by the existing workflow architecture

**This playbook assumes Option A.**

---

## Phase 1: Pre-onboarding (Sales/Discovery)

Gather from the client BEFORE you start technical setup:

### Required information
- [ ] **Company name** (e.g., "ACME Property Management")
- [ ] **Owner/PM contact** — name, phone, email, Telegram username
- [ ] **Office phone number** (if different from owner)
- [ ] **Number of properties** (rough estimate)
- [ ] **Number of tenants** (rough estimate)
- [ ] **Languages** the property serves (English, French, both, etc.)
- [ ] **Country/region** (affects timezone, phone formats, OACIQ-style regulations)

### Channels they want
- [ ] **Telegram** — Required (cheapest, easiest)
- [ ] **WhatsApp** — Optional (most popular in Quebec)
- [ ] **SMS** — Optional (Twilio cost ~$0.01/msg)
- [ ] **Email** — Optional (free with Gmail)
- [ ] **Voice** — Optional (ElevenLabs ~$0.10/min, Twilio number ~$1/mo)

### Their existing tools
- [ ] Do they have a website?
- [ ] Do they use any property management software (Buildium, AppFolio, etc.)?
- [ ] How do they currently track maintenance requests? (spreadsheet, paper, app?)
- [ ] Who needs notifications? Just owner, or multiple staff?

### Vendors
- [ ] Get the client's existing vendor list (plumber, electrician, HVAC, etc.)
- [ ] Names, emails, phone numbers, specialties, preferred languages

---

## Phase 2: Account Setup (External services)

These are the **external accounts** you need to create or invite the client to:

### 2.1 Telegram Bot (REQUIRED)

1. Open Telegram → message **@BotFather**
2. Send `/newbot`
3. Bot name: `<Client> Property Management` (e.g., "ACME Property Management")
4. Username: `<client>_property_manager_bot` (must end in `_bot`)
5. **Save the token** — looks like `1234567890:ABCdefGHIjklMNO...`
6. Optionally set a profile picture and description via `/setuserpic`, `/setdescription`

**Save:** `TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNO...`

### 2.2 WhatsApp Business via Meta (RECOMMENDED)

This is the most complex setup — see `whatsapp-business-setup-guide.md` for the full walkthrough. Summary:

1. Go to **business.facebook.com** → create a Business Account if not already
2. Add the client's phone number (must be a real number they own, NOT already on WhatsApp personal)
3. Verify the number via SMS code from Meta
4. Create a Meta App for WhatsApp Business API
5. Add the WABA (WhatsApp Business Account) to the app
6. Create a **System User** with full control of the WABA + the app
7. Generate a **permanent token** with `whatsapp_business_messaging` + `whatsapp_business_management` permissions
8. Get the **Phone Number ID** from API Setup page
9. Configure webhook → `https://n8n.<client-subdomain>/webhook/whatsapp-intake` (set this AFTER you have n8n running)

**Save:**
- `WHATSAPP_TOKEN=EAA...` (permanent System User token)
- `WHATSAPP_PHONE_NUMBER_ID=971537566052793` (numeric ID)
- WABA ID (for reference)
- Meta App ID (for reference)

### 2.3 Twilio (OPTIONAL — for SMS/voice)

1. Create new sub-account in Twilio (or use shared account with new phone number)
2. Buy a phone number with SMS capability in the client's region
3. Configure SMS webhook → `https://n8n.<client-subdomain>/webhook/sms-intake` (set after n8n running)
4. Enable voice capability if doing voice agent

**Save:**
- `TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- `TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- `TWILIO_FROM_NUMBER=+1...` (the phone number you bought)

### 2.4 Gmail OAuth (OPTIONAL — for Email)

1. Use the client's existing Gmail OR create a new property@<client>.com
2. In n8n UI: **Credentials → Add → Gmail OAuth2**
3. Follow OAuth flow (this requires n8n to already be running, so come back to this)

**Save:** Just the credential ID (n8n generates one)

### 2.5 ElevenLabs (OPTIONAL — for voice agent)

1. Sign up at elevenlabs.io (or use your own shared account)
2. Create an agent with the voice + system prompt customized for this client
3. Get the API key

**Save:** `ELEVENLABS_API_KEY=sk_...`

### 2.6 Anthropic (SHARED — already set up)

You already have an Anthropic account. Just decide:
- **Option A:** Use your shared key for all clients (simpler, your bill)
- **Option B:** Have client provide their own Anthropic key (cleaner billing)

Currently using shared. If switching to per-client, save their key.

---

## Phase 3: Infrastructure Setup

### 3.1 Provision a server

Either:
- **Use existing VPS** with Docker (cheapest, e.g., Hostinger srv1285597 currently hosts Julia)
- **Provision new VPS** for the client (cleaner, e.g., $10/month Hostinger box)

You need:
- Docker + Docker Compose
- Traefik (or nginx) reverse proxy
- Subdomain pointed at the VPS

### 3.2 Subdomain setup

For client "ACME":
- `n8n.acme.yourdomain.com` → n8n
- `dash.acme.yourdomain.com` → dashboard

Add DNS A records pointing to the VPS IP.

### 3.3 Postgres database

If sharing the VPS Postgres container with other clients:
```sql
CREATE DATABASE acme_db;
GRANT ALL ON DATABASE acme_db TO quietly;
```

Then run the PM schema migrations (you have these from Julia's setup):
```bash
# Copy schema from existing client
docker exec quietly-postgres pg_dump -U quietly --schema-only quietly_db > /tmp/pm_schema.sql

# Apply to new client
docker exec -i quietly-postgres psql -U quietly -d acme_db < /tmp/pm_schema.sql
```

Insert seed data:
- Properties (the client's buildings)
- Tenants (the client's tenant list — use the dashboard CSV import)
- Vendors (from the discovery phase)
- Repair videos (you can copy Julia's `repair_videos` table or curate per-client)
- Settings table entries (see 3.6)

### 3.4 Docker compose for n8n

Copy Julia's `/docker/n8n/docker-compose.yml` as a starting point. For each new client, create a similar setup at `/docker/<client>/docker-compose.yml`. Key changes:

```yaml
services:
  n8n:
    build:
      context: .
      dockerfile: Dockerfile  # use n8n 2.10.4 to match production
    container_name: <client>-n8n
    restart: always
    labels:
      - traefik.enable=true
      - traefik.http.routers.<client>-n8n.rule=Host(`n8n.<subdomain>.yourdomain.com`)
      - traefik.http.routers.<client>-n8n.tls=true
      - traefik.http.routers.<client>-n8n.entrypoints=web,websecure
      - traefik.http.routers.<client>-n8n.tls.certresolver=mytlschallenge
    environment:
      # n8n core
      - N8N_HOST=n8n.<subdomain>.yourdomain.com
      - N8N_PROTOCOL=https
      - N8N_PORT=5678
      - WEBHOOK_URL=https://n8n.<subdomain>.yourdomain.com/
      - GENERIC_TIMEZONE=America/Toronto  # or client's timezone
      - N8N_RUNNERS_ENABLED=false
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=false  # CRITICAL — required for $env. references in Code nodes
      - NODE_FUNCTION_ALLOW_EXTERNAL=pdf-lib
      - NODE_FUNCTION_ALLOW_BUILTIN=fs,crypto,child_process
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=quietly-postgres  # or per-client postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=<client>_n8n  # separate n8n DB per client
      - DB_POSTGRESDB_USER=quietly
      - DB_POSTGRESDB_PASSWORD=<password>
      - N8N_API_KEY=<random-string>
      - N8N_PUBLIC_API_DISABLED=false
      - NODE_OPTIONS=--max-old-space-size=2048

      # PM-specific (CLIENT-SPECIFIC)
      - TELEGRAM_BOT_TOKEN=<client_bot_token>
      - WHATSAPP_TOKEN=<client_wa_token>
      - WHATSAPP_PHONE_NUMBER_ID=<client_wa_phone_id>
      - TWILIO_ACCOUNT_SID=<client_or_shared>
      - TWILIO_AUTH_TOKEN=<client_or_shared>
      - TWILIO_FROM_NUMBER=<client_twilio_number>

      # Shared
      - ANTHROPIC_API_KEY=sk-ant-api03-...
    volumes:
      - <client>_n8n_data:/home/node/.n8n
      - /local-files/<client>:/files
```

### 3.5 Docker compose for dashboard

```yaml
  dashboard:
    build: /docker/quietly-dash  # use the existing dashboard codebase
    container_name: <client>-dash
    restart: always
    labels:
      - traefik.enable=true
      - traefik.http.routers.<client>-dash.rule=Host(`dash.<subdomain>.yourdomain.com`)
      - traefik.http.routers.<client>-dash.tls=true
      - traefik.http.routers.<client>-dash.entrypoints=web,websecure
    environment:
      - DB_HOST=quietly-postgres
      - DB_PORT=5432
      - DB_NAME=<client>_db
      - DB_USER=quietly
      - DB_PASSWORD=<password>
      - NODE_ENV=production
      # Same secrets as n8n container so dashboard owner messaging works
      - ANTHROPIC_API_KEY=sk-ant-api03-...
      - TELEGRAM_BOT_TOKEN=<client_bot_token>
      - WHATSAPP_TOKEN=<client_wa_token>
      - WHATSAPP_PHONE_ID=<client_wa_phone_id>  # NOTE: dashboard uses _ID, n8n uses _NUMBER_ID
      - TWILIO_ACCOUNT_SID=<client_or_shared>
      - TWILIO_AUTH_TOKEN=<client_or_shared>
      - TWILIO_FROM=<client_twilio_number>
      - TWILIO_FROM_NUMBER=<client_twilio_number>  # both names — dashboard reads TWILIO_FROM, future code may read _NUMBER
      - ELEVENLABS_API_KEY=sk_...
      - DASHBOARD_PASSWORD=<random-strong-password>
    volumes:
      - /local-files/<client>/media:/app/media
```

### 3.6 Settings table seed data

After the schema is applied, insert the per-client settings:

```sql
INSERT INTO settings (key, value, category, label, encrypted, updated_at) VALUES
  ('telegram_owner_chat_id', '<owner_telegram_chat_id>', 'telegram', 'Owner Chat ID', false, NOW()),
  ('owner_name', '<Owner First Name>', 'general', 'Owner Name', false, NOW()),
  ('company_name', '<Client Company Name>', 'general', 'Company Name', false, NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

You'll find the **owner's Telegram chat ID** by:
1. Have the owner message the new bot
2. Open the n8n UI → check `Telegram Trigger` recent executions → find the `chat.id` in the message data
3. Or use https://api.telegram.org/bot<TOKEN>/getUpdates after they message

### 3.7 Start the containers

```bash
cd /docker/<client>/
docker compose up -d
docker compose logs -f n8n  # watch for activation logs
```

---

## Phase 4: Workflow Deployment

You'll import the 8 PM workflows from the Julia template, then customize per client.

### 4.1 Get the latest workflow files

```bash
cd /Users/dion/Desktop/Projects/julia-pm
git pull origin main
ls workflows/
```

You should see:
- AI_Conversation_Agent.json
- Intake_Channel_Router.json
- Media_Upload_Handler.json
- Owner_Message_Sender.json
- Response_Channel_Dispatcher.json
- Ticket_Management.json
- Voice_Agent_Log_Maintenance_Request.json
- WhatsApp_Meta_Intake.json

### 4.2 Critical: customize workflow JSONs per client

Several things in the workflow JSONs are hardcoded to Julia and MUST be replaced:

| What | Where | Find | Replace with |
|---|---|---|---|
| **"Is Dion?" filter** | AI Agent `Send Owner Notification`, Voice Agent `Send Voice Notification` | `5148319058` | The new client's testing phone (or remove the filter entirely if you won't test on production) |
| **Dion's chat ID** | Same nodes, in the override | `'6216258938'` | Owner's chat ID, OR remove and let it use `ownerChatId` from settings |
| **Welcome message text** | Intake `Welcome Message` | "tenant account..." | Customize for the client's branding |
| **Vendor email prompt** | Intake `Confirm Vendor Msg` | "Julia from Julia Inc property management" | "<Owner> from <Company>" |
| **Bot name in AI replies** | AI Agent `Julia AI` system prompt | "Julia" | The client's PM bot name (e.g., "Sara") |
| **Twilio webhook path** | If different per client | `/webhook/sms-intake` | (usually keep the same path) |
| **WhatsApp webhook path** | Same | `/webhook/whatsapp-intake` | (usually keep the same path) |

### 4.3 Workflow IDs

n8n uses workflow IDs to track unique workflows. The Julia workflow IDs are baked into the JSON:
- `6uqrzVIcH8GFznDf` (Intake Channel Router)
- `5WW7m5IiqvJoHWZ1` (AI Conversation Agent)
- etc.

For a new client on a separate n8n instance, **these IDs are fine to reuse** because each n8n has its own database. Only collide if you put 2 clients on the same n8n instance.

### 4.4 Import workflows

```bash
# Copy all 8 workflows into the new client's n8n container
for f in workflows/*.json; do
  scp $f root@<vps>:/tmp/import/$(basename $f)
done

ssh root@<vps> "
docker exec <client>-n8n mkdir -p /tmp/import
for f in <list of 8 files>; do
  docker cp /tmp/import/\$f <client>-n8n:/tmp/import/\$f
  docker exec <client>-n8n n8n import:workflow --input=/tmp/import/\$f
done
"
```

### 4.5 Create native credentials in the n8n UI

Some nodes still need saved credentials (not refactored to `$env` yet):

| Credential | n8n credential type | Where used |
|---|---|---|
| **Postgres** | `postgres` | All Postgres nodes |
| **Telegram saved cred** | `telegramApi` | Telegram Trigger only (required for webhook registration) |
| **Gmail OAuth2** | `gmailOAuth2` | Gmail Trigger + Send Email |
| **Twilio** (until refactored) | `twilioApi` | Twilio nodes |
| **WhatsApp Business** (DEPRECATED — already refactored) | not needed |  |

For each:
1. Open the new client's n8n UI
2. Go to Credentials → Add
3. Choose the type
4. Fill in the credentials
5. **Note the credential ID** — n8n auto-generates one

Then either:
- **Update the workflow JSON** to reference the new credential IDs (recommended)
- **OR** keep the same credential ID (`5uwoGp7iX1GQkMcu`, `JlETYTnhAwFrsmL9`, etc.) by manually setting it in n8n's database (advanced)

### 4.6 Activate workflows

```bash
ssh root@<vps> "
for wfid in 6uqrzVIcH8GFznDf 5WW7m5IiqvJoHWZ1 ErGEhkdaWj0zTmQI owner-msg-sender-001 \\
            CnUFSXbeIk9GNI5t media-upload-handler-001 x6LjYZQ2l05BS8uP JO26ruzPNp1MQThL; do
  docker exec <client>-n8n n8n update:workflow --id=\$wfid --active=true
done
docker compose restart n8n
"
```

Watch the logs for "Activated workflow ..." for all 8.

---

## Phase 5: Channel webhooks (final integration)

Now that n8n is running with workflows active, configure the external webhooks:

### 5.1 Telegram (auto-registered)
The Telegram Trigger auto-registers its webhook when activated. Verify by sending a message to the new bot — it should hit the n8n Telegram Trigger.

### 5.2 WhatsApp Meta
1. Go to your new Meta App → WhatsApp → Configuration
2. Callback URL: `https://n8n.<subdomain>.yourdomain.com/webhook/whatsapp-intake`
3. Verify token: `dev_verify_2026` (or any string — must match a check in your workflow if you have one)
4. Click "Verify and save" → Meta will ping your n8n
5. Subscribe to `messages` field

### 5.3 Twilio
1. Go to Twilio Console → Phone Numbers → Active Numbers → click your number
2. Messaging webhook: `https://n8n.<subdomain>.yourdomain.com/webhook/sms-intake`
3. Voice (if using voice agent): `https://n8n.<subdomain>.yourdomain.com/webhook/voice-intake` (or whatever your voice setup uses)

### 5.4 Gmail (auto-polling)
The Gmail Trigger polls the inbox automatically. Just make sure the OAuth credential is saved and the trigger is active.

### 5.5 ElevenLabs (if using voice)
1. Configure the agent with the n8n voice tools webhook URLs:
   - PM_get_status: `https://n8n.<subdomain>/webhook/get-status`
   - PM_log_maintenance: `https://n8n.<subdomain>/webhook/log-maintenance`
   - PM_post_call_log: `https://n8n.<subdomain>/webhook/post-call-log`
2. Set the agent's phone number to forward from Twilio

---

## Phase 6: Testing

Before handing off to the client:

### 6.1 Send test messages from your number
- [ ] **Telegram:** Message the new bot → bot replies → ticket created
- [ ] **WhatsApp:** Message the new WhatsApp number → bot replies → ticket created
- [ ] **SMS:** Text the new Twilio number → bot replies → ticket created
- [ ] **Email:** Send email → bot replies → ticket created (wait up to 1 min for poll)
- [ ] **Phone:** Call the Twilio number → ElevenLabs answers → log a maintenance request

### 6.2 Verify in dashboard
- [ ] All 5 channels show up in tickets list
- [ ] Tenant info correct (name, unit, property)
- [ ] Conversations render correctly
- [ ] Owner notifications arrive on owner's Telegram

### 6.3 Verify "Is Dion?" filter (if you kept it)
- [ ] Owner did NOT receive notifications for your test messages (filter routed them to your Dion chat instead)

### 6.4 Edge cases
- [ ] Send a media message (photo) on Telegram → photo downloads + appears in dashboard
- [ ] Send a media message on WhatsApp → same
- [ ] Send a message that should match a video → video link appears in bot reply
- [ ] Click "Auto Dispatch" on a ticket notification → vendor email sent
- [ ] Mark a ticket resolved → status updates in dashboard

---

## Phase 7: Hand-off to client

### 7.1 Create the client's first user accounts
- [ ] Owner gets dashboard access
- [ ] Add owner's Telegram chat ID to `settings` table

### 7.2 Documentation
Send the client:
- The **system guide** (`Materials/system-guide.html`) — full system reference
- The **onboarding runbook** (`onboarding-runbook-2026-03-29.md`) — quick start
- The **tenant welcome email template** (`Materials/tenant-welcome-email.html`) — for them to send to tenants
- The **tenant integration SOP** (`Materials/sop-tenant-integration.html`) — how to add tenants

### 7.3 Tenant onboarding (client does this)
- Client uses the dashboard to add their tenants (CSV import or one by one)
- For each tenant: name, unit, phone, email, language preference
- Client sends the tenant welcome email so tenants know the channels

### 7.4 Training session (1 hour)
Walk the client through:
- Opening the dashboard
- Reading new tickets
- Replying via the dashboard owner messaging feature
- Understanding the Telegram notification format
- The "Auto Dispatch" workflow
- How to mark tickets resolved

### 7.5 Set expectations
- 24-hour shake-out period
- Active monitoring for first week
- Weekly check-ins for first month

---

## Phase 8: Post-launch monitoring

### Set up monitoring
- [ ] Add the client's n8n executions to your dashboard (or tail logs)
- [ ] Set up an error notifier workflow for the new client (copy from Julia's `[System] Error Notifier`)
- [ ] Subscribe yourself to the error notifier output

### First-week checks (run daily for 7 days)
- [ ] Check execution count — should be similar to expected message volume
- [ ] Check error rate — should be < 1%
- [ ] Check disk space on VPS
- [ ] Verify all 4-5 channels still working
- [ ] Check owner is getting notifications correctly
- [ ] Verify no Julia-specific data leaked into the new client's DB

---

## Onboarding Time Estimate

| Phase | Time |
|---|---|
| Phase 1: Discovery (with client) | 30-60 min |
| Phase 2: External account setup | 1-2 hours |
| Phase 3: Infrastructure | 1 hour |
| Phase 4: Workflow deployment | 30 min |
| Phase 5: Webhook configuration | 30 min |
| Phase 6: Testing | 30-60 min |
| Phase 7: Client hand-off | 1 hour |
| Phase 8: Post-launch (per day) | 15-30 min |
| **TOTAL** | **5-7 hours** for first client, **2-3 hours** for subsequent clients (with templates) |

---

## Common pitfalls

### ❌ Don't forget to update the "Is Dion?" filter
The filter is hardcoded to phone `5148319058` and chat ID `6216258938`. If you don't update it for the new client, your tests will be hidden from the new owner BUT you'll get notifications from THEIR test messages.

**Fix:** Either remove the filter entirely for new clients, or replace with the new operator's testing phone.

### ❌ Don't forget the `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
This MUST be set to `false` or all the Code nodes that use `$env.TELEGRAM_BOT_TOKEN` etc. will fail with permission errors.

### ❌ Don't forget the Dockerfile pin
Use `FROM docker.n8n.io/n8nio/n8n:2.10.4` — newer n8n versions have different Execute Workflow output index behavior that breaks the existing flows.

### ❌ Don't share Postgres credentials across clients
If you put multiple clients on the same Postgres server, give each their own user with access to ONLY their own database. Otherwise a credential leak in one client compromises all of them.

### ❌ Don't reuse the Telegram credential ID from Julia
Julia's Telegram saved credential ID is `5uwoGp7iX1GQkMcu`. If you create a new credential in the new client's n8n UI, it'll have a different ID. You'll need to either:
- Update the workflow JSON to reference the new ID, OR
- Manually set the new credential's ID to `5uwoGp7iX1GQkMcu` via Postgres update (advanced)

### ❌ Don't forget to create the `settings` table
The `Get Owner Chat ID` node reads from `settings.telegram_owner_chat_id`. If this row doesn't exist, owner notifications will fail silently.

---

## Quick reference: env var checklist

Minimum env vars for a new client n8n instance:

```yaml
# CLIENT-SPECIFIC (set per client)
TELEGRAM_BOT_TOKEN=<from BotFather>
WHATSAPP_TOKEN=<Meta System User permanent token>
WHATSAPP_PHONE_NUMBER_ID=<Meta phone number ID>
TWILIO_ACCOUNT_SID=<Twilio>          # if SMS/voice
TWILIO_AUTH_TOKEN=<Twilio>           # if SMS/voice
TWILIO_FROM_NUMBER=+1XXXXXXXXXX      # client's Twilio number

# PER-INSTANCE (different for each n8n container)
N8N_HOST=n8n.<subdomain>.com
WEBHOOK_URL=https://n8n.<subdomain>.com/
DB_POSTGRESDB_DATABASE=<client>_n8n
DB_POSTGRESDB_PASSWORD=<random>

# REQUIRED CONFIG (don't forget these or things break)
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
NODE_FUNCTION_ALLOW_BUILTIN=fs,crypto,child_process
NODE_FUNCTION_ALLOW_EXTERNAL=pdf-lib
DB_TYPE=postgresdb

# SHARED (same across all clients)
ANTHROPIC_API_KEY=sk-ant-api03-...
GENERIC_TIMEZONE=America/Toronto    # or client's timezone
```

Minimum env vars for the dashboard:

```yaml
# DB (per client)
DB_HOST=quietly-postgres
DB_PORT=5432
DB_NAME=<client>_db
DB_USER=quietly
DB_PASSWORD=<password>

# Same secrets as n8n (for owner messaging)
TELEGRAM_BOT_TOKEN=<same as n8n>
WHATSAPP_TOKEN=<same as n8n>
WHATSAPP_PHONE_ID=<same as n8n WHATSAPP_PHONE_NUMBER_ID — note different name>
TWILIO_ACCOUNT_SID=<same as n8n>
TWILIO_AUTH_TOKEN=<same as n8n>
TWILIO_FROM=<same as n8n TWILIO_FROM_NUMBER — note different name>
TWILIO_FROM_NUMBER=<same as n8n>
ANTHROPIC_API_KEY=sk-ant-api03-...
ELEVENLABS_API_KEY=sk_...            # if using voice
DASHBOARD_PASSWORD=<random strong>

# Standard Next.js
NODE_ENV=production
```

---

## Future improvements

Things that would make onboarding faster:

1. **Onboarding script** — bash script that takes client name + tokens as args and provisions everything
2. **Workflow templating** — replace Julia-specific values via search/replace before import
3. **Dashboard self-service** — let new clients add their own credentials via the settings page
4. **Multi-tenant n8n** — single n8n instance with workflow-level tenant routing (big refactor)
5. **Vendor seed data UI** — bulk vendor import via dashboard
6. **Settings table seed UI** — fill in `telegram_owner_chat_id` etc. via dashboard form

---

**Status:** v1.0 — written 2026-04-08 after Julia PM credential refactor deployment to live.

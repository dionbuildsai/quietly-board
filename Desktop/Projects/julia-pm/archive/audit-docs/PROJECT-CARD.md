# Property Management — Project Card

> One page. Everything at a glance.

---

## Environments

|  | **Live** | **Dev** |
|---|---|---|
| **Server** | srv1285597.hstgr.cloud | srv1466948.hstgr.cloud |
| **Dashboard** | julia.srv1285597.hstgr.cloud | pm.srv1466948.hstgr.cloud |
| **n8n** | n8n.srv1285597.hstgr.cloud | n8n.srv1466948.hstgr.cloud |
| **Database** | quietly_db | pm_dev_db |
| **Container** | julia-dash | pm-dash |
| **Password** | quietly2024 | quietly2024 |

---

## Integrations

|  | **Live** | **Dev** |
|---|---|---|
| **Telegram Bot** | @DionPropertyManageBot | Create via @BotFather (TODO) |
| **WhatsApp Phone ID** | 971537566052793 | Test mode / disabled |
| **Twilio** | +14389009998 | Disabled |
| **Gmail** | dionfwang@gmail.com | Same (OAuth in n8n) |
| **ElevenLabs** | agent_6201km9s1231fdm8ajv5e55gyf8j | Disabled |
| **Claude AI** | Same API key | Same API key |

---

## GitHub Repos

| Repo | What |
|---|---|
| `dionbuildsai/quietly-dash` | Dashboard code (Next.js) |
| `dionbuildsai/quietly-board` | Workflow JSONs + docs |

---

## Key Docs

| File | Location | Purpose |
|---|---|---|
| **CLAUDE.md** | julia-pm/ | Full technical reference |
| **RUNBOOK.md** | quietly-dash/ | What to do when things break |
| **BULLETPROOF.md** | quietly-dash/ | Handoff checklist |
| **PROJECT-CARD.md** | julia-pm/ | This file |

---

## Deploy (Live)

```bash
# Dashboard
scp -r ~/Desktop/Projects/quietly-dash/* root@srv1285597.hstgr.cloud:/docker/quietly-dash/
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose build dashboard && docker compose up -d dashboard"

# Workflow
scp workflow.json root@srv1285597.hstgr.cloud:/tmp/
ssh root@srv1285597.hstgr.cloud 'docker cp /tmp/workflow.json $(docker ps --filter "name=n8n-n8n" -q):/tmp/ && cd /docker/n8n && docker compose exec -T n8n n8n import:workflow --input=/tmp/workflow.json && docker compose exec -T n8n n8n update:workflow --id=<ID> --active=true && docker compose restart n8n'
```

## Deploy (Dev)

```bash
# Dashboard
scp -r ~/Desktop/Projects/quietly-dash/* root@srv1466948.hstgr.cloud:/docker/projects/pm/
ssh root@srv1466948.hstgr.cloud "cd /docker/projects/pm && docker compose up -d --build"
```

---

## Webhook Endpoints (Live)

| Path | Method | Workflow |
|---|---|---|
| `/webhook/sms-intake` | POST | Intake Channel Router |
| `/webhook/whatsapp-intake` | GET/POST | WhatsApp Meta |
| `/webhook/wa-intake` | POST | Intake Channel Router |
| `/webhook/owner-message` | POST | Owner Message Sender |
| `/webhook/get-status` | POST | Voice Agent |
| `/webhook/log-maintenance` | POST | Voice Agent |
| `/webhook/post-call-log` | POST | Voice Agent |
| `/webhook/run-sql` | POST | Ticket Management |

---

## Notifications

| Type | Goes to |
|---|---|
| New ticket | `telegram_owner_chat_id` in settings (currently Dion) |
| Urgent ticket | Same + dispatch buttons |
| Errors | `error_notification_chat_id` (always Dion, hardcoded) |

---

## Dev Setup TODO

- [ ] Create dev Telegram bot via @BotFather → update `DEV_BOT_TOKEN_REPLACE_ME` in dev compose + settings
- [ ] Dev n8n workflows should NOT have live webhook triggers active

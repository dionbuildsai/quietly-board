# Julia Inc — Onboarding Runbook
**Date:** March 29, 2026
**System:** Property Management AI Automation
**Status:** LIVE since March 27, 2026

---

## 1. System Overview (5 min)

Walk through the big picture: tenants message in → AI handles it → landlord gets notified.

**Channels available:**
| Channel | How Tenants Reach You |
|---------|----------------------|
| Telegram | Message the bot directly |
| Email | Send to your Gmail |
| SMS | Text 438-900-9998 |
| WhatsApp | Message via WhatsApp Business |
| Phone | Call 438-900-9998 (voice agent) |

**What happens when a tenant messages:**
1. System identifies the tenant (by phone, email, or Telegram ID)
2. AI (Claude Sonnet 4) responds — asks clarifying questions, suggests self-help
3. A ticket is automatically created
4. If a repair video matches, it's suggested to the tenant
5. You get a Telegram notification with ticket details
6. If urgent (confirmed by tenant), you get dispatch buttons

---

## 2. Dashboard Walkthrough (10 min)

**URL:** `https://dash.srv1285597.hstgr.cloud`

### Pages to demo:
- **Dashboard** — Overview stats, recent tickets, category breakdown, time-saved banner
- **Inbox** — Unread ticket notifications (swipe/click to dismiss)
- **Tickets** — Full list with filters (property → tenant), sortable columns, click any row for details
- **Ticket Detail** — Chat-style message thread showing full conversation. For phone calls: audio recording player instead of chat
- **Tenants** — Add/edit/remove tenants (name, phone, email, unit, property)
- **Vendors** — Add/edit/remove vendors (name, email, phone, category)
- **Properties** — Add/edit properties
- **AI Chat** — Bottom-left floating widget, ask natural language questions about your data

### Key features to highlight:
- **Bot Pause/Resume:** On any ticket detail page, click the toggle to pause the AI bot. You can then type messages directly to the tenant. Bot auto-resumes when you leave the page.
- **Owner Messaging:** When bot is paused, a text input appears. Type and send — message goes to tenant via whatever channel they used (Telegram, SMS, WhatsApp, Email).
- **Auto-refresh:** Dashboard updates every 30 seconds automatically.
- **Notification badge:** Sidebar shows unread count, updates every 15 seconds.

---

## 3. Live Demo — Send a Test Message (10 min)

### Demo via Telegram (easiest):
1. Open Telegram on your phone
2. Send a message to the bot: *"Hi, my kitchen faucet is dripping"*
3. Watch the AI respond (asks clarifying questions)
4. Show the Telegram notification you receive as landlord
5. Open the dashboard → show the new ticket in Tickets page
6. Click into the ticket → show the conversation thread
7. Toggle bot pause → send an owner message → toggle back

### Demo via Phone (voice agent):
1. Call **438-900-9998** from a registered tenant's phone
2. Voice agent picks up, looks up tenant by caller ID
3. Describe an issue — agent creates a ticket
4. Show the call recording on the dashboard ticket detail page

### Demo via WhatsApp:
1. Send a WhatsApp message to the business number
2. Show AI response + video suggestion (if matched)
3. Show the "Did this video help?" buttons

---

## 4. How the AI Works (5 min)

**Key behaviors to explain:**
- **Language matching:** AI detects tenant's language and responds in kind (English/French)
- **3-exchange limit:** AI asks max 3 rounds of questions per issue, then wraps up
- **Self-help first:** AI suggests tenant try fixing it themselves (e.g., plunger for drain). This saves you money and reduces liability.
- **Never promises a visit:** AI says "we'll assess next steps" — never "we'll send someone"
- **Urgency rules:** First message is NEVER marked urgent. Only after tenant confirms real danger on follow-up.
- **Emergency protocol:** AI never tells tenant to leave/vacate — that's the landlord's decision. Says "your safety is the priority, team is being notified."

---

## 5. Ticket Lifecycle (5 min)

```
Tenant messages in
    ↓
Ticket created (status: open)
    ↓
AI converses (max 3 exchanges)
    ↓
Video suggested? → Tenant says "Yes it helped" → Ticket resolved
    ↓
Tenant says issue is fixed → "Is your problem resolved?" Yes/No buttons
    ↓
Landlord dispatches vendor (urgent tickets get dispatch buttons)
    ↓
Ticket closed
```

**Ticket categories:** plumbing, electrical, hvac, appliance, pest_control, locksmith, general_maintenance, lease_admin, parking, general_inquiry

**Urgency levels:**
- `not_urgent` — default for all first messages
- `urgent` — only after tenant confirms real danger (2nd+ message)
- `info_request` — non-maintenance questions

---

## 6. Vendor Dispatch (5 min)

When you receive an **urgent ticket** notification on Telegram:
1. You see two buttons: **Auto Dispatch** and **Show Contractors**
2. **Auto Dispatch** → system looks up the best vendor for the category → AI drafts a message → shows you a preview → you confirm → vendor gets emailed
3. **Show Contractors** → shows you the vendor list for that category so you can choose manually

**Setup required:** Make sure vendors are added in the dashboard (Vendors page) with correct categories.

---

## 7. Managing Tenants (5 min)

### Adding a new tenant:
1. Go to **Tenants** page on dashboard
2. Click **Add Tenant**
3. Fill in: name, phone (with country code), email, unit number, select property
4. For Telegram: tenant must message the bot first — their `telegram_id` gets captured automatically
5. For WhatsApp: use their WhatsApp phone number

### Important:
- Phone numbers should include country code (e.g., `15145551234`)
- Each tenant is linked to a property
- The system uses phone/email/telegram_id to identify returning tenants

---

## 8. Media Handling (3 min)

- Tenants can send **photos** via Telegram or WhatsApp
- System prompts: "Which ticket is this photo for?" with buttons showing open tickets
- Tenant selects → photo saved and attached to that ticket
- Photos visible on the ticket detail page in the dashboard

---

## 9. What You Need to Monitor (3 min)

**Daily checks:**
- Glance at the **Inbox** for any unread tickets
- Check **Dashboard** stats for new tickets

**Things to watch for:**
- If a tenant says they got no reply → AI might have failed (check n8n executions)
- WhatsApp creates ~3 empty status update executions per message — this is normal, ignore them

**If something breaks:**
- Contact Dion — system admin access is via SSH to the server
- n8n admin panel: `https://n8n.srv1285597.hstgr.cloud`

---

## 10. Quick Reference Card

| What | Where |
|------|-------|
| Dashboard | `https://dash.srv1285597.hstgr.cloud` |
| Emergency line | 438-900-9998 |
| Tenant bot (Telegram) | Search for the bot in Telegram |
| WhatsApp Business | Connected to 438-900-9998 |
| n8n (admin only) | `https://n8n.srv1285597.hstgr.cloud` |
| NocoDB (admin only) | `https://nocodb.srv1285597.hstgr.cloud` |

---

## Onboarding Checklist

- [ ] Julia has Telegram installed and can see bot notifications
- [ ] Julia can access the dashboard URL
- [ ] Test tenant exists in DB (can send a live test message)
- [ ] Vendors are populated for key categories (plumbing, electrical, hvac, locksmith)
- [ ] Julia understands bot pause/resume for manual intervention
- [ ] Julia knows how to add new tenants
- [ ] Julia knows the emergency protocol (AI behavior on urgent issues)
- [ ] Julia has Dion's contact for support issues

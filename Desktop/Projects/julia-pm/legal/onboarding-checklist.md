# CLIENT ONBOARDING CHECKLIST

**Quietly Systems Inc. — Internal Document**

---

## Pre-Signing

- [ ] Confirm client's legal entity name and incorporation (NEQ/registry search)
- [ ] Confirm contact person, email, phone
- [ ] Confirm number of properties, units, and tenants
- [ ] Confirm communication channels client uses (Telegram, WhatsApp, SMS, Email, Phone)
- [ ] Determine monthly retainer amount
- [ ] Fill in Service Agreement template with client details and pricing
- [ ] Generate Privacy Policy PDF with client's business name and contact info
- [ ] Prepare invoice template with GST/QST registration numbers

## At Signing

- [ ] Both parties sign Service Agreement (2 copies or digital signatures)
- [ ] Client initials AI Disclaimer (Section 3) — mandatory
- [ ] Client designates Privacy Officer (default: CEO/owner) — verbal confirmation sufficient
- [ ] Provide client with Tenant Privacy Policy PDF (client keeps on file, available on request)
- [ ] Discuss emergency fallback: "If the dashboard is ever unreachable, tenants should reach you directly at [client's phone number]"
- [ ] Discuss AI limitations: "The bot may get things wrong — always check urgent tickets yourself"
- [ ] Confirm first invoice date and payment method

## Post-Signing — Platform Setup

- [ ] Provision VPS / container for client (or add to existing infrastructure)
- [ ] Configure environment variables (Telegram bot, WhatsApp, Twilio, Gmail OAuth, Anthropic, ElevenLabs)
- [ ] Import tenant data (name, phone, email, unit, property, language preference)
- [ ] Import property data (address, unit count)
- [ ] Configure notification routing (owner Telegram chat ID, "Is [Test Account]?" filter)
- [ ] Set up voice agent (ElevenLabs): phone number, agent config, PM_get_status tool
- [ ] Send test message on each active channel (Telegram, WhatsApp, SMS, Email, Phone)
- [ ] Verify all channels: tenant lookup works, AI responds, ticket created, notification delivered
- [ ] Walk client through dashboard: tickets, inbox, properties, tenants, vendors, settings
- [ ] Enable auto-refresh and notification badge
- [ ] Confirm dashboard basic auth credentials shared with client

## Post-Signing — Records

- [ ] File signed Service Agreement (digital copy in `legal/clients/[client-name]/`)
- [ ] File Privacy Policy PDF provided to client
- [ ] Update CLAUDE.md with new client details (if applicable)
- [ ] Add client to internal client tracking (spreadsheet, Notion, or DB)
- [ ] Set calendar reminder: 30-day check-in with client
- [ ] Set calendar reminder: annual privacy policy review
- [ ] Set calendar reminder: annual Incident Response Plan review

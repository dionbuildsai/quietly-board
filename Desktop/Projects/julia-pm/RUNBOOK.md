# Julia PM — Operations Runbook

> Internal reference for Dion and Claude Code sessions. For system architecture, see `CLAUDE.md`.

---

## 1. System Health Check

### Quick check (30 seconds)
```bash
# Dashboard loads?
curl -s -o /dev/null -w "%{http_code}" https://julia.srv1285597.hstgr.cloud
# Should return 401 (auth required) — means it's up

# n8n loads?
curl -s -o /dev/null -w "%{http_code}" https://n8n.srv1285597.hstgr.cloud
# Should return 200 or 302

# All containers running?
ssh root@srv1285597.hstgr.cloud "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'n8n|julia|postgres|traefik'"
```

### Verify all 8 workflows are active
```bash
ssh root@srv1285597.hstgr.cloud 'docker exec -i $(docker ps --filter "name=postgres" -q) psql -U quietly -d n8n' << 'SQL'
SELECT name, active FROM workflow_entity
WHERE name LIKE '[%' OR name LIKE 'Voice%'
ORDER BY name;
SQL
```
All should show `active: true`.

### Check for recent execution failures
Open `https://n8n.srv1285597.hstgr.cloud` → Executions → filter by "Error".

---

## 2. Restart Procedures

### Single service restart
```bash
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose restart n8n"        # n8n only
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose restart dashboard"   # dashboard only
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose restart postgres"    # database only
```

### Full stack restart
```bash
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose down && docker compose up -d"
```

### After any n8n restart
- Telegram webhook may need re-registration: go to n8n UI → Intake Channel Router → deactivate → reactivate
- Verify a test message gets through after restart

---

## 3. Deployment Procedures

### CRITICAL: Zero-error deployment policy
This system is LIVE with a real client. Every deploy must be verified before shipping. Never deploy untested code.

### Deploy dashboard changes
```bash
# 1. Make changes locally in ~/Desktop/Projects/quietly-dash/

# 2. Test locally (optional, only works for UI-only changes)
cd ~/Desktop/Projects/quietly-dash && npm run dev

# 3. Deploy (~30 seconds, dashboard briefly restarts)
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  ~/Desktop/Projects/quietly-dash/ root@srv1285597.hstgr.cloud:/docker/quietly-dash/ \
&& ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose build dashboard && docker compose up -d dashboard"

# 4. Verify dashboard loads
curl -s -o /dev/null -w "%{http_code}" https://julia.srv1285597.hstgr.cloud

# 5. Commit and push
cd ~/Desktop/Projects/quietly-dash && git add -A && git commit -m "description" && git push origin main
```

### Deploy n8n workflow changes
```bash
# 1. Backup current workflow from live n8n
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose exec -T n8n n8n export:workflow --id=WORKFLOW_ID" > /tmp/backup_$(date +%s).json

# 2. Copy updated JSON to server and into n8n container
scp workflows/FILENAME.json root@srv1285597.hstgr.cloud:/tmp/wf_update.json
ssh root@srv1285597.hstgr.cloud "docker cp /tmp/wf_update.json \$(docker ps --filter 'name=n8n-n8n' -q):/tmp/wf_update.json"

# 3. Import + activate + restart
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose exec -T n8n n8n import:workflow --input=/tmp/wf_update.json"
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose exec -T n8n n8n update:workflow --id=WORKFLOW_ID --active=true"
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose restart n8n"

# 4. Verify by sending a test message
```

### Database migrations
```bash
# Always test SQL on dev first. Run on production:
ssh root@srv1285597.hstgr.cloud 'docker exec -i $(docker ps --filter "name=postgres" -q) psql -U quietly -d quietly_db' << 'SQL'
-- Your SQL here
SQL
```

**IMPORTANT:** n8n Postgres node only runs the FIRST SQL statement. Multi-statement queries silently ignore everything after the first `;`. Split into separate executions.

---

## 4. Common Fixes

### Tenant not recognized (no bot reply)
1. Check phone format: `SELECT phone FROM tenants WHERE name ILIKE '%tenant_name%';`
2. Must have country code (e.g., `15145551234` not `5145551234`)
3. Fix: `UPDATE tenants SET phone = '1' || phone WHERE id = 'TENANT_ID';`

### Bot not responding on any channel
1. Check n8n is running: `docker ps | grep n8n`
2. Check Intake Channel Router is active in n8n UI
3. Check Claude API — if down, tenants get no AI reply but messages are still logged
4. Check execution logs for errors

### Telegram notifications not arriving
1. Check owner chat ID:
```sql
SELECT value FROM settings WHERE key = 'telegram_owner_chat_id';
```
2. Should match Julia's ID: `6274604148`
3. If wrong, update via Dashboard → Settings (requires Telegram verification)

### WhatsApp messages not showing in ticket conversation
1. Likely cross-channel linking issue
2. Check `Link Ongoing Messages` node has `AND channel = ...` filter
3. Check message is linked to correct ticket:
```sql
SELECT ticket_id, channel, LEFT(message_text, 50) FROM messages
WHERE chat_id = 'PHONE' ORDER BY created_at DESC LIMIT 5;
```

### n8n running old workflow code
1. Check `workflow_published_version` table:
```sql
SELECT workflow_id, created_at FROM workflow_published_version
WHERE workflow_id = 'WORKFLOW_ID' ORDER BY created_at DESC;
```
2. Delete stale entries if needed
3. Restart n8n: `docker compose restart n8n`

### Orphaned messages accumulating
```sql
-- Check count
SELECT COUNT(*) FROM messages WHERE ticket_id IS NULL;
-- Clean up
DELETE FROM messages WHERE ticket_id IS NULL;
```

---

## 5. Database Operations

### Connect to database
```bash
ssh root@srv1285597.hstgr.cloud 'docker exec -it $(docker ps --filter "name=postgres" -q) psql -U quietly -d quietly_db'
```

### Useful queries
```sql
-- All open tickets
SELECT ticket_id, tenant_name, category, channel, status FROM maintenance_requests
WHERE status NOT IN ('closed', 'resolved') ORDER BY created_at DESC;

-- Tenant by phone
SELECT * FROM tenants WHERE phone LIKE '%5551234%';

-- Recent messages for a ticket
SELECT sender, channel, LEFT(message_text, 60), created_at FROM messages
WHERE ticket_id = 'TK-XXXXX' ORDER BY created_at ASC;

-- Tenant count by property
SELECT p.name, COUNT(t.id) FROM tenants t
JOIN properties p ON t.property_id = p.id GROUP BY p.name;

-- Vendor list by category
SELECT category, vendor_name, email, phone FROM vendors ORDER BY category;
```

### Export database
```bash
ssh root@srv1285597.hstgr.cloud 'docker exec -i $(docker ps --filter "name=postgres" -q) pg_dump -U quietly quietly_db' > backup_$(date +%Y%m%d).sql
```

### Restore database
```bash
cat backup_file.sql | ssh root@srv1285597.hstgr.cloud 'docker exec -i $(docker ps --filter "name=postgres" -q) psql -U quietly -d quietly_db'
```

---

## 6. Client Management

### Change dashboard password
```bash
# 1. SSH into server
ssh root@srv1285597.hstgr.cloud

# 2. Edit the password
nano /docker/quietly-dash/.env.local
# Change DASHBOARD_PASSWORD=newpassword

# 3. Rebuild dashboard
cd /docker/n8n && docker compose build dashboard && docker compose up -d dashboard
```

### Change owner notification recipient
1. Julia goes to Dashboard → Settings → Telegram
2. Enters new Chat ID → clicks Save
3. Receives 6-digit verification code on Telegram
4. Enters code → Confirm
5. All notifications now go to new chat ID

### Add tenant via SQL (bulk)
```sql
INSERT INTO tenants (name, phone, email, unit_number, property_id, language_pref)
VALUES ('First Last', '15145551234', 'email@example.com', '203', 'PROPERTY_UUID', 'en');
```

---

## 7. Monitoring

### Error notifications
- **Error workflow:** `ZK5jzQ8cMlLiMdeZ`
- **Sends to:** Dion's Telegram (`6216258938`)
- **Assigned to:** All 8 workflows
- **Separate from** owner notifications — Dion always gets errors regardless of who the owner is

### What triggers error notifications
- Any workflow execution failure (API timeout, DB error, node crash)
- Does NOT trigger on: empty WhatsApp status executions, normal "no match" flows

### n8n execution logs
- URL: `https://n8n.srv1285597.hstgr.cloud` → Executions
- Filter by: Error, date range, workflow name
- Each execution shows full node-by-node trace

---

## 8. Emergency Procedures

### System completely down
```bash
# 1. Check SSH access
ssh root@srv1285597.hstgr.cloud "uptime"

# 2. Check Docker
ssh root@srv1285597.hstgr.cloud "docker ps"

# 3. If containers are down, restart everything
ssh root@srv1285597.hstgr.cloud "cd /docker/n8n && docker compose up -d"

# 4. If Docker daemon is down
ssh root@srv1285597.hstgr.cloud "systemctl restart docker && cd /docker/n8n && docker compose up -d"
```

### Claude API outage
- Tenants will NOT get AI replies
- Messages are still logged in the database
- Tickets may not be created (depends on where the failure occurs)
- **Action:** Monitor Anthropic status page. Bot resumes automatically when API recovers.

### Telegram bot unresponsive
1. Go to n8n UI → Intake Channel Router
2. Deactivate the workflow
3. Wait 5 seconds
4. Reactivate the workflow
5. This re-registers the Telegram webhook

### Database full / disk space
```bash
ssh root@srv1285597.hstgr.cloud "df -h"
# If disk is full:
# - Clean Docker images: docker image prune -a
# - Clean n8n execution data: DELETE FROM execution_entity WHERE "stoppedAt" < NOW() - INTERVAL '30 days';
```

---

## 9. Key Reference

| Item | Value |
|------|-------|
| **Production server** | srv1285597.hstgr.cloud (76.13.96.3) |
| **Dev server** | srv1466948.hstgr.cloud (187.124.92.11) — not yet set up |
| **SSH** | `ssh root@srv1285597.hstgr.cloud` |
| **Dashboard** | julia.srv1285597.hstgr.cloud |
| **n8n** | n8n.srv1285597.hstgr.cloud |
| **Database** | quietly_db (PostgreSQL 16) |
| **GitHub (workflows)** | dionbuildsai/quietly-board |
| **GitHub (dashboard)** | dionbuildsai/quietly-dash |
| **Tenant phone** | +1 438-900-9998 |
| **Telegram bot** | @dion_property_manager_bot (display name: "Property Management") |
| **Owner chat ID** | Julia: 6274604148 |
| **Error notifications** | Dion: 6216258938 |
| **Error workflow ID** | ZK5jzQ8cMlLiMdeZ |
| **ElevenLabs Agent** | agent_6201km9s1231fdm8ajv5e55gyf8j |

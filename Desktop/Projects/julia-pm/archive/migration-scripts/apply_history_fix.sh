#!/usr/bin/env python3
# Run this on the server via:  python3 apply_history_fix.py

import subprocess, json, sys

WORKFLOW_ID  = "5WW7m5IiqvJoHWZ1"
NODE_NAME    = "Get Conversation History"
DB_USER      = "quietly"
DB_NAME      = "n8n"
CONTAINER    = "quietly-postgres"
VERSION_ID   = "f231375b-3f18-41e9-86b0-c74d9e363c70"

NEW_QUERY = (
    "SELECT sender, message_text, channel, created_at FROM messages\n"
    "WHERE chat_id = '{{ $json.chat_id }}'\n"
    "AND (\n"
    "  ticket_id IN (\n"
    "    SELECT ticket_id FROM maintenance_requests\n"
    "    WHERE status NOT IN ('closed', 'resolved')\n"
    "    AND ticket_id IS NOT NULL\n"
    "  )\n"
    "  OR (ticket_id IS NULL AND created_at > NOW() - INTERVAL '4 hours')\n"
    ")\n"
    "ORDER BY created_at DESC LIMIT 20"
)

def psql(sql):
    r = subprocess.run(
        ["docker", "exec", CONTAINER, "psql", "-U", DB_USER, "-d", DB_NAME,
         "-t", "-A", "-c", sql],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print("PSQL ERROR:", r.stderr, file=sys.stderr)
        sys.exit(1)
    return r.stdout.strip()

def patch_nodes(nodes_str):
    nodes = json.loads(nodes_str)
    for node in nodes:
        if node.get("name") == NODE_NAME:
            node["parameters"]["query"] = NEW_QUERY
            print(f"  ✓ Patched node: {NODE_NAME}")
            return json.dumps(nodes)
    raise ValueError(f"Node {NODE_NAME!r} not found!")

# ── workflow_entity ──────────────────────────────────────────────────────────
print("Fetching nodes from workflow_entity...")
raw = psql(f"SELECT nodes FROM workflow_entity WHERE id = '{WORKFLOW_ID}'")
new_nodes = patch_nodes(raw)

# Escape single quotes for SQL
escaped = new_nodes.replace("'", "''")
psql(f"UPDATE workflow_entity SET nodes = '{escaped}' WHERE id = '{WORKFLOW_ID}'")
print("  ✓ workflow_entity updated")

# ── workflow_history ─────────────────────────────────────────────────────────
print("Fetching nodes from workflow_history...")
raw2 = psql(f'SELECT nodes FROM workflow_history WHERE "versionId" = \'{VERSION_ID}\'')
new_nodes2 = patch_nodes(raw2)

escaped2 = new_nodes2.replace("'", "''")
psql(f"UPDATE workflow_history SET nodes = '{escaped2}' WHERE \"versionId\" = '{VERSION_ID}'")
print("  ✓ workflow_history updated")

print("\nDone. Restarting n8n...")
r = subprocess.run(["docker", "restart", "n8n-n8n-1"], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
print("✓ n8n restarted.")

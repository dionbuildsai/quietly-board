#!/usr/bin/env python3
import psycopg2, json, sys

WORKFLOW_ID = "5WW7m5IiqvJoHWZ1"
NODE_NAME   = "Get Conversation History"
NEW_QUERY   = """SELECT sender, message_text, channel, created_at FROM messages
WHERE chat_id = '{{ $json.chat_id }}'
AND (
  ticket_id IN (
    SELECT ticket_id FROM maintenance_requests
    WHERE status NOT IN ('closed', 'resolved')
    AND ticket_id IS NOT NULL
  )
  OR (ticket_id IS NULL AND created_at > NOW() - INTERVAL '4 hours')
)
ORDER BY created_at DESC LIMIT 20"""

# Connect using the n8n DB env (same creds as before)
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="n8n",
    user="n8n",
    password="n8n"
)
cur = conn.cursor()

def patch_nodes(nodes_json):
    nodes = json.loads(nodes_json)
    patched = False
    for node in nodes:
        if node.get("name") == NODE_NAME:
            node["parameters"]["query"] = NEW_QUERY
            patched = True
    if not patched:
        raise ValueError(f"Node {NODE_NAME!r} not found")
    return json.dumps(nodes)

# --- workflow_entity ---
cur.execute("SELECT nodes FROM workflow_entity WHERE id = %s", (WORKFLOW_ID,))
row = cur.fetchone()
if not row:
    print("ERROR: workflow not found in workflow_entity", file=sys.stderr)
    sys.exit(1)
new_nodes = patch_nodes(row[0])
cur.execute("UPDATE workflow_entity SET nodes = %s WHERE id = %s", (new_nodes, WORKFLOW_ID))
print("✓ Updated workflow_entity")

# --- workflow_history (latest version) ---
cur.execute(
    "SELECT version_id, nodes FROM workflow_history WHERE workflow_id = %s ORDER BY created_at DESC LIMIT 1",
    (WORKFLOW_ID,)
)
row = cur.fetchone()
if row:
    version_id, nodes_json = row
    new_nodes = patch_nodes(nodes_json)
    cur.execute("UPDATE workflow_history SET nodes = %s WHERE version_id = %s", (new_nodes, version_id))
    print(f"✓ Updated workflow_history (version_id={version_id})")
else:
    print("WARNING: no workflow_history row found — only workflow_entity was updated")

conn.commit()
cur.close()
conn.close()
print("Done — restart n8n to apply changes.")

#!/usr/bin/env python3
"""
Migrates the Tenant Message Handler workflow from Google Sheets to PostgreSQL.
- READ nodes: Google Sheets -> PostgreSQL SELECT queries
- WRITE nodes: Adds PostgreSQL INSERT/UPDATE BEFORE the existing Sheets node (PG first, Sheets mirror)

Expressions are copied exactly from the original Google Sheets nodes to ensure
correct data references (using $('NodeName').item.json.field instead of $json.field).
"""

import json
import copy
import uuid

INPUT_FILE = "Property Management - Tenant Message Handler (11).json"
OUTPUT_FILE = "Property Management - Tenant Message Handler (MIGRATED).json"

PG_CREDENTIAL = {
    "postgres": {
        "id": "JlETYTnhAwFrsmL9",
        "name": "Quietly DB"
    }
}

def make_pg_read_node(original_node, query, name_suffix=""):
    """Convert a Google Sheets READ node to a PostgreSQL SELECT node."""
    node = copy.deepcopy(original_node)
    node["type"] = "n8n-nodes-base.postgres"
    node["typeVersion"] = 2.6
    node["credentials"] = copy.deepcopy(PG_CREDENTIAL)
    node["parameters"] = {
        "operation": "executeQuery",
        "query": query,
        "options": {}
    }
    if "alwaysOutputData" in original_node:
        node["alwaysOutputData"] = original_node["alwaysOutputData"]
    return node


def make_pg_write_node(name, node_id, position, query):
    """Create a NEW PostgreSQL write node (INSERT or UPDATE)."""
    return {
        "parameters": {
            "operation": "executeQuery",
            "query": query,
            "options": {}
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.6,
        "position": [position[0] - 250, position[1]],  # Place slightly to the left
        "credentials": copy.deepcopy(PG_CREDENTIAL)
    }


def gen_id():
    return str(uuid.uuid4())


# ---- READ NODE TRANSFORMATIONS ----
# Maps node name -> SQL query
# Tenant lookups use JOIN with properties for address; aliases match Google Sheets column names
# Maintenance_requests use COALESCE for cross-source compatibility (voice agent vs handler columns)

READ_TRANSFORMS = {
    # --- TENANT LOOKUPS ---
    "Get Tenant Information (email)":
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", t.unit_number AS \"Unit\", t.email AS \"Email\", p.address AS \"Property\", t.emergency_contact AS \"Emergency Contact\", t.notes AS \"Notes\", t.status AS \"Status\", t.telegram_id AS \"Telegram\" FROM tenants t LEFT JOIN properties p ON t.property_id = p.id WHERE t.email = '{{ $json.From }}'",

    "Get Tenant Information (text)":
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", t.unit_number AS \"Unit\", t.email AS \"Email\", p.address AS \"Property\", t.emergency_contact AS \"Emergency Contact\", t.notes AS \"Notes\", t.status AS \"Status\", t.telegram_id AS \"Telegram\" FROM tenants t LEFT JOIN properties p ON t.property_id = p.id WHERE t.phone LIKE '%' || '{{ $json.phone.slice(-10) }}' || '%'",

    "Get Tenant Info":
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", t.unit_number AS \"Unit\", t.email AS \"Email\", p.address AS \"Property\", t.emergency_contact AS \"Emergency Contact\", t.notes AS \"Notes\", t.status AS \"Status\", t.telegram_id AS \"Telegram\" FROM tenants t LEFT JOIN properties p ON t.property_id = p.id WHERE t.telegram_id = '{{ $json.chat_id }}'",

    "Get Tenant Information (text)1":
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", t.unit_number AS \"Unit\", t.email AS \"Email\", p.address AS \"Property\", t.emergency_contact AS \"Emergency Contact\", t.notes AS \"Notes\", t.status AS \"Status\", t.telegram_id AS \"Telegram\" FROM tenants t LEFT JOIN properties p ON t.property_id = p.id WHERE t.phone = '{{ $json.phone }}'",

    "Get Tenant Info1":
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", t.unit_number AS \"Unit\", t.email AS \"Email\", p.address AS \"Property\", t.emergency_contact AS \"Emergency Contact\", t.notes AS \"Notes\", t.status AS \"Status\", t.telegram_id AS \"Telegram\" FROM tenants t LEFT JOIN properties p ON t.property_id = p.id WHERE t.telegram_id = '{{ $json.chat_id }}'",

    "Get Tenant Info2":
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", t.unit_number AS \"Unit\", t.email AS \"Email\", p.address AS \"Property\", t.emergency_contact AS \"Emergency Contact\", t.notes AS \"Notes\", t.status AS \"Status\", t.telegram_id AS \"Telegram\" FROM tenants t LEFT JOIN properties p ON t.property_id = p.id WHERE t.telegram_id = '{{ $json.chat_id }}'",

    "Get row(s) in sheet":
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", t.unit_number AS \"Unit\", t.email AS \"Email\", p.address AS \"Property\", t.emergency_contact AS \"Emergency Contact\", t.notes AS \"Notes\", t.status AS \"Status\", t.telegram_id AS \"Telegram\" FROM tenants t LEFT JOIN properties p ON t.property_id = p.id WHERE t.telegram_id = '{{ $json.chat_id }}'",

    # --- VENDOR LOOKUPS ---
    "Lookup Vendor":
        "SELECT *, vendor_name AS \"Vendor Name\", email AS \"Email\", phone AS \"Phone\" FROM vendors WHERE category = '{{ $json.output.category }}'",

    "Lookup Vendors":
        "SELECT *, vendor_name AS \"Vendor Name\", email AS \"Email\", phone AS \"Phone\" FROM vendors WHERE category = '{{ $json.category }}'",

    # --- TICKET LOOKUPS ---
    # Uses COALESCE for columns that differ between voice agent (tenant_phone, unit_number, etc.)
    # and tenant handler (phone, unit, etc.) records
    "Get all tenant tickets":
        "SELECT id, ticket_id, tenant_name, COALESCE(phone, tenant_phone) AS phone, COALESCE(unit, unit_number) AS unit, property, COALESCE(telegram_id, telegram_chat_id) AS telegram, COALESCE(media, media_url) AS media, channel, type, category, summary, status, keywords, tenant_message, created_at, updated_at FROM maintenance_requests WHERE (tenant_phone = '{{ $json.Phone }}' OR phone = '{{ $json.Phone }}') AND status NOT IN ('closed') ORDER BY created_at DESC",

    "Get all tenant tickets1":
        "SELECT id, ticket_id, tenant_name, COALESCE(phone, tenant_phone) AS phone, COALESCE(unit, unit_number) AS unit, property, COALESCE(telegram_id, telegram_chat_id) AS telegram, COALESCE(media, media_url) AS media, channel, type, category, summary, status, keywords, tenant_message, created_at, updated_at FROM maintenance_requests WHERE (tenant_phone = '{{ $json.Phone }}' OR phone = '{{ $json.Phone }}') AND status NOT IN ('closed') ORDER BY created_at DESC",

    "Lookup Ticket":
        "SELECT id, ticket_id, tenant_name, COALESCE(phone, tenant_phone) AS phone, COALESCE(unit, unit_number) AS unit, property, COALESCE(telegram_id, telegram_chat_id) AS telegram, COALESCE(media, media_url) AS media, channel, type, category, summary, status, keywords, tenant_message, created_at, updated_at FROM maintenance_requests WHERE ticket_id = '{{ $(\"Set Telegram Data\").item.json.data.split(\"||\")[1] }}'",

    "Lookup Ticket2":
        "SELECT id, ticket_id, tenant_name, COALESCE(phone, tenant_phone) AS phone, COALESCE(unit, unit_number) AS unit, property, COALESCE(telegram_id, telegram_chat_id) AS telegram, COALESCE(media, media_url) AS media, channel, type, category, summary, status, keywords, tenant_message, created_at, updated_at FROM maintenance_requests WHERE ticket_id = '{{ $json.ticket_id }}'",

    "Get Ticket Info1":
        "SELECT id, ticket_id, tenant_name, COALESCE(phone, tenant_phone) AS phone, COALESCE(unit, unit_number) AS unit, property, COALESCE(telegram_id, telegram_chat_id) AS telegram, COALESCE(media, media_url) AS media, channel, type, category, summary, status, keywords, tenant_message, created_at, updated_at FROM maintenance_requests WHERE ticket_id = '{{ $json.ticket_id }}'",

    "Get row(s) in sheet1":
        "SELECT id, ticket_id, tenant_name, COALESCE(phone, tenant_phone) AS phone, COALESCE(unit, unit_number) AS unit, property, COALESCE(telegram_id, telegram_chat_id) AS telegram, COALESCE(media, media_url) AS media, channel, type, category, summary, status, keywords, tenant_message, created_at, updated_at FROM maintenance_requests WHERE ticket_id = '{{ $json.ticket_id }}'",

    # --- MESSAGE LOOKUPS ---
    "Get all messages":
        "SELECT * FROM messages WHERE chat_id = '{{ $json.chat_id }}' ORDER BY created_at DESC",
}


# ---- WRITE NODE TRANSFORMATIONS ----
# Maps node name -> (new PG node name, SQL query)
# Expressions are copied EXACTLY from the original Google Sheets nodes.
# These INSERT a PG node BEFORE the Sheets node. The Sheets node stays as a mirror.

WRITE_TRANSFORMS = {
    # --- TICKET INSERTS (maintenance_requests) ---
    # Original "Log Ticket" Sheets columns.value:
    #   ticket_id: 'TK-' + $now..., tenant_name: $('First Time?')..., phone: $('First Time?')...
    #   type: $('Classify Urgency')..., keywords: $json.output.keyword, telegram: $('Set Telegram Data')...
    "Log Ticket": (
        "PG: Log Ticket",
        "INSERT INTO maintenance_requests (ticket_id, tenant_name, phone, property, unit, channel, type, category, summary, status, keywords, tenant_message, telegram_id, created_at, updated_at) VALUES ("
        "'{{ 'TK-' + $now.setZone('America/New_York').format('MMddHHmmss') }}', "
        "'{{ $('First Time?').item.json['Tenant Name'] }}', "
        "'{{ $('First Time?').item.json.Phone }}', "
        "'{{ $('First Time?').item.json.Property }}', "
        "'{{ $('First Time?').item.json.Unit }}', "
        "'telegram', "
        "'{{ $('Classify Urgency').item.json.output.urgency }}', "
        "'{{ $('Classify Urgency').item.json.output.category }}', "
        "'{{ $('Classify Urgency').item.json.output.summary }}', "
        "'wait_for_approval', "
        "'{{ $json.output.keyword }}', "
        "'{{ $('Set Telegram Data').item.json.message_text }}', "
        "'{{ $('Set Telegram Data').item.json.chat_id }}', "
        "NOW(), NOW()) RETURNING *"
    ),

    # Original "Add Non-Urgent Ticket" - same structure, status='open'
    "Add Non-Urgent Ticket": (
        "PG: Add Non-Urgent Ticket",
        "INSERT INTO maintenance_requests (ticket_id, tenant_name, phone, property, unit, channel, type, category, summary, status, keywords, tenant_message, telegram_id, created_at, updated_at) VALUES ("
        "'{{ 'TK-' + $now.setZone('America/New_York').format('MMddHHmmss') }}', "
        "'{{ $('First Time?').item.json['Tenant Name'] }}', "
        "'{{ $('First Time?').item.json.Phone }}', "
        "'{{ $('First Time?').item.json.Property }}', "
        "'{{ $('First Time?').item.json.Unit }}', "
        "'Telegram', "
        "'{{ $('Classify Urgency').item.json.output.urgency }}', "
        "'{{ $('Classify Urgency').item.json.output.category }}', "
        "'{{ $('Classify Urgency').item.json.output.summary }}', "
        "'open', "
        "'{{ $('Classify Urgency').item.json.output.keyword }}', "
        "'{{ $('Set Telegram Data').item.json.message_text }}', "
        "'{{ $('Set Telegram Data').item.json.chat_id }}', "
        "NOW(), NOW()) RETURNING *"
    ),

    # --- TENANT UPDATES ---
    # Original: Phone = Telegram Trigger message.text.split('/start TEN_')[1]
    #           Telegram = Telegram Trigger message.from.id
    "Add Telegram ID": (
        "PG: Add Telegram ID",
        "UPDATE tenants SET telegram_id = '{{ $('Telegram Trigger').item.json.message.from.id }}' "
        "WHERE phone = '{{ $('Telegram Trigger').item.json.message.text.split('/start TEN_')[1] }}' RETURNING *"
    ),

    # --- TICKET STATUS UPDATES ---
    # Original: ticket_id from Set Telegram Data callback, status hardcoded
    "Change ticket request": (
        "PG: Change ticket request",
        "UPDATE maintenance_requests SET status = 'manual_review', updated_at = NOW() "
        "WHERE ticket_id = '{{ $('Set Telegram Data').item.json.data.split('||')[1] }}' RETURNING *"
    ),

    "Change ticket request1": (
        "PG: Change ticket request1",
        "UPDATE maintenance_requests SET status = 'vendor_contacted', updated_at = NOW() "
        "WHERE ticket_id = '{{ $('Set Telegram Data').first().json.data.split('||')[1] }}' RETURNING *"
    ),

    # --- MESSAGE INSERTS ---
    # Original Log Message columns: name, message, telegram_id, message_id, chat_id, message_received
    # Maps to PG: sender, message_text, telegram_id, message_id, chat_id, created_at
    "Log Message": (
        "PG: Log Message",
        "INSERT INTO messages (chat_id, message_id, telegram_id, sender, message_text, channel, created_at) VALUES ("
        "'{{ $json.message?.chat?.id || $json.callback_query.message.chat.id }}', "
        "'{{ $json.message?.message_id || $json.callback_query.message.message_id }}', "
        "'{{ $json.message?.from?.id || $json.callback_query.from.id }}', "
        "'{{ $json.message?.from?.first_name || $json.callback_query.from.first_name }}', "
        "'{{ $json.message?.text || $json.callback_query.message.text }}', "
        "'telegram', NOW()) RETURNING *"
    ),

    # --- MESSAGE UPDATES ---
    # Original Update Message: matches on message_id, sets ticket_id
    "Update Message": (
        "PG: Update Message",
        "UPDATE messages SET ticket_id = '{{ $('Set Telegram Data').item.json.data.split('||')[1] || '' }}' "
        "WHERE message_id = '{{ $('Telegram Trigger').item.json.message.message_id }}' "
        "AND ticket_id IS NULL RETURNING *"
    ),

    # Update Message1 is the most complex: sets ticket_id, media, chat_id, telegram_id
    "Update Message1": (
        "PG: Update Message1",
        "UPDATE messages SET "
        "ticket_id = '{{ $('Set Telegram Data').item.json.data.split('||')[1] || '' }}', "
        "media = '{{ $('Upload file').item.json.id }}', "
        "chat_id = '{{ $('Set Telegram Data').item.json.chat_id }}', "
        "telegram_id = '{{ $('Set Telegram Data').item.json.chat_id }}' "
        "WHERE message_id = '{{ $('Telegram Trigger').item?.json?.message?.message_id || $('Telegram Trigger').item.json.callback_query.message.message_id }}' "
        "RETURNING *"
    ),

    "Update Message2": (
        "PG: Update Message2",
        "UPDATE messages SET ticket_id = '{{ $('Set Telegram Data').item.json.data.split('||')[1] || '' }}' "
        "WHERE message_id = '{{ $('Telegram Trigger').item.json.message.message_id }}' "
        "AND ticket_id IS NULL RETURNING *"
    ),

    "Update Message3": (
        "PG: Update Message3",
        "UPDATE messages SET ticket_id = '{{ $('Set Telegram Data').item.json.data.split('||')[1] || '' }}' "
        "WHERE message_id = '{{ $('Telegram Trigger').item.json.message.message_id }}' "
        "AND ticket_id IS NULL RETURNING *"
    ),

    "Update Message4": (
        "PG: Update Message4",
        "UPDATE messages SET ticket_id = '{{ $('Set Telegram Data').item.json.data.split('||')[1] || '' }}' "
        "WHERE message_id = '{{ $('Telegram Trigger').item.json.message.message_id }}' "
        "AND ticket_id IS NULL RETURNING *"
    ),

    # Update Message5 uses .first() and $json.message_id (different from others)
    "Update Message5": (
        "PG: Update Message5",
        "UPDATE messages SET ticket_id = '{{ $('Set Telegram Data').first().json.data.split('||')[1] || '' }}' "
        "WHERE message_id = '{{ $json.message_id }}' "
        "AND ticket_id IS NULL RETURNING *"
    ),

    # --- MEDIA OPERATIONS ---
    # Original: appendOrUpdate on pending_media sheet, matches on file_id
    "Log Ticket number to Media": (
        "PG: Log Ticket to Media",
        "UPDATE pending_media SET ticket_id = '{{ $('Set Telegram Data').item.json.data.split('||')[1] }}' "
        "WHERE file_id = '{{ $('Download Picture').item.json.result.file_id }}' "
        "AND chat_id = '{{ $('Set Telegram Data').item.json.chat_id }}' RETURNING *"
    ),

    # Original: appendOrUpdate on Open tickets sheet (NOT pending_media!) - updates media URL
    "Append or update row in sheet": (
        "PG: Update Ticket Media",
        "UPDATE maintenance_requests SET media = 'https://drive.google.com/drive/folders/{{ $json.parents[0] }}', "
        "updated_at = NOW() "
        "WHERE ticket_id = '{{ $('Set Telegram Data').item.json.data.split('||')[1] }}' RETURNING *"
    ),

    # Original: append to pending_media sheet - new photo upload
    "Append row in sheet": (
        "PG: Append Pending Media",
        "INSERT INTO pending_media (file_id, chat_id, created_at) VALUES ("
        "'{{ $('Telegram Trigger').first().json.message.photo.last().file_id }}', "
        "'{{ $('Set Telegram Data').first().json.chat_id }}', "
        "NOW()) RETURNING *"
    ),
}


def migrate():
    with open(INPUT_FILE, "r") as f:
        workflow = json.load(f)

    nodes = workflow["nodes"]
    connections = workflow["connections"]

    new_pg_nodes = []  # New PG write nodes to add
    write_node_pg_map = {}  # Maps original write node name -> new PG node name

    # --- PASS 1: Transform READ nodes in-place ---
    for node in nodes:
        name = node.get("name", "")
        if name in READ_TRANSFORMS:
            query = READ_TRANSFORMS[name]
            transformed = make_pg_read_node(node, query)
            # Update the node in-place
            node["type"] = transformed["type"]
            node["typeVersion"] = transformed["typeVersion"]
            node["credentials"] = transformed["credentials"]
            node["parameters"] = transformed["parameters"]
            print(f"  [READ] Transformed: {name}")

    # --- PASS 2: Create PG write nodes and prepare connection rewiring ---
    for node in nodes:
        name = node.get("name", "")
        if name in WRITE_TRANSFORMS:
            pg_name, query = WRITE_TRANSFORMS[name]
            pg_node = make_pg_write_node(
                name=pg_name,
                node_id=gen_id(),
                position=node.get("position", [0, 0]),
                query=query
            )
            new_pg_nodes.append(pg_node)
            write_node_pg_map[name] = pg_name
            print(f"  [WRITE] Created PG node: {pg_name} -> mirrors to: {name}")

    # Add new PG nodes to the workflow
    nodes.extend(new_pg_nodes)

    # --- PASS 3: Rewire connections for WRITE nodes ---
    # For each write node, find what connects TO it, and insert the PG node in between
    # Before: [SourceNode] -> [SheetsWriteNode]
    # After:  [SourceNode] -> [PG WriteNode] -> [SheetsWriteNode]

    for source_name, outputs in list(connections.items()):
        if "main" not in outputs:
            continue
        for output_idx, output_connections in enumerate(outputs["main"]):
            for conn in output_connections:
                target_name = conn.get("node", "")
                if target_name in write_node_pg_map:
                    pg_name = write_node_pg_map[target_name]
                    # Rewire: source -> PG node (instead of source -> Sheets node)
                    conn["node"] = pg_name
                    print(f"  [CONN] Rewired: {source_name} -> {pg_name} (was -> {target_name})")

    # Add connections from PG write nodes -> original Sheets nodes
    for original_name, pg_name in write_node_pg_map.items():
        connections[pg_name] = {
            "main": [
                [
                    {
                        "node": original_name,
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
        print(f"  [CONN] Added: {pg_name} -> {original_name} (Sheets mirror)")

    # --- Write output ---
    workflow["name"] = "Property Management - Tenant Message Handler (PG Migration)"

    with open(OUTPUT_FILE, "w") as f:
        json.dump(workflow, f, indent=2)

    print(f"\nDone! Output: {OUTPUT_FILE}")
    print(f"  READ nodes transformed: {len(READ_TRANSFORMS)}")
    print(f"  WRITE PG nodes added: {len(new_pg_nodes)}")
    print(f"  Connections rewired: {len(write_node_pg_map)}")


if __name__ == "__main__":
    migrate()

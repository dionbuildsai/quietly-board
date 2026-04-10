#!/usr/bin/env python3
"""
Fixes the imported OPTIMIZED workflow JSON:
1. Replace all $('Prepare Data') → $('Merge Data')
2. Fix $json.language_pref in templates → $('Merge Data').item.json.language_pref
3. Fix Log Message node — column mapping with Merge Data references
4. Fix Log Telegram Message — switch to column mapping mode
5. Remove duplicate 'property' assignment in Merge Data
6. Fix Conversational Template $json.category → $json.output?.category
"""

import json
import sys

INPUT = "/Users/dion/Downloads/Property Management - Tenant Message Handler (OPTIMIZED) (1).json"
OUTPUT = "/Users/dion/Downloads/Property Management - Tenant Message Handler (OPTIMIZED-FIXED).json"

with open(INPUT) as f:
    raw = f.read()

# =================================================================
# FIX 1: Global replace $('Prepare Data') → $('Merge Data')
# =================================================================
count1 = raw.count("$('Prepare Data')")
raw = raw.replace("$('Prepare Data')", "$('Merge Data')")
print(f"Fix 1: Replaced {count1} occurrences of $('Prepare Data') → $('Merge Data')")

# =================================================================
# FIX 2: Fix $json.language_pref in template response_text values
# These are in Set nodes downstream of Route by Classification.
# At those nodes, $json is the Classify Message output: {output: {...}}
# So $json.language_pref is undefined. Must use Merge Data reference.
# =================================================================
# But we must NOT replace it in the Merge Data node itself (where $json.language_pref IS correct)
# Strategy: replace the specific patterns in response_text
count2 = 0

# Pattern: "$json.language_pref === 'fr'" in template response_text (used in ternary)
old_pat = "$json.language_pref === 'fr'"
new_pat = "$('Merge Data').item.json.language_pref === 'fr'"
count2 += raw.count(old_pat)
raw = raw.replace(old_pat, new_pat)

# Pattern in Conversational Template: "const lang = $json.language_pref;"
old_pat2 = "const lang = $json.language_pref;"
new_pat2 = "const lang = $('Merge Data').item.json.language_pref;"
count2 += raw.count(old_pat2)
raw = raw.replace(old_pat2, new_pat2)

print(f"Fix 2: Replaced {count2} occurrences of $json.language_pref in templates")

# =================================================================
# FIX 3: Fix Conversational Template $json.category → $json.output?.category
# =================================================================
old_pat3 = "const cat = $json.category;"
new_pat3 = "const cat = $json.output?.category || 'other';"
count3 = raw.count(old_pat3)
raw = raw.replace(old_pat3, new_pat3)
print(f"Fix 3: Replaced {count3} occurrences of $json.category in Conversational Template")

# Now parse as JSON for node-level fixes
wf = json.loads(raw)

# =================================================================
# FIX 4: Fix Merge Data — remove duplicate 'property' assignment
# =================================================================
for n in wf["nodes"]:
    if n["name"] == "Merge Data":
        assignments = n["parameters"]["assignments"]["assignments"]
        # Find and remove duplicate 'property'
        seen_property = False
        cleaned = []
        for a in assignments:
            if a["name"] == "property":
                if seen_property:
                    continue  # skip duplicate
                seen_property = True
            cleaned.append(a)
        removed = len(assignments) - len(cleaned)
        n["parameters"]["assignments"]["assignments"] = cleaned
        print(f"Fix 4: Removed {removed} duplicate 'property' assignment from Merge Data")
        break

# =================================================================
# FIX 5: Fix Log Message node — proper column mapping with Merge Data refs
# =================================================================
for n in wf["nodes"]:
    if n["name"] == "Log Message":
        n["parameters"] = {
            "schema": {"__rl": True, "mode": "list", "value": "public"},
            "table": {"__rl": True, "value": "messages", "mode": "list", "cachedResultName": "messages"},
            "columns": {
                "mappingMode": "defineBelow",
                "value": {
                    "chat_id": "={{ $('Merge Data').item.json.chat_id || $('Merge Data').item.json.sender_identifier }}",
                    "sender": "={{ $('Merge Data').item.json.tenant_name }}",
                    "message_text": "={{ $('Merge Data').item.json.message }}",
                    "channel": "={{ $('Merge Data').item.json.channel }}",
                    "telegram_id": "={{ $('Merge Data').item.json.telegram_id || '' }}"
                },
                "matchingColumns": ["id"],
                "schema": [
                    {"id": "id", "displayName": "id", "required": False, "defaultMatch": True, "display": True, "type": "string", "canBeUsedToMatch": True, "removed": True},
                    {"id": "chat_id", "displayName": "chat_id", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True},
                    {"id": "ticket_id", "displayName": "ticket_id", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True, "removed": True},
                    {"id": "sender", "displayName": "sender", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True},
                    {"id": "message_text", "displayName": "message_text", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True},
                    {"id": "media", "displayName": "media", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True, "removed": True},
                    {"id": "channel", "displayName": "channel", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True},
                    {"id": "created_at", "displayName": "created_at", "required": False, "defaultMatch": False, "display": True, "type": "dateTime", "canBeUsedToMatch": True, "removed": True},
                    {"id": "message_id", "displayName": "message_id", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True, "removed": True},
                    {"id": "telegram_id", "displayName": "telegram_id", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True}
                ],
                "attemptToConvertTypes": False,
                "convertFieldsToString": True
            },
            "options": {}
        }
        print("Fix 5: Rewrote Log Message node with column mapping + Merge Data references")
        break

# =================================================================
# FIX 6: Fix Log Telegram Message — switch to column mapping mode
# =================================================================
for n in wf["nodes"]:
    if n["name"] == "Log Telegram Message":
        n["parameters"] = {
            "schema": {"__rl": True, "mode": "list", "value": "public"},
            "table": {"__rl": True, "value": "messages", "mode": "list", "cachedResultName": "messages"},
            "columns": {
                "mappingMode": "defineBelow",
                "value": {
                    "chat_id": "={{ $json.message?.chat?.id || $json.callback_query?.message?.chat?.id || '' }}",
                    "message_id": "={{ String($json.message?.message_id || $json.callback_query?.message?.message_id || '') }}",
                    "telegram_id": "={{ String($json.message?.from?.id || $json.callback_query?.from?.id || '') }}",
                    "sender": "={{ $json.message?.from?.first_name || $json.callback_query?.from?.first_name || '' }}",
                    "message_text": "={{ $json.message?.text || $json.callback_query?.message?.text || '' }}",
                    "channel": "telegram"
                },
                "matchingColumns": ["id"],
                "schema": [
                    {"id": "id", "displayName": "id", "required": False, "defaultMatch": True, "display": True, "type": "string", "canBeUsedToMatch": True, "removed": True},
                    {"id": "chat_id", "displayName": "chat_id", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True},
                    {"id": "ticket_id", "displayName": "ticket_id", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True, "removed": True},
                    {"id": "sender", "displayName": "sender", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True},
                    {"id": "message_text", "displayName": "message_text", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True},
                    {"id": "media", "displayName": "media", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True, "removed": True},
                    {"id": "channel", "displayName": "channel", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True},
                    {"id": "created_at", "displayName": "created_at", "required": False, "defaultMatch": False, "display": True, "type": "dateTime", "canBeUsedToMatch": True, "removed": True},
                    {"id": "message_id", "displayName": "message_id", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True},
                    {"id": "telegram_id", "displayName": "telegram_id", "required": False, "defaultMatch": False, "display": True, "type": "string", "canBeUsedToMatch": True}
                ],
                "attemptToConvertTypes": False,
                "convertFieldsToString": True
            },
            "options": {}
        }
        print("Fix 6: Rewrote Log Telegram Message with column mapping (no more executeQuery)")
        break

# =================================================================
# VERIFICATION: Check all connections and references
# =================================================================
names = [n["name"] for n in wf["nodes"]]
dupes = [n for n in names if names.count(n) > 1]
if dupes:
    print(f"WARNING: Duplicate node names: {set(dupes)}")

missing = set()
for src, outputs in wf["connections"].items():
    if src not in names:
        missing.add(f"Source: {src}")
    for out_key, conns in outputs.items():
        for conn_list in conns:
            for c in conn_list:
                if c["node"] not in names:
                    missing.add(f"Target: {c['node']}")
if missing:
    print(f"WARNING: Missing node references: {missing}")

# Check orphans
connected = set()
for src, outputs in wf["connections"].items():
    connected.add(src)
    for ok, oc in outputs.items():
        for cl in oc:
            for c in cl:
                connected.add(c["node"])
triggers = {n["name"] for n in wf["nodes"] if "Trigger" in n["type"] or "webhook" in n["type"].lower()}
orphans = set(names) - connected - triggers
if orphans:
    print(f"WARNING: Orphan nodes: {orphans}")

# Count remaining $('Prepare Data') references (should be 0)
final_json = json.dumps(wf)
remaining = final_json.count("$('Prepare Data')")
if remaining:
    print(f"WARNING: {remaining} remaining $('Prepare Data') references!")
else:
    print("PASS: Zero $('Prepare Data') references remain")

# Count $json.language_pref that are NOT inside Merge Data node
# (In Merge Data, $json.language_pref is correct)
remaining_lp = final_json.count("$json.language_pref")
print(f"INFO: {remaining_lp} remaining $json.language_pref references (1 in Merge Data is expected)")

# Trace email path
def trace(start, conns_map, max_depth=30):
    visited = []
    queue = [start]
    for _ in range(max_depth):
        next_q = []
        for n in queue:
            if n in visited:
                continue
            visited.append(n)
            if n in conns_map:
                for ok, oc in conns_map[n].items():
                    if ok == "main":
                        for cl in oc:
                            for c in cl:
                                next_q.append(c["node"])
        queue = next_q
        if not queue:
            break
    return visited

email_path = trace("Gmail Trigger", wf["connections"])
tg_path = trace("Telegram Trigger", wf["connections"])

print(f"\nEmail path reaches {len(email_path)} nodes")
for key in ["Normalize Email", "Merge Point", "Lookup Tenant", "Is Tenant?", "Prepare Data", "Merge Data",
            "Get Open Tickets", "Classify Message", "Route by Classification", "Channel Dispatcher",
            "Send Email Response", "Log Message", "Create Ticket"]:
    status = "OK" if key in email_path else "MISSING"
    print(f"  Email -> {key}: {status}")

print(f"\nTelegram path reaches {len(tg_path)} nodes")
for key in ["If3", "Set Telegram Data", "If2", "Get Tenant Info", "First Time?",
            "CHECK IF TICKET EXISTS", "Prepare Telegram Data", "Merge Data",
            "Get Open Tickets", "Classify Message", "Route by Classification",
            "Channel Dispatcher", "Send Telegram Response", "Log Message"]:
    status = "OK" if key in tg_path else "MISSING"
    print(f"  TG -> {key}: {status}")

# Save
with open(OUTPUT, "w") as f:
    json.dump(wf, f, indent=2)

print(f"\nFixed workflow saved to: {OUTPUT}")
print(f"Total nodes: {len(wf['nodes'])}")

#!/usr/bin/env python3
"""
Builds the optimized Tenant Message Handler workflow.
172 nodes → ~80 nodes. Unified pipeline, all Haiku, bilingual templates.
"""

import json
import copy
import uuid

INPUT_FILE = "Property Management - Tenant Message Handler (11).json"
OUTPUT_FILE = "Property Management - Tenant Message Handler (OPTIMIZED).json"

# ---- CREDENTIALS ----
CRED_PG = {"postgres": {"id": "JlETYTnhAwFrsmL9", "name": "Quietly DB"}}
CRED_GMAIL = {"gmailOAuth2": {"id": "ib5ffoxInNyz8gYt", "name": "dionbuildsai gmail"}}
CRED_SHEETS = {"googleSheetsOAuth2Api": {"id": "WNOgZsgLVbrx2XuZ", "name": "dionbuildsai Sheets"}}
CRED_ANTHROPIC = {"anthropicApi": {"id": "jOOjmB3sv6fwkbDV", "name": "Anthropic account"}}
CRED_TELEGRAM = {"telegramApi": {"id": "5uwoGp7iX1GQkMcu", "name": "property_management"}}
CRED_TWILIO = {"twilioApi": {"id": "ijmhKNa9AFRv7Rjr", "name": "Twilio account"}}

SHEETS_DOC_ID = "1be3u-2jYUYnyRGs2AhcZP07qlrLmCIDW-o0_HO8LvpY"
OWNER_CHAT_ID = "6216258938"
TWILIO_FROM = "+14389009998"
EMERGENCY_LINE = "438-900-9998"
CALLBACK_NUMBER = "514-831-9058"
BOT_TOKEN = "8460031715:AAE1IQYICVYo3BfDcOjY4IKYVu0iI4V9lZ8"


def uid():
    return str(uuid.uuid4())


def node(name, ntype, version, params, pos, creds=None, **extra):
    """Create an n8n node."""
    n = {
        "parameters": params,
        "id": uid(),
        "name": name,
        "type": ntype,
        "typeVersion": version,
        "position": pos,
    }
    if creds:
        n["credentials"] = creds
    n.update(extra)
    return n


def pg_query(name, query, pos):
    """Create a PostgreSQL executeQuery node."""
    return node(name, "n8n-nodes-base.postgres", 2.6,
                {"operation": "executeQuery", "query": query, "options": {}},
                pos, CRED_PG)


def tg_send(name, chat_id_expr, text_expr, pos, **extra):
    """Create a Telegram send message node."""
    return node(name, "n8n-nodes-base.telegram", 1.2,
                {"chatId": chat_id_expr, "text": text_expr,
                 "additionalFields": {"appendAttribution": False}},
                pos, CRED_TELEGRAM, **extra)


def set_node(name, assignments, pos):
    """Create a Set node with field assignments."""
    assigns = []
    for field_name, value, vtype in assignments:
        assigns.append({
            "id": uid(),
            "name": field_name,
            "value": value,
            "type": vtype
        })
    return node(name, "n8n-nodes-base.set", 3.4,
                {"assignments": {"assignments": assigns}, "options": {}}, pos)


def if_node(name, left_expr, operator_type, operation, right_val, pos, single_value=False):
    """Create an IF node."""
    cond = {
        "id": uid(),
        "leftValue": left_expr,
        "operator": {"type": operator_type, "operation": operation}
    }
    if not single_value:
        cond["rightValue"] = right_val
    else:
        cond["operator"]["singleValue"] = True
    return node(name, "n8n-nodes-base.if", 2.3, {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 3},
            "conditions": [cond],
            "combinator": "and"
        },
        "options": {}
    }, pos)


def conn(target, ctype="main", index=0):
    """Create a connection target."""
    return {"node": target, "type": ctype, "index": index}


# ============================================================
# BILINGUAL TEMPLATES
# ============================================================

URGENT_ACK_TEMPLATE = """={{ $json.language_pref === 'fr' ?
'Bonjour ' + $json.tenant_name + ',\\n\\nMerci d\\'avoir signalé ce problème. Il a été marqué comme URGENT.\\n\\nNous avons déjà contacté des spécialistes en ' + $json.category + ' et vous devriez recevoir des nouvelles sous peu.\\n\\nSi vous avez des photos du problème, n\\'hésitez pas à nous les envoyer.\\n\\n— Julia, Julia Inc Gestion Immobilière'
:
'Hi ' + $json.tenant_name + ',\\n\\nThank you for reporting this issue. It has been flagged as URGENT.\\n\\nWe have already contacted ' + $json.category + ' specialists and you should expect to hear back shortly.\\n\\nIf you have photos of the issue, feel free to send them to us.\\n\\n— Julia, Julia Inc Property Management'
}}"""

NON_URGENT_ACK_TEMPLATE = """={{ $json.language_pref === 'fr' ?
'Bonjour ' + $json.tenant_name + ',\\n\\nMerci de nous avoir contactés. Nous avons bien reçu votre message concernant : ' + $json.summary + '.\\n\\nNotre équipe examinera votre demande et vous répondra dans un délai de 1 à 3 jours ouvrables.\\n\\nPour les urgences, appelez le : """ + EMERGENCY_LINE + """\\n\\n— Julia Inc Gestion Immobilière'
:
'Hi ' + $json.tenant_name + ',\\n\\nThank you for reaching out. We have received your message regarding: ' + $json.summary + '.\\n\\nOur team will review and get back to you within 1-3 business days.\\n\\nFor emergencies, please call: """ + EMERGENCY_LINE + """\\n\\n— Julia Inc Property Management'
}}"""

CONVERSATIONAL_TEMPLATE = """={{ (() => {
  const lang = $json.language_pref;
  const cat = $json.category;
  if (cat === 'greeting') return lang === 'fr' ? 'Bonjour! Comment puis-je vous aider aujourd\\'hui? — Julia Inc' : 'Hi! How can I help you today? — Julia Inc';
  if (cat === 'status_check') return lang === 'fr' ? 'Merci! Laissez-nous savoir si vous avez besoin d\\'autre chose. — Julia Inc' : 'Thanks! Let us know if you need anything else. — Julia Inc';
  return lang === 'fr' ? 'Merci pour votre message! Comment pouvons-nous vous aider? — Julia Inc' : 'Thanks for your message! How can we help? — Julia Inc';
})() }}"""

TICKET_EXISTS_TEMPLATE = """={{ $json.language_pref === 'fr' ?
'Bonjour ' + $json.tenant_name + ',\\n\\nNous avons bien reçu votre message. Celui-ci est suivi sous votre billet existant ' + $json.matched_ticket_id + '.\\n\\nNotre équipe s\\'en occupe. Aucune action supplémentaire n\\'est requise de votre part.\\n\\n— Julia Inc Gestion Immobilière'
:
'Hi ' + $json.tenant_name + ',\\n\\nWe received your message. This is being tracked under your existing ticket ' + $json.matched_ticket_id + '.\\n\\nOur team is on it. No further action is needed from your end.\\n\\n— Julia Inc Property Management'
}}"""

POST_APPROVAL_ACK_FR = "Bonjour {tenant_name},\\n\\nVotre problème urgent a été examiné et nous avons contacté des spécialistes. Vous devriez recevoir des nouvelles sous peu.\\n\\n— Julia Inc"
POST_APPROVAL_ACK_EN = "Hi {tenant_name},\\n\\nYour urgent issue has been reviewed and we have contacted specialists. You should hear back shortly.\\n\\n— Julia Inc"

# ============================================================
# SYSTEM PROMPTS
# ============================================================

CLASSIFY_SYSTEM_PROMPT = """You are a property management assistant. Analyze the following tenant message and classify it.

Respond ONLY with a valid JSON object (no markdown, no code blocks) with these fields:
- "urgency": one of "urgent", "not_urgent", "request", "question", "conversation", "not_our_responsibility"
- "category": one of "plumbing", "electrical", "hvac", "appliance", "pest_control", "locksmith", "general_maintenance", "landscaping", "cleaning", "parking", "moving", "noise", "rent", "lease", "documents", "status_check", "greeting", "personal", "other"
- "summary": a brief 1-2 sentence summary of what the tenant needs
- "reasoning": why you classified it this way
- "keyword": a 2-6 word label for the issue

IMPORTANT: Only classify as urgent or not_urgent if the issue is the LANDLORD'S responsibility. If it's the tenant's personal problem, classify as "not_our_responsibility".

URGENT (landlord responsibility, requires immediate action):
- Water leak, flooding, burst pipe
- No heat in winter / no AC in extreme heat
- Gas smell or carbon monoxide
- Electrical hazard (sparking, burning smell)
- Lock-out or security breach
- Sewage backup, Fire damage
- Broken window/door (security risk)
- No hot water
- Elevator stuck (with person inside)

NOT_URGENT (landlord responsibility, not time-sensitive):
- Routine repairs (loose cabinet, squeaky door, chipped paint)
- Landlord-provided appliance not working
- Minor plumbing (slow drain, running toilet)
- Cosmetic issues, Pest sighting (non-infestation)

REQUEST: Document requests, parking, permissions, moving coordination, payment arrangements
QUESTION: Rent due dates, building rules, lease terms, facility locations
NOT_OUR_RESPONSIBILITY: Pet accidents, personal belongings, roommate conflicts, tenant's own appliances, internet/cable, tenant negligence
CONVERSATION: Greetings, thank you, ok, small talk

NEVER make up URLs or resources. If unsure, say "I'll check with our team and get back to you."
"""

VENDOR_SYSTEM_PROMPT = """You are a property management coordinator. Write a brief, professional message to a vendor about an urgent tenant issue.

Write a concise message that:
1. Short introduction identifying this as an urgent request from Julia Inc
2. Describes the issue clearly
3. Asks them to respond ASAP with availability
4. Includes the property address on a new line
5. Provides callback number: """ + CALLBACK_NUMBER + """ on a new line
6. Signs off as Julia

Keep it under 5 sentences. Be direct and professional. Format as HTML."""

RELATABILITY_SYSTEM_PROMPT = """You are a ticket matching assistant. Compare the tenant's message to the open ticket below and determine if they are related.

Rules:
- If ANY ticket field is "NONE", return related: false
- Return related: true if the message is about the same TOPIC as the open ticket
- Return related: false ONLY if the message is about a completely unrelated topic
- When in doubt, return true if the topic overlaps

Respond with ONLY a raw JSON object. No markdown, no code blocks."""

NOT_URGENT_RESPONSE_SYSTEM = """You are a professional and friendly property management assistant.

Write a warm reply that:
1. Thanks them for reaching out
2. Acknowledges what they reported
3. Says our team will review and get back within 1-3 business days
Keep it 2-3 sentences. Sign off as Julia Inc Property Management.
Respond in the tenant's language ({{ $json.language_pref === 'fr' ? 'French' : 'English' }}).

Quebec Landlord Obligations (Civil Code):
LANDLORD MUST: Maintain dwelling in habitable condition (art. 1854, 1910, 1911), ensure peaceful enjoyment (art. 1851), make necessary repairs (art. 1864).
TENANT RESPONSIBLE FOR: Minor maintenance, personal belongings, damage they cause, their own appliances."""

NO_RESPONSIBILITY_SYSTEM = """You are a friendly property management assistant for Julia Inc.
Politely explain that this issue falls under the tenant's responsibility, not the landlord's.
Be empathetic but clear. Keep it 2-3 sentences. Sign off as Julia Inc Property Management.
Respond in the tenant's language ({{ $json.language_pref === 'fr' ? 'French' : 'English' }}).

Quebec Civil Code reference: Tenants are responsible for minor maintenance, personal belongings, damage they cause, their own appliances and furniture, pet-related cleanup."""

LANDLORD_BRIEFING_SYSTEM = """You are an assistant helping a landlord review an urgent tenant issue.
Summarize the conversation history concisely:
1. What the issue is
2. Key details (location, severity)
3. Any relevant context from message history
Keep it 3-4 sentences. Be factual and actionable."""


def build_workflow():
    # Read original for extracting existing nodes
    with open(INPUT_FILE, "r") as f:
        original = json.load(f)

    orig_nodes = {n["name"]: n for n in original["nodes"]}
    orig_connections = original["connections"]

    nodes = []
    connections = {}

    def add(n):
        nodes.append(n)
        return n["name"]

    def link(src, targets, output_idx=0):
        """Add connection: src node -> list of targets at output_idx."""
        if src not in connections:
            connections[src] = {"main": []}
        while len(connections[src]["main"]) <= output_idx:
            connections[src]["main"].append([])
        for t in targets:
            if isinstance(t, str):
                connections[src]["main"][output_idx].append(conn(t))
            else:
                connections[src]["main"][output_idx].append(t)

    def ai_link(model_name, chain_name):
        """Link model node to chain node via ai_languageModel."""
        if model_name not in connections:
            connections[model_name] = {}
        connections[model_name]["ai_languageModel"] = [[conn(chain_name, "ai_languageModel")]]

    def parser_link(parser_name, chain_name):
        """Link parser node to chain node via ai_outputParser."""
        if parser_name not in connections:
            connections[parser_name] = {}
        connections[parser_name]["ai_outputParser"] = [[conn(chain_name, "ai_outputParser")]]

    # ============================================================
    # SECTION 1: ENTRY POINTS (5 nodes - extract from original)
    # ============================================================
    for name in ["Gmail Trigger", "Urgent", "General", "Other", "Telegram Trigger"]:
        add(copy.deepcopy(orig_nodes[name]))

    # ============================================================
    # SECTION 2: NORMALIZATION (5 nodes)
    # ============================================================

    # Normalize Email
    add(set_node("Normalize Email", [
        ("channel", "email", "string"),
        ("sender_identifier", "={{ $json.From }}", "string"),
        ("message", "={{ $json.snippet || $json.textPlain || $json.text || '' }}", "string"),
        ("subject", "={{ $json.subject || '' }}", "string"),
        ("chat_id", "", "string"),
    ], [-6200, -176]))

    # Normalize SMS (single node for all 3 webhooks)
    add(set_node("Normalize SMS", [
        ("channel", "sms", "string"),
        ("sender_identifier", "={{ $json.query?.phone || $json.body?.phone || '' }}", "string"),
        ("message", "={{ $json.query?.message || $json.body?.message || '' }}", "string"),
        ("subject", "SMS from Tenant", "string"),
        ("chat_id", "", "string"),
        ("sms_category", "={{ $json.query?.category || $json.body?.category || 'general' }}", "string"),
    ], [-6200, 224]))

    # Telegram pre-processing: keep If3, Processing, Processing...1, Set Telegram Data from original
    for name in ["If3", "Processing", "Processing...1", "Set Telegram Data"]:
        if name in orig_nodes:
            add(copy.deepcopy(orig_nodes[name]))

    # Normalize Telegram (after Set Telegram Data, maps to common format)
    add(set_node("Normalize Telegram", [
        ("channel", "telegram", "string"),
        ("sender_identifier", "={{ $('Set Telegram Data').item.json.chat_id }}", "string"),
        ("message", "={{ $('Set Telegram Data').item.json.message_text }}", "string"),
        ("subject", "", "string"),
        ("chat_id", "={{ $('Set Telegram Data').item.json.chat_id }}", "string"),
    ], [-5600, 1296]))

    # Merge Point (NoOp) - all normalizers converge here
    add(node("Merge Point", "n8n-nodes-base.noOp", 1, {}, [-5200, 400]))

    # ============================================================
    # SECTION 3: TENANT LOOKUP + IS TENANT (3 nodes)
    # ============================================================

    add(pg_query("Lookup Tenant",
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", "
        "t.unit_number AS \"Unit\", t.email AS \"Email\", "
        "p.address AS \"Property\", t.emergency_contact AS \"Emergency Contact\", "
        "t.notes AS \"Notes\", t.status AS \"Status\", t.telegram_id AS \"Telegram\", "
        "t.language_pref "
        "FROM tenants t LEFT JOIN properties p ON t.property_id = p.id "
        "WHERE CASE "
        "WHEN '{{ $json.channel }}' = 'email' THEN t.email = '{{ $json.sender_identifier }}' "
        "WHEN '{{ $json.channel }}' = 'sms' THEN t.phone LIKE '%' || '{{ $json.sender_identifier }}' || '%' "
        "WHEN '{{ $json.channel }}' = 'telegram' THEN t.telegram_id = '{{ $json.sender_identifier }}' "
        "END",
        [-4800, 400]))

    add(if_node("Is Tenant?", "={{ $json.isEmpty() }}", "boolean", "false", "", [-4400, 400], single_value=True))

    add(node("Unknown Sender", "n8n-nodes-base.noOp", 1, {}, [-4400, 700]))

    # ============================================================
    # SECTION 4: PREPARE DATA (merges tenant + message info)
    # ============================================================

    add(set_node("Prepare Data", [
        ("tenant_name", "={{ $('Lookup Tenant').item.json['Tenant Name'] }}", "string"),
        ("phone", "={{ $('Lookup Tenant').item.json.Phone }}", "string"),
        ("unit", "={{ $('Lookup Tenant').item.json.Unit }}", "string"),
        ("property", "={{ $('Lookup Tenant').item.json.Property }}", "string"),
        ("email", "={{ $('Lookup Tenant').item.json.Email }}", "string"),
        ("telegram_id", "={{ $('Lookup Tenant').item.json.Telegram }}", "string"),
        ("language_pref", "={{ $('Lookup Tenant').item.json.language_pref || 'fr' }}", "string"),
        ("channel", "={{ $('Merge Point').item.json.channel }}", "string"),
        ("message", "={{ $('Merge Point').item.json.message }}", "string"),
        ("subject", "={{ $('Merge Point').item.json.subject }}", "string"),
        ("chat_id", "={{ $('Merge Point').item.json.chat_id }}", "string"),
        ("sender_identifier", "={{ $('Merge Point').item.json.sender_identifier }}", "string"),
    ], [-4000, 400]))

    # ============================================================
    # SECTION 5: TICKET RELATABILITY CHECK (all channels)
    # ============================================================

    add(pg_query("Get Open Tickets",
        "SELECT id, ticket_id, tenant_name, COALESCE(phone, tenant_phone) AS phone, "
        "category, summary, keywords, status, created_at "
        "FROM maintenance_requests "
        "WHERE (tenant_phone = '{{ $json.phone }}' OR phone = '{{ $json.phone }}') "
        "AND status NOT IN ('closed') ORDER BY created_at DESC LIMIT 5",
        [-3600, 400]))

    add(if_node("Has Open Tickets?", "={{ !$json.isEmpty() }}", "boolean", "true", "", [-3200, 400], single_value=True))

    # Classify Relatability (AI chain)
    add(node("Classify Relatability", "@n8n/n8n-nodes-langchain.chainLlm", 1.4, {
        "promptType": "define",
        "text": "=Tenant message: {{ $('Prepare Data').item.json.message }}\n\nOpen ticket:\n- Ticket ID: {{ $json.ticket_id || 'NONE' }}\n- Category: {{ $json.category || 'NONE' }}\n- Summary: {{ $json.summary || 'NONE' }}",
        "hasOutputParser": True,
        "messages": {"messageValues": [{"message": RELATABILITY_SYSTEM_PROMPT}]}
    }, [-2800, 200]))

    add(node("Haiku - Relatability", "@n8n/n8n-nodes-langchain.lmChatAnthropic", 1.3, {
        "model": {"__rl": True, "value": "claude-haiku-4-5-20251001", "mode": "list"},
        "options": {}
    }, [-2800, 420], CRED_ANTHROPIC))

    add(node("Relatability Parser", "@n8n/n8n-nodes-langchain.outputParserStructured", 1.2, {
        "jsonSchemaExample": '{\n  "related": true,\n  "ticket_id": "TK-0225143022",\n  "reasoning": "Both about plumbing issue"\n}'
    }, [-2670, 420]))

    # Is New Ticket? (IF: related=false or no open tickets → new ticket)
    add(if_node("Is New Ticket?", "={{ $json.output?.related === false || $('Has Open Tickets?').item.json.isEmpty() }}", "boolean", "true", "", [-2400, 400], single_value=True))

    # Ticket Exists Template
    add(set_node("Ticket Exists Ack", [
        ("response_text", TICKET_EXISTS_TEMPLATE.replace("$json.matched_ticket_id", "$('Classify Relatability').item.json.output.ticket_id"), "string"),
        ("tenant_name", "={{ $('Prepare Data').item.json.tenant_name }}", "string"),
        ("language_pref", "={{ $('Prepare Data').item.json.language_pref }}", "string"),
        ("channel", "={{ $('Prepare Data').item.json.channel }}", "string"),
        ("chat_id", "={{ $('Prepare Data').item.json.chat_id }}", "string"),
        ("email", "={{ $('Prepare Data').item.json.email }}", "string"),
        ("phone", "={{ $('Prepare Data').item.json.phone }}", "string"),
        ("matched_ticket_id", "={{ $('Classify Relatability').item.json.output.ticket_id }}", "string"),
    ], [-2000, 100]))

    # ============================================================
    # SECTION 6: UNIFIED CLASSIFICATION (3 nodes)
    # ============================================================

    add(node("Classify Message", "@n8n/n8n-nodes-langchain.chainLlm", 1.4, {
        "promptType": "define",
        "text": "=Message: {{ $('Prepare Data').item.json.message }}\nSubject: {{ $('Prepare Data').item.json.subject }}\nChannel: {{ $('Prepare Data').item.json.channel }}",
        "hasOutputParser": True,
        "messages": {"messageValues": [{"message": CLASSIFY_SYSTEM_PROMPT}]}
    }, [-2000, 500]))

    add(node("Haiku - Classify", "@n8n/n8n-nodes-langchain.lmChatAnthropic", 1.3, {
        "model": {"__rl": True, "value": "claude-haiku-4-5-20251001", "mode": "list"},
        "options": {"temperature": 0.1}
    }, [-2000, 720], CRED_ANTHROPIC))

    add(node("Classification Parser", "@n8n/n8n-nodes-langchain.outputParserStructured", 1.2, {
        "jsonSchemaExample": '{\n  "urgency": "urgent",\n  "category": "plumbing",\n  "summary": "Tenant reports a burst pipe.",\n  "keyword": "burst kitchen pipe",\n  "reasoning": "Water leak is an emergency."\n}'
    }, [-1870, 720]))

    # ============================================================
    # SECTION 7: ROUTING (1 Switch node - 6 outputs)
    # ============================================================

    switch_rules = []
    for val, key in [("urgent", "urgent"), ("not_urgent", "not_urgent"), ("request", "request"),
                     ("conversation", "conversation"), ("not_our_responsibility", "no_responsibility"),
                     ("question", "question")]:
        switch_rules.append({
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 3},
                "conditions": [{"id": uid(), "leftValue": "={{ $json.output.urgency }}", "rightValue": val,
                               "operator": {"type": "string", "operation": "equals"}}],
                "combinator": "and"
            },
            "renameOutput": True,
            "outputKey": key
        })

    add(node("Route by Classification", "n8n-nodes-base.switch", 3.4, {
        "rules": {"values": switch_rules},
        "options": {"fallbackOutput": 3}  # conversation as fallback
    }, [-1500, 500]))

    # ============================================================
    # SECTION 8: RESPONSE GENERATION
    # ============================================================

    # --- Templates ---
    add(set_node("Urgent Ack Template", [
        ("response_text", URGENT_ACK_TEMPLATE, "string"),
        ("category", "={{ $json.output.category }}", "string"),
        ("summary", "={{ $json.output.summary }}", "string"),
        ("keyword", "={{ $json.output.keyword }}", "string"),
        ("tenant_name", "={{ $('Prepare Data').item.json.tenant_name }}", "string"),
        ("language_pref", "={{ $('Prepare Data').item.json.language_pref }}", "string"),
        ("channel", "={{ $('Prepare Data').item.json.channel }}", "string"),
        ("chat_id", "={{ $('Prepare Data').item.json.chat_id }}", "string"),
        ("email", "={{ $('Prepare Data').item.json.email }}", "string"),
        ("phone", "={{ $('Prepare Data').item.json.phone }}", "string"),
        ("unit", "={{ $('Prepare Data').item.json.unit }}", "string"),
        ("property", "={{ $('Prepare Data').item.json.property }}", "string"),
        ("telegram_id", "={{ $('Prepare Data').item.json.telegram_id }}", "string"),
        ("message", "={{ $('Prepare Data').item.json.message }}", "string"),
    ], [-1000, 200]))

    add(set_node("Non-Urgent Ack Template", [
        ("response_text", NON_URGENT_ACK_TEMPLATE, "string"),
        ("summary", "={{ $json.output.summary }}", "string"),
        ("category", "={{ $json.output.category }}", "string"),
        ("keyword", "={{ $json.output.keyword }}", "string"),
        ("tenant_name", "={{ $('Prepare Data').item.json.tenant_name }}", "string"),
        ("language_pref", "={{ $('Prepare Data').item.json.language_pref }}", "string"),
        ("channel", "={{ $('Prepare Data').item.json.channel }}", "string"),
        ("chat_id", "={{ $('Prepare Data').item.json.chat_id }}", "string"),
        ("email", "={{ $('Prepare Data').item.json.email }}", "string"),
        ("phone", "={{ $('Prepare Data').item.json.phone }}", "string"),
    ], [-1000, 500]))

    add(set_node("Conversational Template", [
        ("response_text", CONVERSATIONAL_TEMPLATE, "string"),
        ("category", "={{ $json.output.category }}", "string"),
        ("tenant_name", "={{ $('Prepare Data').item.json.tenant_name }}", "string"),
        ("language_pref", "={{ $('Prepare Data').item.json.language_pref }}", "string"),
        ("channel", "={{ $('Prepare Data').item.json.channel }}", "string"),
        ("chat_id", "={{ $('Prepare Data').item.json.chat_id }}", "string"),
        ("email", "={{ $('Prepare Data').item.json.email }}", "string"),
        ("phone", "={{ $('Prepare Data').item.json.phone }}", "string"),
    ], [-1000, 800]))

    # --- AI Responses ---
    # Not Urgent / Request / Question Response (Haiku)
    add(node("AI Response", "@n8n/n8n-nodes-langchain.anthropic", 1, {
        "modelId": {"__rl": True, "value": "claude-haiku-4-5-20251001", "mode": "list"},
        "messages": {"values": [{"content": "=Urgency: {{ $json.output.urgency }}\nCategory: {{ $json.output.category }}\nSummary: {{ $json.output.summary }}\n\nTenant Name: {{ $('Prepare Data').item.json.tenant_name }}\nTenant Message: {{ $('Prepare Data').item.json.message }}"}]},
        "options": {"system": NOT_URGENT_RESPONSE_SYSTEM}
    }, [-1000, 1100], CRED_ANTHROPIC))

    # No Responsibility Response (Haiku)
    add(node("No Responsibility Response", "@n8n/n8n-nodes-langchain.anthropic", 1, {
        "modelId": {"__rl": True, "value": "claude-haiku-4-5-20251001", "mode": "list"},
        "messages": {"values": [{"content": "=Category: {{ $json.output.category }}\nSummary: {{ $json.output.summary }}\n\nTenant Name: {{ $('Prepare Data').item.json.tenant_name }}\nTenant Message: {{ $('Prepare Data').item.json.message }}"}]},
        "options": {"system": NO_RESPONSIBILITY_SYSTEM}
    }, [-1000, 1400], CRED_ANTHROPIC))

    # Set response_text from AI outputs (needed for channel dispatcher)
    add(set_node("Format AI Response", [
        ("response_text", "={{ $json.text }}", "string"),
        ("channel", "={{ $('Prepare Data').item.json.channel }}", "string"),
        ("chat_id", "={{ $('Prepare Data').item.json.chat_id }}", "string"),
        ("email", "={{ $('Prepare Data').item.json.email }}", "string"),
        ("phone", "={{ $('Prepare Data').item.json.phone }}", "string"),
        ("tenant_name", "={{ $('Prepare Data').item.json.tenant_name }}", "string"),
        ("summary", "={{ $('Classify Message').item.json.output.summary }}", "string"),
        ("category", "={{ $('Classify Message').item.json.output.category }}", "string"),
        ("keyword", "={{ $('Classify Message').item.json.output.keyword }}", "string"),
        ("language_pref", "={{ $('Prepare Data').item.json.language_pref }}", "string"),
    ], [-500, 1250]))

    # ============================================================
    # SECTION 9: CHANNEL DISPATCHER
    # ============================================================

    dispatch_rules = []
    for val, key in [("email", "email"), ("sms", "sms"), ("telegram", "telegram")]:
        dispatch_rules.append({
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 3},
                "conditions": [{"id": uid(), "leftValue": "={{ $json.channel }}", "rightValue": val,
                               "operator": {"type": "string", "operation": "equals"}}],
                "combinator": "and"
            },
            "renameOutput": True,
            "outputKey": key
        })

    add(node("Channel Dispatcher", "n8n-nodes-base.switch", 3.4, {
        "rules": {"values": dispatch_rules},
        "options": {}
    }, [0, 600]))

    # Send Email Response
    add(node("Send Email Response", "n8n-nodes-base.gmail", 2.1, {
        "sendTo": "={{ $json.email }}",
        "subject": "=Re: {{ $('Prepare Data').item.json.subject }}",
        "message": "={{ $json.response_text }}",
        "options": {"appendAttribution": False}
    }, [400, 400], CRED_GMAIL))

    # Send SMS Response
    add(node("Send SMS Response", "n8n-nodes-base.twilio", 1, {
        "from": "=" + TWILIO_FROM,
        "to": "={{ $json.phone }}",
        "message": "={{ $json.response_text.replace(/<br\\s*\\/?>/gi, '\\n').replace(/<\\/p>/gi, '\\n\\n').replace(/<[^>]*>/g, '') }}",
        "options": {}
    }, [400, 600], CRED_TWILIO))

    # Send Telegram Response
    add(tg_send("Send Telegram Response",
        "={{ $json.chat_id }}",
        "={{ $json.response_text }}",
        [400, 800]))

    # ============================================================
    # SECTION 10: VENDOR DISPATCH (urgent path only)
    # ============================================================

    add(pg_query("Lookup Vendor",
        "SELECT vendor_name AS \"Vendor Name\", email AS \"Email\", phone AS \"Phone\" "
        "FROM vendors WHERE category = '{{ $json.category }}'",
        [-500, 200]))

    # AI Vendor Message (Haiku chain)
    add(node("AI Vendor Message", "@n8n/n8n-nodes-langchain.chainLlm", 1.4, {
        "promptType": "define",
        "text": "=Issue category: {{ $('Urgent Ack Template').item.json.category }}\nIssue summary: {{ $('Urgent Ack Template').item.json.summary }}\nVendor name: {{ $json['Vendor Name'] }}\nProperty address: {{ $('Urgent Ack Template').item.json.property }}\nUnit: {{ $('Urgent Ack Template').item.json.unit }}",
        "hasOutputParser": True,
        "messages": {"messageValues": [{"message": VENDOR_SYSTEM_PROMPT}]}
    }, [-100, 0]))

    add(node("Haiku - Vendor", "@n8n/n8n-nodes-langchain.lmChatAnthropic", 1.3, {
        "model": {"__rl": True, "value": "claude-haiku-4-5-20251001", "mode": "list"},
        "options": {"temperature": 0.5}
    }, [-100, 220], CRED_ANTHROPIC))

    add(node("Vendor Message Parser", "@n8n/n8n-nodes-langchain.outputParserStructured", 1.2, {
        "jsonSchemaExample": '{\n  "subject": "Urgent Plumbing Request - Julia Inc",\n  "body": "<p>Hi vendor...</p>"\n}'
    }, [30, 220]))

    add(node("Email Vendor", "n8n-nodes-base.gmail", 2.1, {
        "sendTo": "={{ $('Lookup Vendor').item.json['Email'] }}",
        "subject": "={{ $json.output.subject }}",
        "message": "={{ $json.output.body }}",
        "options": {"appendAttribution": False}
    }, [300, -100], CRED_GMAIL))

    add(node("SMS Vendor", "n8n-nodes-base.twilio", 1, {
        "from": "=" + TWILIO_FROM,
        "to": "={{ $('Lookup Vendor').item.json['Phone'] }}",
        "message": "={{ $json.output.body.replace(/<br\\s*\\/?>/gi, '\\n').replace(/<\\/p>/gi, '\\n\\n').replace(/<[^>]*>/g, '') }}",
        "options": {}
    }, [300, 100], CRED_TWILIO))

    # ============================================================
    # SECTION 11: TICKET + MESSAGE LOGGING
    # ============================================================

    # Generate Ticket ID
    add(set_node("Generate Ticket ID", [
        ("ticket_id", "={{ 'TK-' + $now.setZone('America/New_York').format('MMddHHmmss') }}", "string"),
    ], [600, 400]))

    # Create Ticket (PG) - works for all urgency levels
    add(pg_query("Create Ticket",
        "INSERT INTO maintenance_requests (ticket_id, tenant_name, phone, property, unit, channel, "
        "type, category, summary, status, keywords, tenant_message, telegram_id, created_at, updated_at) "
        "VALUES ("
        "'{{ $json.ticket_id }}', "
        "'{{ $('Prepare Data').item.json.tenant_name }}', "
        "'{{ $('Prepare Data').item.json.phone }}', "
        "'{{ $('Prepare Data').item.json.property }}', "
        "'{{ $('Prepare Data').item.json.unit }}', "
        "'{{ $('Prepare Data').item.json.channel }}', "
        "'{{ $('Classify Message').item.json.output.urgency }}', "
        "'{{ $('Classify Message').item.json.output.category }}', "
        "'{{ $('Classify Message').item.json.output.summary }}', "
        "'{{ $('Classify Message').item.json.output.urgency === \"urgent\" ? \"wait_for_approval\" : \"open\" }}', "
        "'{{ $('Classify Message').item.json.output.keyword }}', "
        "'{{ $('Prepare Data').item.json.message }}', "
        "'{{ $('Prepare Data').item.json.telegram_id }}', "
        "NOW(), NOW()) RETURNING *",
        [800, 400]))

    # Mirror Ticket to Sheets (tickets only)
    add(node("Mirror Ticket to Sheets", "n8n-nodes-base.googleSheets", 4.7, {
        "operation": "append",
        "documentId": {"__rl": True, "value": SHEETS_DOC_ID, "mode": "id"},
        "sheetName": {"__rl": True, "value": 1654455059, "mode": "list", "cachedResultName": "Open tickets"},
        "columns": {
            "mappingMode": "defineBelow",
            "value": {
                "ticket_id": "={{ $json.ticket_id }}",
                "created_at": "={{ $now.setZone('America/New_York').format('yyyy-MM-dd HH:mm') }}",
                "tenant_name": "={{ $json.tenant_name }}",
                "phone": "={{ $json.phone }}",
                "unit": "={{ $json.unit }}",
                "property": "={{ $json.property }}",
                "channel": "={{ $json.channel }}",
                "type": "={{ $json.type }}",
                "category": "={{ $json.category }}",
                "summary": "={{ $json.summary }}",
                "status": "={{ $json.status }}",
                "keywords": "={{ $json.keywords }}",
                "tenant_message": "={{ $json.tenant_message }}",
                "telegram": "={{ $json.telegram_id }}"
            },
            "matchingColumns": [],
            "schema": [],
            "attemptToConvertTypes": False,
            "convertFieldsToString": False
        },
        "options": {}
    }, [1100, 400], CRED_SHEETS))

    # Log Message (PG)
    add(pg_query("Log Message",
        "INSERT INTO messages (chat_id, message_id, telegram_id, sender, message_text, channel, created_at) "
        "VALUES ("
        "'{{ $('Prepare Data').item.json.chat_id || $('Prepare Data').item.json.sender_identifier }}', "
        "'{{ $('Telegram Trigger').isExecuted ? ($json.message?.message_id || $json.callback_query?.message?.message_id || '') : '' }}', "
        "'{{ $('Prepare Data').item.json.telegram_id }}', "
        "'{{ $('Prepare Data').item.json.tenant_name }}', "
        "'{{ $('Prepare Data').item.json.message }}', "
        "'{{ $('Prepare Data').item.json.channel }}', "
        "NOW()) RETURNING *",
        [600, 900]))

    # Update Message with ticket_id (PG) - single node, multiple inputs
    add(pg_query("Update Message Ticket",
        "UPDATE messages SET ticket_id = '{{ $json.ticket_id }}' "
        "WHERE chat_id = '{{ $('Prepare Data').item.json.chat_id || $('Prepare Data').item.json.sender_identifier }}' "
        "AND ticket_id IS NULL "
        "ORDER BY created_at DESC LIMIT 1 RETURNING *",
        [1000, 900]))

    # ============================================================
    # SECTION 12: OWNER APPROVAL FLOW (Telegram urgent only)
    # ============================================================

    # Get message history for landlord briefing
    add(pg_query("Get Message History",
        "SELECT * FROM messages WHERE chat_id = '{{ $('Prepare Data').item.json.chat_id }}' "
        "ORDER BY created_at DESC LIMIT 10",
        [600, -200]))

    add(node("Aggregate Messages", "n8n-nodes-base.aggregate", 1, {
        "aggregate": "aggregateAllItemData",
        "options": {}
    }, [800, -200]))

    # AI Landlord Briefing (Haiku)
    add(node("AI Landlord Briefing", "@n8n/n8n-nodes-langchain.chainLlm", 1.4, {
        "promptType": "define",
        "text": "=Tenant: {{ $('Prepare Data').item.json.tenant_name }}\nIssue: {{ $('Classify Message').item.json.output.summary }}\n\nMessage history:\n{{ JSON.stringify($json.data, null, 2) }}",
        "hasOutputParser": False,
        "messages": {"messageValues": [{"message": LANDLORD_BRIEFING_SYSTEM}]}
    }, [1000, -200]))

    add(node("Haiku - Briefing", "@n8n/n8n-nodes-langchain.lmChatAnthropic", 1.3, {
        "model": {"__rl": True, "value": "claude-haiku-4-5-20251001", "mode": "list"},
        "options": {"temperature": 0.5}
    }, [1000, 20], CRED_ANTHROPIC))

    # Owner Notification with accept/decline buttons
    add(node("Owner Notification", "n8n-nodes-base.telegram", 1.2, {
        "chatId": "=" + OWNER_CHAT_ID,
        "text": "=\U0001f6a8 URGENT TICKET\n\n{{ $('Classify Message').item.json.output.summary }}\n\n\U0001f4cb Context:\n{{ $json.text }}\n\n\U0001f4ac Tenant Message:\n{{ $('Prepare Data').item.json.message }}\n\nTenant: {{ $('Prepare Data').item.json.tenant_name }}\nPhone: {{ $('Prepare Data').item.json.phone }}\nAddress: {{ $('Prepare Data').item.json.property }}\nUnit: {{ $('Prepare Data').item.json.unit }}\n\nDispatch {{ $('Classify Message').item.json.output.category }} contractors?",
        "replyMarkup": "inlineKeyboard",
        "inlineKeyboard": {"rows": [{"row": {"buttons": [
            {"text": "accept", "additionalFields": {"callback_data": "=accept||{{ $('Create Ticket').item.json.ticket_id }}"}},
            {"text": "decline", "additionalFields": {"callback_data": "=decline||{{ $('Create Ticket').item.json.ticket_id }}"}}
        ]}}]},
        "additionalFields": {"appendAttribution": False}
    }, [1200, -200], CRED_TELEGRAM))

    # Delete processing message after owner gets notification
    add(node("Delete Processing Msg", "n8n-nodes-base.telegram", 1.2, {
        "operation": "deleteMessage",
        "chatId": "={{ $('Prepare Data').item.json.chat_id }}",
        "messageId": "={{ $('Processing...1').item.json.result?.message_id || $('Processing').item.json.result?.message_id || '' }}",
        "additionalFields": {}
    }, [1400, -200], CRED_TELEGRAM))

    # ============================================================
    # SECTION 13: CALLBACK HANDLING (accept/decline from owner)
    # ============================================================
    # These are kept from original with minor modifications

    # The Telegram Router in If1/Switch2 handles callbacks
    # Extract needed nodes from original
    for name in ["If1", "Switch2", "Edit a text message2",
                  "When Tenant Click on button to add Photo", "Ignore?", "Wait", "Ignored"]:
        if name in orig_nodes:
            add(copy.deepcopy(orig_nodes[name]))

    # Lookup Ticket for approval (single node for both accept + decline)
    add(pg_query("Lookup Ticket",
        "SELECT id, ticket_id, tenant_name, COALESCE(phone, tenant_phone) AS phone, "
        "COALESCE(unit, unit_number) AS unit, property, "
        "COALESCE(telegram_id, telegram_chat_id) AS telegram, "
        "category, summary, status "
        'FROM maintenance_requests WHERE ticket_id = \'{{ $("Set Telegram Data").item.json.data.split("||"'
        ')[1] }}\'',
        [-4800, 2400]))

    # Accept/Decline Switch
    accept_decline_rules = [
        {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 3},
                "conditions": [{"id": uid(), "leftValue": "={{ $('Set Telegram Data').item.json.data }}",
                               "rightValue": "accept", "operator": {"type": "string", "operation": "startsWith"}}],
                "combinator": "and"
            },
            "renameOutput": True, "outputKey": "accept"
        },
        {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 3},
                "conditions": [{"id": uid(), "leftValue": "={{ $('Set Telegram Data').item.json.data }}",
                               "rightValue": "decline", "operator": {"type": "string", "operation": "startsWith"}}],
                "combinator": "and"
            },
            "renameOutput": True, "outputKey": "decline"
        }
    ]

    add(node("Accept or Decline?", "n8n-nodes-base.switch", 3.4, {
        "rules": {"values": accept_decline_rules},
        "options": {}
    }, [-4400, 2400]))

    # Update ticket: accepted
    add(pg_query("Update Ticket: Accepted",
        "UPDATE maintenance_requests SET status = 'vendor_contacted', updated_at = NOW() "
        'WHERE ticket_id = \'{{ $("Set Telegram Data").item.json.data.split("||"'
        ')[1] }}\' RETURNING *',
        [-4000, 2200]))

    # Update ticket: declined
    add(pg_query("Update Ticket: Declined",
        "UPDATE maintenance_requests SET status = 'manual_review', updated_at = NOW() "
        'WHERE ticket_id = \'{{ $("Set Telegram Data").item.json.data.split("||"'
        ')[1] }}\' RETURNING *',
        [-4000, 2600]))

    # Vendor dispatch for accepted tickets
    add(pg_query("Lookup Vendor for Approval",
        "SELECT vendor_name AS \"Vendor Name\", email AS \"Email\", phone AS \"Phone\" "
        "FROM vendors WHERE category = '{{ $('Lookup Ticket').item.json.category }}'",
        [-3600, 2200]))

    # Vendor message for accepted (reuse same AI chain node name pattern)
    add(node("AI Vendor Msg (Approval)", "@n8n/n8n-nodes-langchain.chainLlm", 1.4, {
        "promptType": "define",
        "text": "=Issue category: {{ $('Lookup Ticket').item.json.category }}\nIssue summary: {{ $('Lookup Ticket').item.json.summary }}\nVendor name: {{ $json['Vendor Name'] }}\nProperty address: {{ $('Lookup Ticket').item.json.property }}\nUnit: {{ $('Lookup Ticket').item.json.unit }}",
        "hasOutputParser": True,
        "messages": {"messageValues": [{"message": VENDOR_SYSTEM_PROMPT}]}
    }, [-3200, 2200]))

    add(node("Haiku - Vendor Approval", "@n8n/n8n-nodes-langchain.lmChatAnthropic", 1.3, {
        "model": {"__rl": True, "value": "claude-haiku-4-5-20251001", "mode": "list"},
        "options": {"temperature": 0.5}
    }, [-3200, 2420], CRED_ANTHROPIC))

    add(node("Vendor Approval Parser", "@n8n/n8n-nodes-langchain.outputParserStructured", 1.2, {
        "jsonSchemaExample": '{\n  "subject": "Urgent Service Request",\n  "body": "<p>Hi...</p>"\n}'
    }, [-3070, 2420]))

    add(node("Email Vendor (Approval)", "n8n-nodes-base.gmail", 2.1, {
        "sendTo": "={{ $('Lookup Vendor for Approval').item.json['Email'] }}",
        "subject": "={{ $json.output.subject }}",
        "message": "={{ $json.output.body }}",
        "options": {"appendAttribution": False}
    }, [-2800, 2100], CRED_GMAIL))

    add(node("SMS Vendor (Approval)", "n8n-nodes-base.twilio", 1, {
        "from": "=" + TWILIO_FROM,
        "to": "={{ $('Lookup Vendor for Approval').item.json['Phone'] }}",
        "message": "={{ $json.output.body.replace(/<br\\s*\\/?>/gi, '\\n').replace(/<\\/p>/gi, '\\n\\n').replace(/<[^>]*>/g, '') }}",
        "options": {}
    }, [-2800, 2300], CRED_TWILIO))

    # Post-approval tenant ack via Telegram
    add(tg_send("Send Approval Ack",
        "={{ $('Lookup Ticket').item.json.telegram }}",
        "=Your urgent issue has been reviewed and we have contacted specialists. You should hear back shortly.\n\n— Julia Inc",
        [-2400, 2200]))

    # Post-decline tenant ack
    add(tg_send("Send Decline Ack",
        "={{ $('Lookup Ticket').item.json.telegram }}",
        "=Your issue is being reviewed by management. We will follow up shortly.\n\n— Julia Inc",
        [-3600, 2600]))

    # ============================================================
    # SECTION 14: PHOTO/DRIVE FLOW (extract from original)
    # ============================================================

    photo_nodes = [
        "Get row(s) in sheet", "Sort", "Limit2", "Get Picture", "Download Picture",
        "Edit Fields", "Get Ticket Info1", "Does Property Folder Exist?",
        "Does it Exist?", "Create Property Folder", "Does Tenant Folder Exist?",
        "Does it Exist?1", "Create Tenant Folder", "Upload file",
        "Edit a text message1", "No Operation, do nothing",
        "Get Ticket Info", "Send Telegram Buttons to Tenant",
        "Does Ticket Exist?1", "Append row in sheet", "Don't Log"
    ]
    for name in photo_nodes:
        if name in orig_nodes:
            add(copy.deepcopy(orig_nodes[name]))

    # Replace Get Tenant Info1 and Get Tenant Info2 with PG lookups
    add(pg_query("Get Tenant Info (Photo)",
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", "
        "t.unit_number AS \"Unit\", t.email AS \"Email\", "
        "p.address AS \"Property\", t.telegram_id AS \"Telegram\" "
        "FROM tenants t LEFT JOIN properties p ON t.property_id = p.id "
        "WHERE t.telegram_id = '{{ $('Set Telegram Data').item.json.chat_id }}'",
        [-3500, 2800]))

    add(pg_query("Get Open Tickets (Photo)",
        "SELECT id, ticket_id, tenant_name, COALESCE(phone, tenant_phone) AS phone, "
        "category, summary, keywords, status "
        "FROM maintenance_requests "
        "WHERE (telegram_id = '{{ $('Set Telegram Data').item.json.chat_id }}' "
        "OR telegram_chat_id = '{{ $('Set Telegram Data').item.json.chat_id }}') "
        "AND status NOT IN ('closed') ORDER BY created_at DESC",
        [-3200, 2800]))

    add(pg_query("Update Ticket Media",
        "UPDATE maintenance_requests SET media = 'https://drive.google.com/drive/folders/{{ $json.parents[0] }}', "
        "updated_at = NOW() "
        'WHERE ticket_id = \'{{ $("Set Telegram Data").item.json.data.split("||"'
        ')[1] }}\' RETURNING *',
        [-1200, 2800]))

    add(pg_query("Log Pending Media",
        'UPDATE pending_media SET ticket_id = \'{{ $("Set Telegram Data").item.json.data.split("||"'
        ')[1] }}\' '
        'WHERE file_id = \'{{ $("Download Picture").item.json.result.file_id }}\' '
        'AND chat_id = \'{{ $("Set Telegram Data").item.json.chat_id }}\' RETURNING *',
        [-1000, 2800]))

    # ============================================================
    # SECTION 15: REGISTRATION FLOW (extract + modify)
    # ============================================================

    for name in ["REGISTRATION", "Get Phone/ID", "Wait1", "Edit a text message3"]:
        if name in orig_nodes:
            add(copy.deepcopy(orig_nodes[name]))

    add(pg_query("Lookup by Phone",
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\" "
        "FROM tenants t WHERE t.phone LIKE '%' || '{{ $json.phone }}' || '%'",
        [-3600, 1600]))

    add(tg_send("Welcome Message",
        "={{ $('Telegram Trigger').item.json.message.chat.id }}",
        "=\u2705 Registration successful! You are now linked to your tenant account. Send us a message to create a ticket.",
        [-3200, 1600]))

    add(pg_query("Update Tenant Telegram ID",
        "UPDATE tenants SET telegram_id = '{{ $('Telegram Trigger').item.json.message.from.id }}' "
        "WHERE phone = '{{ $('Telegram Trigger').item.json.message.text.split('/start TEN_')[1] }}' RETURNING *",
        [-2800, 1600]))

    # Telegram Router for text vs /start vs photo
    # If2 from original handles this
    for name in ["If2", "First Time?"]:
        if name in orig_nodes:
            add(copy.deepcopy(orig_nodes[name]))

    # Get Tenant Info for Telegram (single PG lookup)
    add(pg_query("Get Tenant Info",
        "SELECT t.*, t.name AS \"Tenant Name\", t.phone AS \"Phone\", "
        "t.unit_number AS \"Unit\", t.email AS \"Email\", "
        "p.address AS \"Property\", t.telegram_id AS \"Telegram\", t.language_pref "
        "FROM tenants t LEFT JOIN properties p ON t.property_id = p.id "
        "WHERE t.telegram_id = '{{ $('Set Telegram Data').item.json.chat_id }}'",
        [-4800, 1600]))

    # CHECK IF TICKET EXISTS label
    add(node("CHECK IF TICKET EXISTS", "n8n-nodes-base.noOp", 1, {}, [-4400, 1600]))

    # ============================================================
    # SECTION 16: TELEGRAM LOG MESSAGE (runs in parallel)
    # ============================================================

    # If5 from original (check if not bot_command)
    if "If5" in orig_nodes:
        add(copy.deepcopy(orig_nodes["If5"]))

    add(pg_query("Log Telegram Message",
        "INSERT INTO messages (chat_id, message_id, telegram_id, sender, message_text, channel, created_at) "
        "VALUES ("
        "'{{ $json.message?.chat?.id || $json.callback_query?.message?.chat?.id }}', "
        "'{{ $json.message?.message_id || $json.callback_query?.message?.message_id }}', "
        "'{{ $json.message?.from?.id || $json.callback_query?.from?.id }}', "
        "'{{ $json.message?.from?.first_name || $json.callback_query?.from?.first_name }}', "
        "'{{ $json.message?.text || $json.callback_query?.message?.text }}', "
        "'telegram', NOW()) RETURNING *",
        [-6200, 1600]))

    # ============================================================
    # CONNECTIONS
    # ============================================================

    # --- Entry → Normalize ---
    link("Gmail Trigger", ["Normalize Email"])
    link("Urgent", ["Normalize SMS"])
    link("General", ["Normalize SMS"])
    link("Other", ["Normalize SMS"])

    # Telegram entry
    link("Telegram Trigger", ["If3", "If5"])
    link("If3", ["Processing"], 0)      # callback
    link("If3", ["Processing...1"], 1)   # not callback
    link("Processing", ["Set Telegram Data"])
    link("Processing...1", ["Set Telegram Data"])
    link("Set Telegram Data", ["If1"])

    # If1: photo ticket selection callback vs other
    link("If1", ["When Tenant Click on button to add Photo"], 0)
    link("If1", ["Switch2"], 1)

    # Switch2: ticket callback (0), photo (1), regular message (2)
    link("Switch2", ["Edit a text message2"], 0)
    link("Switch2", ["Get Tenant Info (Photo)"], 1)
    link("Switch2", ["If2"], 2)

    # If2: valid message vs too short
    link("If2", ["Get Tenant Info"], 0)
    link("If2", ["Wait1"], 1)
    link("Wait1", ["Edit a text message3"])

    # Telegram message log (parallel)
    link("If5", ["Log Telegram Message"], 1)

    # --- Normalize → Merge → Lookup ---
    link("Normalize Email", ["Merge Point"])
    link("Normalize SMS", ["Merge Point"])
    link("Normalize Telegram", ["Merge Point"])
    link("Merge Point", ["Lookup Tenant"])
    link("Lookup Tenant", ["Is Tenant?"])
    link("Is Tenant?", ["Prepare Data"], 0)     # found (isEmpty=false → output 0 is TRUE... wait)

    # Note: Is Tenant? checks $json.isEmpty() with operation "false" (meaning: is it false that it's empty? = has data)
    # Actually the if_node helper creates: leftValue=$json.isEmpty(), operator=boolean/false, singleValue=True
    # This means: is $json.isEmpty() == false? If true → output 0 (has tenant), if false → output 1 (empty)
    # Wait, let me reconsider. The IF node checks: $json.isEmpty() is false → yes (output 0) = tenant found
    # $json.isEmpty() is true → no (output 1) = not found
    # So output 0 = tenant found, output 1 = not found. But I set the operation to "false"...
    # Actually in n8n IF node: operator boolean "false" checks if the left value evaluates to false
    # isEmpty() returns true when empty. So "false" operator on isEmpty() means: "is empty == false" = "has data"
    # Output 0 = condition TRUE = has data. Output 1 = condition FALSE = is empty. CORRECT.

    link("Is Tenant?", ["Unknown Sender"], 1)

    # --- Prepare Data → Ticket Relatability → Classification ---
    link("Prepare Data", ["Get Open Tickets"])
    link("Get Open Tickets", ["Has Open Tickets?"])
    link("Has Open Tickets?", ["Classify Relatability"], 0)  # has tickets
    link("Has Open Tickets?", ["Classify Message"], 1)        # no tickets → classify directly

    # Classify Relatability → Is New Ticket? IF node
    link("Classify Relatability", ["Is New Ticket?"])
    link("Is New Ticket?", ["Classify Message"], 0)    # new ticket (not related)
    link("Is New Ticket?", ["Ticket Exists Ack"], 1)   # existing ticket (related)

    link("Classify Message", ["Route by Classification"])

    # --- Routing outputs ---
    link("Route by Classification", ["Urgent Ack Template"], 0)     # urgent
    link("Route by Classification", ["Non-Urgent Ack Template"], 1) # not_urgent
    link("Route by Classification", ["AI Response"], 2)              # request
    link("Route by Classification", ["Conversational Template"], 3)  # conversation (+ fallback)
    link("Route by Classification", ["No Responsibility Response"], 4) # not_our_responsibility
    link("Route by Classification", ["AI Response"], 5)              # question (same as request)

    # --- Response → Dispatcher ---
    link("Non-Urgent Ack Template", ["Channel Dispatcher", "Generate Ticket ID"])
    link("Conversational Template", ["Channel Dispatcher"])
    link("AI Response", ["Format AI Response"])
    link("No Responsibility Response", ["Format AI Response"])
    link("Format AI Response", ["Channel Dispatcher", "Generate Ticket ID"])
    link("Ticket Exists Ack", ["Channel Dispatcher"])

    # Urgent path: ack → dispatch, vendor lookup, ticket creation, owner alert
    link("Urgent Ack Template", ["Channel Dispatcher", "Lookup Vendor", "Generate Ticket ID", "Get Message History"])

    link("Channel Dispatcher", ["Send Email Response"], 0)
    link("Channel Dispatcher", ["Send SMS Response"], 1)
    link("Channel Dispatcher", ["Send Telegram Response"], 2)

    # --- Log message after response ---
    link("Send Email Response", ["Log Message"])
    link("Send SMS Response", ["Log Message"])
    link("Send Telegram Response", ["Log Message"])

    # --- Vendor dispatch ---
    link("Lookup Vendor", ["AI Vendor Message"])
    link("AI Vendor Message", ["Email Vendor", "SMS Vendor"])

    # --- Ticket logging ---
    link("Generate Ticket ID", ["Create Ticket"])
    link("Create Ticket", ["Mirror Ticket to Sheets", "Update Message Ticket"])

    # --- Owner approval flow (urgent Telegram) ---
    link("Get Message History", ["Aggregate Messages"])
    link("Aggregate Messages", ["AI Landlord Briefing"])
    link("AI Landlord Briefing", ["Owner Notification"])
    link("Owner Notification", ["Delete Processing Msg"])

    # --- Callback handling ---
    link("Edit a text message2", ["Lookup Ticket"])
    link("Lookup Ticket", ["Accept or Decline?"])
    link("Accept or Decline?", ["Update Ticket: Accepted"], 0)
    link("Accept or Decline?", ["Update Ticket: Declined"], 1)
    link("Update Ticket: Accepted", ["Lookup Vendor for Approval"])
    link("Lookup Vendor for Approval", ["AI Vendor Msg (Approval)"])
    link("AI Vendor Msg (Approval)", ["Email Vendor (Approval)", "SMS Vendor (Approval)"])
    link("SMS Vendor (Approval)", ["Send Approval Ack"])
    link("Update Ticket: Declined", ["Send Decline Ack"])

    # --- Photo flow ---
    link("Get Tenant Info (Photo)", ["Get Open Tickets (Photo)"])
    link("Get Open Tickets (Photo)", ["Get Ticket Info"])
    link("Get Ticket Info", ["Send Telegram Buttons to Tenant"])
    link("Send Telegram Buttons to Tenant", ["Does Ticket Exist?1"])
    link("Does Ticket Exist?1", ["Append row in sheet"], 0)
    link("Does Ticket Exist?1", ["Don't Log"], 1)

    # Photo upload sub-flow
    link("When Tenant Click on button to add Photo", ["Ignore?"])
    link("Ignore?", ["Wait"], 0)
    link("Ignore?", ["Get row(s) in sheet"], 1)
    link("Wait", ["Ignored"])
    link("Get row(s) in sheet", ["Sort"])
    link("Sort", ["Limit2"])
    link("Limit2", ["Get Picture"])
    link("Get Picture", ["Download Picture"])
    link("Download Picture", ["Edit Fields"])
    link("Edit Fields", ["Get Ticket Info1"])
    link("Get Ticket Info1", ["Does Property Folder Exist?"])
    link("Does Property Folder Exist?", ["Does it Exist?"])
    link("Does it Exist?", ["Does Tenant Folder Exist?"], 0)
    link("Does it Exist?", ["Create Property Folder"], 1)
    link("Create Property Folder", ["Does Tenant Folder Exist?"])
    link("Does Tenant Folder Exist?", ["Does it Exist?1"])
    link("Does it Exist?1", ["Upload file"], 0)
    link("Does it Exist?1", ["Create Tenant Folder"], 1)
    link("Create Tenant Folder", ["Upload file"])
    link("Upload file", ["Update Ticket Media"])
    link("Update Ticket Media", ["Log Pending Media"])
    link("Log Pending Media", ["Edit a text message1"])

    # Photo from text message flow
    link("Text only Message?", ["Normalize Telegram"], 0)  # text → unified pipeline
    link("Text only Message?", ["No Operation, do nothing"], 1)  # photo
    link("No Operation, do nothing", ["Get Tenant Info (Photo)"])

    # --- Registration flow ---
    link("Get Tenant Info", ["First Time?"])
    link("First Time?", ["REGISTRATION"], 0)
    link("First Time?", ["CHECK IF TICKET EXISTS"], 1)
    link("REGISTRATION", ["Get Phone/ID"])
    link("Get Phone/ID", ["Lookup by Phone"])
    link("Lookup by Phone", ["Welcome Message"])
    link("Welcome Message", ["Update Tenant Telegram ID"])

    link("CHECK IF TICKET EXISTS", ["Get Open Tickets"])
    # Wait, this connects to the SAME "Get Open Tickets" as the unified pipeline.
    # That's actually fine because it's the same data needed.
    # But the Telegram path goes through Set Telegram Data → If2 → Get Tenant Info → First Time? →
    # CHECK IF TICKET EXISTS → ??? → Text only Message? → Normalize Telegram → Merge Point → ...

    # Hmm, the Telegram text path needs to go through:
    # Get Tenant Info → First Time? → (no) → CHECK IF TICKET EXISTS → Get all tenant tickets →
    # Text only Message? → (text) → unified pipeline

    # But in the unified pipeline, the data goes through Merge Point → Lookup Tenant again.
    # That's redundant for Telegram since we already looked up the tenant.

    # For simplicity, let's have the Telegram text path join the unified pipeline after Prepare Data,
    # bypassing the redundant lookup. But this complicates things.

    # Actually, the simplest approach: for Telegram text messages, don't go through the unified
    # normalization + lookup at all. Instead, go through the Telegram-specific path:
    # Get Tenant Info → First Time? → (returning) → CHECK IF TICKET EXISTS → (get tickets) →
    # Text only Message? → (text) → then feed into the classification step directly.

    # This means Telegram text doesn't go through Merge Point / Lookup Tenant / Prepare Data.
    # Instead, we need a Telegram-specific "Prepare Data" that builds the same structure.

    # Let me add a "Prepare Telegram Data" Set node for this path:
    add(set_node("Prepare Telegram Data", [
        ("tenant_name", "={{ $('Get Tenant Info').item.json['Tenant Name'] }}", "string"),
        ("phone", "={{ $('Get Tenant Info').item.json.Phone }}", "string"),
        ("unit", "={{ $('Get Tenant Info').item.json.Unit }}", "string"),
        ("property", "={{ $('Get Tenant Info').item.json.Property }}", "string"),
        ("email", "={{ $('Get Tenant Info').item.json.Email }}", "string"),
        ("telegram_id", "={{ $('Get Tenant Info').item.json.Telegram }}", "string"),
        ("language_pref", "={{ $('Get Tenant Info').item.json.language_pref || 'fr' }}", "string"),
        ("channel", "telegram", "string"),
        ("message", "={{ $('Set Telegram Data').item.json.message_text }}", "string"),
        ("subject", "", "string"),
        ("chat_id", "={{ $('Set Telegram Data').item.json.chat_id }}", "string"),
        ("sender_identifier", "={{ $('Set Telegram Data').item.json.chat_id }}", "string"),
    ], [-3600, 1300]))

    # Fix: Text only Message? text output goes to Prepare Telegram Data, not Normalize Telegram
    # Remove the previous wrong connection
    if "Text only Message?" in connections:
        del connections["Text only Message?"]

    link("CHECK IF TICKET EXISTS", ["Prepare Telegram Data"])
    link("Prepare Telegram Data", ["Get Open Tickets"])

    # Now the Telegram text path merges with the unified pipeline at Get Open Tickets → Has Open Tickets? → Classify

    # --- AI sub-connections (model → chain, parser → chain) ---
    ai_link("Haiku - Classify", "Classify Message")
    parser_link("Classification Parser", "Classify Message")
    ai_link("Haiku - Relatability", "Classify Relatability")
    parser_link("Relatability Parser", "Classify Relatability")
    ai_link("Haiku - Vendor", "AI Vendor Message")
    parser_link("Vendor Message Parser", "AI Vendor Message")
    ai_link("Haiku - Briefing", "AI Landlord Briefing")
    ai_link("Haiku - Vendor Approval", "AI Vendor Msg (Approval)")
    parser_link("Vendor Approval Parser", "AI Vendor Msg (Approval)")

    # ============================================================
    # BUILD WORKFLOW
    # ============================================================

    workflow = {
        "name": "Property Management - Tenant Message Handler (OPTIMIZED)",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {
            "executionOrder": "v1"
        },
        "versionId": uid(),
        "tags": []
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(workflow, f, indent=2)

    # Stats
    node_types = {}
    for n in nodes:
        t = n["type"].split(".")[-1]
        node_types[t] = node_types.get(t, 0) + 1

    print(f"\nOptimized workflow: {OUTPUT_FILE}")
    print(f"Total nodes: {len(nodes)}")
    print(f"\nNode types:")
    for t, c in sorted(node_types.items(), key=lambda x: -x[1]):
        print(f"  {t}: {c}")

    ai_count = sum(1 for n in nodes if "langchain" in n["type"] and "chain" in n["type"])
    print(f"\nAI chain calls: {ai_count}")
    print(f"All models: Haiku 4.5 (zero Sonnet)")


if __name__ == "__main__":
    build_workflow()

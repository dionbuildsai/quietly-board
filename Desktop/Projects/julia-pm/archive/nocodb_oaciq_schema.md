# NocoDB Schema: OACIQ Document Processing

## Overview

This normalized database schema is designed for Quietly Systems' OACIQ document processing pipeline. It supports:
- Multi-document transactions
- Participant tracking with roles
- Queryable extracted fields
- Full JSON backup for complete data
- Signature tracking per participant

---

## Tables

### 1. Transactions

The central table linking all documents, participants, and properties for a single real estate deal.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto Number | Primary key |
| `transaction_id` | Single Line Text | Your system-generated ID (e.g., `2124_rue_pigeon__2026__EBCD26048__`) |
| `property` | Link to Property | → Properties table |
| `status` | Single Select | `active`, `pending`, `closed`, `cancelled` |
| `asking_price` | Currency | Listing price |
| `sale_price` | Currency | Final sale price (if closed) |
| `contract_expiry_date` | Date | Brokerage contract expiry |
| `deed_signing_date` | Date | Scheduled closing date |
| `occupancy_date` | Date | Possession date |
| `remuneration_pct` | Decimal | Commission percentage |
| `shared_remuneration_pct` | Decimal | Collaborating broker share |
| `gst_qst_subject` | Checkbox | Tax applicable |
| `inclusions` | Long Text | Included items |
| `google_folder_id` | URL | Link to transaction folder |
| `notes` | Long Text | Internal notes |
| `created_at` | DateTime | Record creation |
| `updated_at` | DateTime | Last update |

**Linked Records:**
- → Documents (one-to-many)
- → Transaction_Participants (one-to-many)
- → Properties (many-to-one)

---

### 2. Properties

Reusable property records that can appear in multiple transactions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto Number | Primary key |
| `address` | Single Line Text | Full address |
| `street_number` | Single Line Text | Street number |
| `street_name` | Single Line Text | Street name |
| `unit` | Single Line Text | Unit/apt number |
| `city` | Single Line Text | City |
| `province` | Single Select | QC, ON, etc. |
| `postal_code` | Single Line Text | Postal code |
| `property_type` | Single Select | `condo`, `single_family`, `duplex`, `triplex`, `commercial` |
| `co_ownership_number` | Single Line Text | Cadastre/condo number |
| `area` | Decimal | Square footage/meters |
| `area_unit` | Single Select | `ft2`, `m2` |
| `parking_count` | Number | Number of parking spaces |
| `parking_type` | Single Select | `indoor`, `outdoor`, `garage` |
| `created_at` | DateTime | Record creation |

**Linked Records:**
- → Transactions (one-to-many)

---

### 3. Participants

All people involved in transactions: brokers, buyers, sellers.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto Number | Primary key |
| `name` | Single Line Text | Full name |
| `email` | Email | Primary email |
| `phone` | Phone Number | Primary phone |
| `address` | Long Text | Mailing address |
| `participant_type` | Single Select | `broker`, `buyer`, `seller` |
| `licence_number` | Single Line Text | OACIQ licence (brokers only) |
| `agency_name` | Single Line Text | Brokerage name (brokers only) |
| `is_canadian_resident` | Checkbox | For tax purposes |
| `id_document_type` | Single Select | `drivers_licence`, `passport`, `health_card` |
| `id_document_number` | Single Line Text | ID number |
| `id_expiration_date` | Date | ID expiry |
| `date_of_birth` | Date | DOB |
| `profession` | Single Line Text | Occupation |
| `created_at` | DateTime | Record creation |
| `updated_at` | DateTime | Last update |

**Linked Records:**
- → Transaction_Participants (one-to-many)
- → Signatures (one-to-many)

---

### 4. Transaction_Participants (Junction Table)

Links participants to transactions with their specific role.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto Number | Primary key |
| `transaction` | Link to Transaction | → Transactions table |
| `participant` | Link to Participant | → Participants table |
| `role` | Single Select | `listing_broker`, `collaborating_broker`, `seller1`, `seller2`, `buyer1`, `buyer2` |
| `is_primary` | Checkbox | Primary contact for this role |
| `created_at` | DateTime | Record creation |

---

### 5. Document_Types

Your OACIQ form registry — the classification reference.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto Number | Primary key |
| `doc_type` | Single Line Text | Short code (e.g., `bcl`, `dsd`, `pp`) |
| `family` | Single Select | `brokerage_contract`, `seller_declaration`, `counter_proposal`, `amendment`, `annex`, `enhancement` |
| `description` | Long Text | Full form name |
| `metadata_schema` | Long Text | JSON schema for extraction |
| `sections_schema` | Long Text | JSON schema for sections |
| `signature_schema` | Long Text | JSON schema for signatures |
| `key_identifiers` | Long Text | Keywords for classification |
| `positive_identifiers` | Long Text | Must-have keywords |
| `negative_identifiers` | Long Text | Exclusion keywords |
| `extra_instruction` | Long Text | Claude extraction instructions |
| `priority` | Number | Classification priority (higher = checked first) |
| `error_handling` | Long Text | Error recovery instructions |
| `language` | Single Select | `en`, `fr` |
| `version` | Single Line Text | Schema version |
| `json_status` | Single Select | `LOCKED`, `finished/need test`, `draft` |
| `is_active` | Checkbox | Currently in use |
| `created_at` | DateTime | Record creation |
| `updated_at` | DateTime | Last update |

**Linked Records:**
- → Documents (one-to-many)

---

### 6. Documents

Every extracted document, linked to transaction and document type.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto Number | Primary key |
| `transaction` | Link to Transaction | → Transactions table |
| `document_type` | Link to Document_Types | → Document_Types table |
| `file_name` | Single Line Text | Original filename |
| `property_address` | Single Line Text | Address (denormalized for quick access) |
| **Signature Status** | | |
| `signature_status` | Long Text | Per-party status text |
| `is_fully_signed` | Checkbox | All parties signed |
| **Extracted Key Fields** | | |
| `asking_price` | Currency | From extraction |
| `contract_expiry_date` | Date | From extraction |
| `deed_signing_date` | Date | From extraction |
| `occupancy_date` | Date | From extraction |
| `remuneration_pct` | Decimal | Commission % |
| `shared_remuneration_pct` | Decimal | Collab broker share |
| **Full Extraction** | | |
| `cp_response` | Long Text | Full Claude extraction JSON |
| `document_details` | Long Text | Parsed details |
| `participant_info` | Long Text | Extracted participant text |
| **Metadata** | | |
| `hash` | Single Line Text | File hash for deduplication |
| `certificate_id` | Single Line Text | Signature certificate ID |
| `signed_date` | Date | When signed |
| `signed_time` | Single Line Text | Time signed |
| `date_added` | DateTime | When processed |
| `generated_date` | Date | Document generation date |
| `generated_time` | Single Line Text | Generation time |
| **Google Drive** | | |
| `folder_id` | URL | Google Drive folder |
| `file_id` | Single Line Text | Google Drive file ID |
| `file_download` | URL | Download link |
| **Linked Docs** | | |
| `linked_docs` | Link to Documents | Self-referential (amendments → original) |
| `created_at` | DateTime | Record creation |
| `updated_at` | DateTime | Last update |

**Linked Records:**
- → Transaction (many-to-one)
- → Document_Types (many-to-one)
- → Signatures (one-to-many)
- → Documents (self-referential for linked_docs)

---

### 7. Signatures

Individual signature records per participant per document.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto Number | Primary key |
| `document` | Link to Documents | → Documents table |
| `participant` | Link to Participants | → Participants table |
| `role` | Single Select | Role at time of signing |
| `status` | Single Select | `pending`, `signed`, `declined`, `expired` |
| `signed_at` | DateTime | Signature timestamp |
| `certificate_id` | Single Line Text | Signature certificate |
| `ip_address` | Single Line Text | Signing IP (if tracked) |
| `created_at` | DateTime | Record creation |

---

### 8. Certificate_Log

Signature certificate extraction records.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto Number | Primary key |
| `transaction` | Link to Transaction | → Transactions table |
| `document` | Link to Documents | → Documents table |
| `certificate_id` | Single Line Text | Certificate ID |
| `hash` | Single Line Text | Certificate hash |
| `file_name` | Single Line Text | Certificate filename |
| `property_address` | Single Line Text | Property address |
| `participants_names` | Long Text | Signer names |
| `participants_emails` | Long Text | Signer emails |
| `google_folder_id` | URL | Drive folder |
| `file_id` | Single Line Text | Drive file ID |
| `date_added` | DateTime | When processed |
| `created_at` | DateTime | Record creation |

---

## Relationships Diagram

```
┌─────────────────┐
│   Properties    │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│  Transactions   │◄──────│ Transaction_    │
│                 │  1:N  │ Participants    │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ N:1
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│   Documents     │       │  Participants   │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ N:1                     │ 1:N
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│ Document_Types  │       │   Signatures    │
└─────────────────┘       └─────────────────┘
         
┌─────────────────┐
│ Certificate_Log │──► Documents, Transactions
└─────────────────┘
```

---

## Queryable Fields Summary

These fields are extracted from `cp_response` into dedicated columns for filtering:

| Field | Query Use Case |
|-------|---------------|
| `asking_price` | "Transactions over $500k" |
| `contract_expiry_date` | "Contracts expiring this month" |
| `deed_signing_date` | "Closings in next 30 days" |
| `occupancy_date` | "Upcoming possessions" |
| `remuneration_pct` | "Commission analysis" |
| `is_fully_signed` | "Documents pending signatures" |
| `signature_status` | "Who hasn't signed?" |

---

## n8n Integration Notes

### When a document is processed:

1. **Check if Transaction exists** (by `transaction_id`)
   - If not, create Transaction + Property records
2. **Check if Participants exist** (by email)
   - If not, create Participant records
   - Link via Transaction_Participants with role
3. **Create Document record**
   - Link to Transaction, Document_Type
   - Populate queryable fields from extraction
   - Store full `cp_response`
4. **Create Signature records** (one per signer)

### API Endpoints (NocoDB):

```
Base URL: https://your-nocodb-instance.com/api/v2

# Create transaction
POST /tables/Transactions/records

# Find participant by email
GET /tables/Participants/records?where=(email,eq,{email})

# Get all documents for transaction
GET /tables/Documents/records?where=(transaction,eq,{transaction_id})

# Update signature status
PATCH /tables/Signatures/records/{id}
```

---

## Next Steps

1. Create the base in NocoDB
2. Create tables in order: Properties → Participants → Document_Types → Transactions → Transaction_Participants → Documents → Signatures → Certificate_Log
3. Set up Link fields for relationships
4. Import your existing OACIQ form registry into Document_Types
5. Update n8n workflows to write to NocoDB API

---

*Schema Version: 1.0*  
*Designed for: Quietly Systems Inc.*  
*Date: March 2, 2026*

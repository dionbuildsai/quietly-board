# INCIDENT RESPONSE PLAN

**Quietly Systems Inc. — Internal Document**

**Last updated:** [DATE]

**Privacy Officer:** Dion Wang, CEO

---

## Purpose

This document establishes the procedure for responding to a confidentiality incident (data breach) involving personal information processed by Quietly Systems Inc. on behalf of its clients.

Under Quebec's Law 25, a "confidentiality incident" includes unauthorized access, use, disclosure, loss, or any other compromise of personal information.

---

## Step 1 — Detect and Contain (Immediately)

Upon becoming aware of a potential incident:

- [ ] Identify the nature of the incident (unauthorized access, data exposure, ransomware, lost device, etc.)
- [ ] Determine which systems are affected (VPS, database, API keys, email, file storage)
- [ ] Take immediate containment action:
  - Revoke compromised SSH keys or API tokens
  - Change database passwords if applicable
  - Take affected systems offline if necessary to stop ongoing exposure
  - Preserve logs and evidence (do NOT delete anything)
- [ ] Record the date and time the incident was discovered

---

## Step 2 — Assess Severity (Within 12 hours)

- [ ] Identify what personal information was affected:
  - Tenant identity (names, phones, emails, addresses)
  - Lease data (rent amounts, lease terms)
  - Communications (message transcripts, call recordings)
  - Financial data (expenses, mortgage details)
  - Authentication credentials (API tokens, OAuth tokens, passwords)
- [ ] Determine how many individuals are affected
- [ ] Assess whether the incident presents a risk of serious injury (identity theft, financial loss, physical safety, reputation, humiliation)
- [ ] Determine the cause (external attack, insider access, configuration error, third-party breach)
- [ ] Document findings in the Incident Register (see below)

---

## Step 3 — Notify Client (Within 48 hours of confirmation)

Per the Service Agreement (Section 6.7):

- [ ] Send written notice to the affected client(s) by email, including:
  - Date and time the incident was discovered
  - Nature of the incident
  - Categories of personal information affected
  - Estimated number of individuals affected
  - Measures taken to contain the incident
  - Recommended actions for the client
  - Quietly's contact for follow-up questions
- [ ] Provide the client with sufficient information to fulfill their own notification obligations under Law 25

---

## Step 4 — Support Client's CAI Notification (Client's responsibility, within 72 hours)

The client (data controller) is responsible for notifying:

1. **The Commission d'acces a l'information du Quebec (CAI)** — if the incident presents a risk of serious injury
   - Online form: https://www.cai.gouv.qc.ca/
   - Deadline: with diligence (practically within 72 hours of awareness)

2. **Affected individuals** — if the incident presents a risk of serious injury
   - Must include: description of incident, types of information affected, measures taken, contact for questions
   - Method: direct notice (email, mail) preferred; public notice only if direct notice is impossible

Quietly shall cooperate with the client in preparing these notifications and shall provide technical details as needed.

---

## Step 5 — Remediate (Within 7 days)

- [ ] Fix the root cause of the incident
- [ ] Implement additional security measures if applicable:
  - Rotate all API keys and tokens
  - Update SSH keys
  - Review and tighten access controls
  - Apply security patches
  - Enable additional monitoring or alerting
- [ ] Verify containment is complete (no ongoing exposure)
- [ ] Test restored systems before resuming normal operations

---

## Step 6 — Post-Incident Review (Within 14 days)

- [ ] Conduct a post-mortem analysis:
  - What happened and why
  - How it was detected
  - How effective was the response
  - What could be improved
- [ ] Update security measures and this Incident Response Plan as needed
- [ ] Brief the affected client(s) on the post-mortem findings and improvements made
- [ ] Update the Incident Register with the final resolution

---

## Incident Register

Law 25 (Art. 3.6) requires maintaining a register of all confidentiality incidents. Record each incident below (or in a separate secure file):

| # | Date Discovered | Date Contained | Description | PI Affected | Individuals Affected | Severity | Client Notified | CAI Notified (by client) | Resolution | Date Closed |
|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | |

This register must be maintained for a minimum of five (5) years after the date of the incident.

---

## Emergency Contact List

| Role | Name | Contact |
|---|---|---|
| Privacy Officer (Quietly) | Dion Wang | [phone / email] |
| VPS Provider (Hostinger) | Support | https://www.hostinger.com/contacts |
| Domain Registrar | [Provider] | [contact] |

---

## Annual Review

This plan shall be reviewed at least once per calendar year and updated as needed. The Privacy Officer is responsible for conducting the review.

Last reviewed: [DATE]
Next review due: [DATE + 12 months]

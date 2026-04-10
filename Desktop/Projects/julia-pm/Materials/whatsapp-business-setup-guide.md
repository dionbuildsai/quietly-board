# WhatsApp Business API Setup Guide — From Zero to Template Buttons

> A complete walkthrough for connecting a real phone number to WhatsApp Business Cloud API via n8n, including template messages with tappable buttons.

---

## Prerequisites

- A **Meta Business Account** (business.facebook.com)
- A **Meta Developer Account** (developers.facebook.com)
- A **phone number** you control (can be a Twilio number — doesn't need to be a personal cell)
- An **n8n instance** with the WhatsApp node available

---

## Part 1 — Create a Meta App

1. Go to **developers.facebook.com** > **My Apps** > **Create App**
2. Select **Business** as the app type
3. Name your app (e.g., "n8n" or your project name)
4. Select your Meta Business Account
5. Once created, go to **App Dashboard** > **Add Product** > **WhatsApp** > **Set Up**

This creates a **WhatsApp Business Account (WABA)** linked to your app. You'll start with a free **Test WhatsApp Business Account** and a test number (+1 555-xxx-xxxx).

---

## Part 2 — Set Up Your Real Business Account

The test number can send text messages but **cannot send template messages** (no buttons). You need a real verified number.

### 2A — Switch to Your Business Account

1. Go to **business.facebook.com** > **WhatsApp Manager**
2. Top-right dropdown — you'll see two accounts:
   - **Test WhatsApp Business Account** (created automatically)
   - **Your Business Name** (e.g., "Quietly Systems Inc.")
3. Select **your real business account**

> If you only see the Test account, go to **Meta Business Settings** > **Accounts** > **WhatsApp Accounts** > **Add** to create one linked to your business.

### 2B — Add Your Phone Number

1. In WhatsApp Manager (under your real business account), go to **Phone Numbers**
2. Click **"Add phone number"** (blue button, top right)
3. Enter your phone number (e.g., +1 438 900 9998)
4. **Display name**: Enter the name customers will see (e.g., "Property Management"). This is **per phone number** — you can manage multiple clients under one WABA with different display names.
5. Meta will review the display name (24-48 hours). You can proceed with the API setup while waiting.

> **Twilio numbers**: If your number is a Twilio number, the verification SMS/call will arrive in your Twilio console (Monitor > Logs > Messages), not on a physical phone.

---

## Part 3 — Register the Number for Cloud API

Adding the number in the UI isn't enough — you must **register** it via the API.

### 3A — Get Your Phone Number ID

1. In WhatsApp Manager > Phone Numbers, click on your number
2. Copy the **Phone Number ID** (e.g., `971537566052793`)

### 3B — Open the Graph API Explorer

1. Go to **developers.facebook.com** > **Tools** > **Graph API Explorer**
2. Select your app (top-right "Meta App" dropdown)
3. Under **Permissions**, add:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
4. Click **"Generate Access Token"** and authorize

### 3C — Register the Number

1. Change the method from **GET** to **POST**
2. In the URL field, enter: `PHONE_NUMBER_ID/register` (replace with your actual ID, e.g., `971537566052793/register`)
3. Add these body parameters:
   - `messaging_product` = `whatsapp`
   - `pin` = `123456` (choose a 6-digit PIN you'll remember — needed for re-registration)
4. Click **Submit**
5. You should see: `{ "success": true }`

> **Troubleshooting**: If you get an error, make sure:
> - Your token has both `whatsapp_business_management` and `whatsapp_business_messaging` permissions
> - The phone number ID belongs to the WABA your token has access to
> - You haven't exceeded 10 registration attempts in 72 hours

---

## Part 4 — Create a Permanent Access Token

The Graph API Explorer token expires in ~1 hour. You need a permanent **System User** token.

### 4A — Create a System User

1. Go to **business.facebook.com** > **Business Settings**
2. Left sidebar: **Users** > **System Users**
3. Click **"Add"** > Name it (e.g., "n8n-whatsapp") > Role: **Admin**
4. Click **"Add Assets"** > **Apps** > select your app > toggle **Full Control**
5. Click **"Add Assets"** > **WhatsApp Accounts** > select your business WABA > toggle **Full Control**

### 4B — Generate Permanent Token

1. Click **"Generate New Token"** on the System User page
2. Select your app
3. Check these permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
4. Click **Generate Token**
5. **Copy and save this token** — it won't be shown again

> This token does not expire. Use it in n8n.

---

## Part 5 — Connect to n8n

### 5A — Create the WhatsApp Credential in n8n

1. In n8n, go to **Credentials** > **Add Credential** > **WhatsApp Business Cloud API**
2. Paste your permanent **Access Token** from Part 4B
3. Save

### 5B — Configure the WhatsApp Node

In any workflow that sends WhatsApp messages:

1. Add a **WhatsApp** node
2. Set **Credential**: your new WhatsApp credential
3. Set **Phone Number ID**: your production Phone Number ID (e.g., `971537566052793`)
4. Set **Operation**: Send (for text) or Send Template (for buttons)

### 5C — Test a Text Message

1. Set up a simple workflow: Manual Trigger → WhatsApp node
2. Configure:
   - **Operation**: Send
   - **Recipient Phone Number**: a whitelisted test number or any number (after verification)
   - **Text Body**: "Hello from WhatsApp Business!"
3. Execute — you should get a `wamid` in the response confirming delivery

---

## Part 6 — Create a Template with Buttons

Templates are required for:
- Sending messages **outside the 24-hour window** (customer hasn't messaged you recently)
- Sending **interactive buttons** (Quick Reply or Call-to-Action)

### 6A — Create the Template

1. Go to **WhatsApp Manager** > **Message Templates** > **Manage Templates**
2. Make sure you're on your **real business account** (not Test)
3. Click **"Create Template"**
4. Configure:
   - **Category**: Utility
   - **Name**: `video_feedback` (lowercase, underscores only)
   - **Language**: English
   - **Body**: `Did this video help resolve your issue?`
   - **Buttons**: Click "Add Button" > **Quick Reply**
     - Button 1 text: `Yes`
     - Button 2 text: `No`
5. Submit for review

> **Approval time**: Utility templates are usually approved in minutes. Marketing templates can take longer.

### 6B — Send the Template from n8n

Use an **HTTP Request** node (more flexible than the built-in WhatsApp node for templates):

```json
POST https://graph.facebook.com/v21.0/PHONE_NUMBER_ID/messages

Headers:
  Authorization: Bearer YOUR_PERMANENT_TOKEN
  Content-Type: application/json

Body:
{
  "messaging_product": "whatsapp",
  "to": "RECIPIENT_PHONE",
  "type": "template",
  "template": {
    "name": "video_feedback",
    "language": { "code": "en" },
    "components": []
  }
}
```

The recipient will see a message with **tappable Yes / No buttons**.

### 6C — Handle Button Responses

When a customer taps a button, WhatsApp sends a webhook payload with:

```json
{
  "type": "interactive",
  "interactive": {
    "type": "button_reply",
    "button_reply": {
      "id": "0",
      "title": "Yes"
    }
  }
}
```

Parse `button_reply.title` ("Yes" or "No") in your webhook handler to route the response.

---

## Part 7 — Go Live Checklist

| Step | Status |
|------|--------|
| Meta Business Account created | |
| Meta App created with WhatsApp product | |
| Real phone number added to WABA | |
| Display name approved by Meta | |
| Phone number registered via API (`/register`) | |
| System User created with permanent token | |
| Token saved in n8n WhatsApp credential | |
| Phone Number ID set in WhatsApp nodes | |
| Template created and approved | |
| Template send tested | |
| Button webhook handler working | |

---

## Common Gotchas

1. **Test number can't send templates** — Template messages (including buttons) only work from verified production numbers, not the +1 555-xxx-xxxx test number.

2. **Template exists on wrong account** — Templates are per-WABA. If you created it under the Test account, recreate it under your real business account.

3. **Display name ≠ phone number verification** — "Pending" on the phone number usually means the display name is under Meta review. The number itself is usable for API calls once registered.

4. **Certificate tab is irrelevant** — The Certificate tab in WhatsApp Manager is for the deprecated On-Premises API (sunset October 2025). Ignore it for Cloud API.

5. **Token expiry** — Graph API Explorer tokens expire in ~1 hour. Always use a System User permanent token for production.

6. **Twilio number SMS conflict** — Registering a Twilio number for WhatsApp Business may affect SMS delivery on that number. Test both after registration.

7. **24-hour messaging window** — You can send any message type (text, media, interactive) within 24 hours of the customer's last message. Outside that window, you must use an approved template.

8. **Registration limit** — Max 10 registration attempts per number in 72 hours. If you hit error `133016`, wait 72 hours.

---

## Quick Reference

| Item | Value |
|------|-------|
| WhatsApp Manager | business.facebook.com > WhatsApp Manager |
| Graph API Explorer | developers.facebook.com > Tools > Graph API Explorer |
| Register endpoint | `POST {PHONE_NUMBER_ID}/register` |
| Send template endpoint | `POST {PHONE_NUMBER_ID}/messages` |
| Required permissions | `whatsapp_business_management`, `whatsapp_business_messaging` |
| Template approval | Minutes (Utility) to hours (Marketing) |
| Display name approval | 24-48 hours |

# BatchWatt V9 Deployment Steps

## 1. Deploy demo on Vercel

Upload these files to a GitHub repo:

- index.html
- package.json
- vercel.json
- api/*
- lib/*
- samples/*

Import the repo into Vercel and deploy.

## 2. Add environment variables

Required for WhatsApp webhook verification:

- WHATSAPP_VERIFY_TOKEN

For production persistence:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

For outbound WhatsApp messages:

- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID

## 3. Create Supabase tables

Run `supabase_schema.sql` inside the Supabase SQL editor.

## 4. Connect WhatsApp Cloud API

In Meta Developer settings:

- Set callback URL to: `https://YOUR_DOMAIN/api/whatsapp-webhook`
- Set verify token to the same value as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to message events

## 5. Connect stock sheet

Fast pilot path:

- export the factory's stock sheet as CSV once per day
- POST it to `/api/ingest-stock`

Production path:

- Google Sheets API or Drive file-change trigger
- map columns once at onboarding

## 6. Connect bills and LPG receipts

Fast pilot path:

- forward bill/receipt text or upload OCR output to `/api/ingest-bill`

Production path:

- Gmail or Drive ingestion
- PDF/photo OCR
- parser confidence score

## 7. Generate plan

POST all latest parsed inputs to `/api/generate-plan`.

The response includes:

- dispatch plan
- exceptions
- energy receipt
- peak-load profiles
- copy-ready WhatsApp summary

## 8. Send plan

Fast pilot path:

- copy the generated WhatsApp summary manually

Production path:

- send via WhatsApp Cloud API template or session message

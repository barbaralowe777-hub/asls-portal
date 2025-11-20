# World Machine Money — Funding App

Separate Vite + React app for online funding applications with ABN eligibility check, ABR lookup, and email submissions via SendGrid.

## Stack

- Frontend: Vite, React, TypeScript, React Router
- Backend: Vercel serverless functions (`/api`)
- Services: ABR Lookup (GUID), SendGrid for email

## Quick Start

1. Create a new repo from this folder (`wmm-funding`) or deploy directly to Vercel as a separate project.
2. Copy `.env.example` to `.env` and set:
   - `ABR_GUID` — your ABR Lookup GUID
   - `SENDGRID_API_KEY` — SendGrid API key
   - `SENDGRID_FROM` — verified sender (e.g., no-reply@worldmachine.com.au)
   - `WMM_RECIPIENT` — defaults to john@worldmachine.com.au
3. Install and run locally:

```bash
npm i
npm run dev
```

For backend API locally, use Vercel CLI (optional but recommended):

```bash
vercel dev
```

Then open the Vite dev server and test routes. In CI/preview, Vercel builds both the SPA and `/api` functions.

## API Endpoints

- `GET /api/abr-lookup?abn=XXXXXXXXXXX` — proxies ABR JSON API using `ABR_GUID`; returns normalized ABN/GST details.
- `POST /api/submit-application` — accepts application JSON and emails to `WMM_RECIPIENT` via SendGrid.
- `POST /api/send-docusign` — placeholder; returns 501 until configured.

## Eligibility Rules (MVP)

- Valid ABN checksum and active ABN record via ABR.
- GST registered preferred; surfaced to the user. You can tweak rules in `src/pages/Eligibility.tsx`.

## Notes

- This app is separate from ASLS Portal; no existing files modified.
- You can move `wmm-funding/` out to its own repo directory at any time and push to a new remote.
- To add persistence later, introduce a DB (e.g., Supabase/Postgres) and extend `api/submit-application.ts` to store records in addition to emailing.


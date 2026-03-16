# UniBrain

AI study app built with Next.js 14, Supabase, Gemini, and PayPal subscriptions.

## Local setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill all required values in `.env`.
3. Install and run:

```bash
npm ci
npm run dev
```

## Deploy to Vercel

1. Import this repo into Vercel.
2. Framework preset: `Next.js`.
3. Build command: `npm run build`.
4. Add all environment variables from `.env.example` in Vercel Project Settings.
5. Set `NEXT_PUBLIC_APP_URL` to your deployed URL (for example `https://your-app.vercel.app`).
6. Redeploy after env vars are saved.

## Required env vars

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (recommended default: `gemini-3.0-flash`)
- `GEMINI_MODEL_FALLBACKS` (comma-separated fallback models)
- `GEMINI_OCR_MODEL` (optional OCR-specific override)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_PLAN_ID_PRO`
- `PAYPAL_API_BASE` (`https://api-m.sandbox.paypal.com` for sandbox, `https://api-m.paypal.com` for live)

## PayPal subscription setup

1. In PayPal Developer, create a Product and a Subscription Plan.
2. Put the plan id (`P-...`) into `PAYPAL_PLAN_ID_PRO`.
3. Configure webhook URL:

```text
https://<your-domain>/api/webhooks/paypal
```

4. Subscribe to at least:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
5. Put webhook id (`WH-...`) into `PAYPAL_WEBHOOK_ID`.

## Deployment constraints

- API routes are configured for Node.js runtime on Vercel.
- Long-running endpoints use explicit `maxDuration`.
- File upload limits are capped to Vercel-friendly limits:
  - max per file: `4MB`
  - max total upload payload: `4MB`

## Gemini model troubleshooting

If generation fails with a model-not-found error, update:

- `GEMINI_MODEL` to a model available in your Google AI account/region.
- `GEMINI_MODEL_FALLBACKS` to include additional valid models.

The app will automatically try the primary model first, then fallbacks.

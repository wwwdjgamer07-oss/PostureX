# Mr X AI - Intelligent Posture Intelligence Platform

Enterprise-grade AI SaaS web application built with Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, Recharts, Zustand, Supabase, Stripe, and PWA support.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- Zustand
- Supabase (Auth + Postgres)
- Stripe (Subscriptions + Billing Portal + Webhooks)
- MediaPipe Tasks Vision (Realtime posture detection)
- next-pwa

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill required secrets in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_*` price IDs

4. Apply Supabase migration:

```bash
supabase db push
```

5. Run development server:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

## Stripe Webhook (Local)

1. Login to Stripe CLI.
2. Forward events to local webhook:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Copy printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Production Deployment

1. Deploy app to Vercel.
2. Add all environment variables in Vercel project settings.
3. Configure Stripe webhook endpoint:

- `https://<your-domain>/api/stripe/webhook`
- Events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

4. Configure Supabase:

- Run migration in production database.
- Confirm RLS policies are enabled.
- Add site URL and redirect URL in Supabase Auth:
  - `https://<your-domain>/auth/callback`

5. Enable PWA in production (`next-pwa` is disabled in development).

6. Build and verify:

```bash
npm run typecheck
npm run lint
npm run build
```

## Security Controls Included

- Auth-guarded routes via middleware
- API rate limiting
- CSRF token enforcement for mutable API routes
- Supabase RLS policies
- Secure cookie session handling
- Input validation (Zod)

## Notable Routes

- `/` marketing landing page
- `/auth` login/signup + Google OAuth
- `/dashboard` realtime AI posture dashboard
- `/history` session archive + CSV export
- `/pricing` Stripe subscription plans
- `/settings` preferences + account controls
- `/admin` admin analytics panel
- `/offline` PWA fallback

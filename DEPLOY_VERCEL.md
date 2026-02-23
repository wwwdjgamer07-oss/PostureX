# PostureX Production Deployment (Vercel + Supabase)

## 1) Preflight

Run locally:

```bash
npm ci
npm run typecheck
npm run build
```

## 2) Vercel Environment Variables

Set these in **Vercel Project -> Settings -> Environment Variables**.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `RESEND_API_KEY` (server-only)
- `RESEND_FROM_EMAIL`
- `RAZORPAY_KEY_ID` (server-only)
- `RAZORPAY_KEY_SECRET` (server-only)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `CRON_SECRET` (server-only)
- `NEXT_PUBLIC_APP_URL` (e.g. `https://posturex.in`)
- `NEXT_PUBLIC_SITE_URL` (same as app URL)

Optional:

- `ADMIN_OTP_CODE`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_AI_MODEL`
- `LLM_PROVIDER`

## 3) Supabase Production Setup

Apply migrations:

```bash
supabase db push
```

Ensure auth URL config in Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `https://posturex.in` (or your final domain)
- Redirect URLs:
  - `https://posturex.in/auth`
  - `https://posturex.in/auth/callback`
  - `https://<vercel-preview-domain>/auth/callback`

## 4) Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

Vercel Build Settings:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: `.next`
- Node.js: `18.x` or higher

## 5) Post-Deploy Validation

- Email signup/login
- Google OAuth callback
- Dashboard/session/history loading
- Camera posture mode
- Sensor mode on phone only
- AI chat endpoint
- Razorpay payment flow + verification
- PDF report generation + email delivery
- Avatar upload/storage
- Notifications
- Theme switch/dark mode

## 6) PWA Validation

- Open `/manifest.webmanifest`
- Verify `sw.js` is generated in production
- Install app on mobile (Add to Home Screen)
- Lighthouse PWA score target: `>= 90`

## 7) Security Notes

- Never expose: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RAZORPAY_KEY_SECRET`, `CRON_SECRET`.
- Only expose `NEXT_PUBLIC_*` keys to browser.


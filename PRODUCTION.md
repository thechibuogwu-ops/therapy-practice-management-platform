# Production deployment checklist

## Required configuration

Set these server-only variables before production deployment:

- `DATABASE_URL`
- `AUTH_SECRET` — long, random, and unique per environment
- `APP_URL` — canonical HTTPS application URL
- `PAYSTACK_SECRET_KEY` when Paystack is enabled
- `FLUTTERWAVE_SECRET_KEY` and `FLUTTERWAVE_WEBHOOK_HASH` when Flutterwave is enabled
- `EMAIL_FROM` plus `SMTP_URL` or `RESEND_API_KEY` once an actual email adapter is deployed
- `MAX_UPLOAD_MB` (or `MAX_UPLOAD_SIZE_BYTES`) for private document limits

Optional operational variables are listed in `.env.example`.

`SHOW_INVITATION_URLS` must be unset or `false` in production. Manual activation URLs are available only in explicit development/demo mode.

## Database migrations

Apply Drizzle schema updates during deployment using the configured migration process, for example:

```bash
npx drizzle-kit push
```

Run schema updates through a privileged deployment process. Do not use `/api/seed` to establish production schema or production data. `/api/seed` is disabled when `NODE_ENV=production`.

## Private file storage

Private files are stored outside the public web root and are streamed only through authenticated, authorized endpoints. For durable multi-instance production deployment, replace the local `.uploads` volume with a private persistent volume or a private object-storage adapter while preserving server-side authorization before download.

## Email delivery

Invitation tokens and activation are implemented securely. This codebase does not include an email transport adapter, so it reports `emailDelivery: not_configured` when no mail system exists. Configure and test an actual mail adapter before claiming email invitations are delivered.

## Rate limiting

The bundled rate limiter is an in-memory safeguard suitable for a single application instance/demo environment. Use a shared rate-limit store or edge/WAF rate limiting for multi-instance production deployment.

## HTTPS and cookies

Production authentication cookies are `httpOnly`, `secure`, `sameSite=lax`, and scoped to `/`. Deploy behind HTTPS.

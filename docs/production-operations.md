# PawTail Production Operations Runbook

## Required release configuration

- Backend: all variables in `backend/.env.example`, including a TLS-capable `REDIS_URL` and correct `TRUST_PROXY_HOPS` (Render topology currently expects `1`).
- Storefront/admin: `NEXT_PUBLIC_API_URL` must be the HTTPS backend `/api/v1` URL.
- Render health check: `/health/ready`; liveness probe: `/health/live`.

## Pre-release

1. Capture the Git commit, current Render revision and both Vercel deployment IDs.
2. Take a provider-native MongoDB backup and export collection indexes.
3. Confirm the latest backup can be restored into an isolated database and record duration/result.
4. Verify Redis connectivity, TLS, max-memory/eviction configuration and alerts.
5. Run CI, staging smoke tests and the concurrency/index checks listed in the audit.

## Safe smoke tests

- GET storefront and admin login page.
- GET backend `/health/live`, `/health/ready`, and a one-item public product list.
- In staging only: login/refresh/logout, password-reset delivery to a controlled mailbox, customer ownership denial, admin denial, one COD order with repeated idempotency key, last-item concurrency, promo concurrency, cancellation stock restore, image upload rollback and review moderation.
- Never create test orders, send test email, alter inventory or perform refund/account-deletion tests against real production customers.

## Rollback

1. Stop further rollout and mark the incident start time/revision.
2. Restore the prior immutable backend deployment first, then the prior admin/storefront deployments if required.
3. Do not drop additive fields or indexes during emergency rollback.
4. Verify health, catalog, authentication and logs. Escalate any irreversible account-erasure or order/inventory inconsistency; never repair it with an unreviewed production script.

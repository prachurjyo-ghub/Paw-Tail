# PawTail Production Readiness Audit

Audit date: 2026-10-27 (Asia/Dhaka)

Audited revision: `8a03d40` on branch `production-hardening-2026-10-27`

Release remote: `pawtail` (`prachurjyo-ghub/Paw-Tail`)
Scope: current repository, the earlier Part 1/Part 2 audits and Phase 1/Phase 2 fix records, safe production reads, and the remediation diff on this branch.

## Executive assessment

PawTail is **not yet approved for production release**. The code-level hardening pass resolves several critical and high-risk defects, and all local unit/static/build gates pass, but three release gates remain: a production Redis instance and `REDIS_URL` are not verified, transaction/index/concurrency tests have not run against an isolated MongoDB replica set with representative data, and the new account-erasure/index changes have not had a reviewed data migration rehearsal. For those reasons this branch was not merged into `main` and was not deployed.

Findings: **2 P0 Critical, 9 P1 High, 6 P2 Medium, 3 P3 Low**. Code changes resolve both P0s, six P1s, four P2s, and two P3s. Three P1 and two P2 findings remain blocked on production-like infrastructure or operational evidence.

Current production was read-only checked on 2026-10-27: storefront HTTP 200, backend `/health/live` HTTP 200, `/health/ready` HTTP 200, and public catalog HTTP 200 with 18 products. These checks validate the existing deployment only, not this branch.

## Actual architecture and deployment

- Storefront: Next.js App Router / React at `clientend`, Vercel project `pawtail-store`, production alias `https://pawtail-store.vercel.app`.
- Admin: Next.js App Router / React at `adminend`, Vercel project `pawtail-admin`.
- API: CommonJS Express/Mongoose JavaScript at `backend`, deployed on Render at `https://pawtail-api.onrender.com`.
- Data: MongoDB through Mongoose. The repository has no safe local replica-set fixture.
- Media: Cloudinary for new uploads; local `/uploads` remains read-only compatibility for legacy records.
- Cache/abuse controls: no Redis existed at the audited revision. This branch adds Redis for distributed rate limiting and product cache-aside behavior; production now requires `REDIS_URL`.
- BullMQ and SSE: neither library nor an SSE endpoint/worker exists in the repository. They are not part of the actual application.
- Payments: no payment-provider SDK, signed callback, or webhook exists. This branch restricts checkout to Cash on Delivery.
- CI/CD: Vercel projects are linked; Render is serving the API. No repository CI existed. This branch adds `.github/workflows/ci.yml`.

## Finding register

| ID | Severity | Component/location | Root cause and realistic scenario | Existing protection | Minimal fix implemented/proposed | Verification |
|---|---|---|---|---|---|---|
| F-01 | P0 Critical | All three lockfiles | Current dependency audit found critical Next.js RCE advisories and a critical proxy IP-spoofing advisory plus high DoS issues. | Version pins and lockfiles only. | Updated both Next apps to 16.4.3, patched transitive packages, Multer 2.5.0 and Nodemailer 10.2.1. | `npm audit --omit=dev`: 0 vulnerabilities in all apps; both Next builds pass. |
| F-02 | P0 Critical | Auth/order/public mutation routes | No distributed abuse control allowed brute force, OTP guessing, email flooding and expensive-request exhaustion. | Request body limits only. | Added atomic expiring Redis counters with route-specific IP/account/user budgets, bounded local fallback for availability routes, fail-closed sensitive routes, 429 and retry headers. | Local 429 regression passes. **Production Redis behavior is BLOCKED** until provisioned and exercised. |
| F-03 | P1 High | `authController.js`, `User.js` | Plaintext, cross-purpose OTPs with no attempt cap; refresh tokens stored plaintext and replayable. | Six-digit CSPRNG codes; JWT expiry. | HMAC-hashed purpose-bound OTPs, five-attempt cap, resend cooldown, single-use clearing, generic recovery response, password policy, hashed refresh token and atomic rotation with unique JWT IDs. | Syntax and unit suite pass. End-to-end SMTP/session tests remain blocked. |
| F-04 | P1 High | `app.js`, frontend API clients | Cross-site cookie mutations relied on CORS, which does not prevent CSRF. Proxy trust was implicit. | Exact production CORS origins. | Production origin plus `X-PawTail-Request` verification, Helmet, explicit trusted-proxy hop count, client marker header. | CSRF unit regression passes; production deployment not yet verified. |
| F-05 | P1 High | `orderController.js`, `Order.js` | Read-modify-save stock decrements could oversell; duplicate checkout could create duplicate orders. | MongoDB transaction and random order number. | Conditional atomic stock decrements and required per-user idempotency keys with payload hash and unique compound index. | Validator/idempotency regression passes. Replica-set concurrency test remains blocked. |
| F-06 | P1 High | `orderController.js`, `PromoCode.js` | Embedded promo usage read-modify-save allowed concurrent limit overruns. | Transaction only. | Added `PromoRedemption` unique user/promo records and conditional global increments in the same transaction. | Static/syntax verified. Concurrent MongoDB test and index rehearsal remain blocked. |
| F-07 | P1 High | Checkout UI and order validation | UI offered bKash/Nagad/Card without a gateway, capture or signed webhook. | Orders stayed `Pending`. | Removed online options and reject everything except COD server-side. | Regression rejects `CARD`; storefront build passes. |
| F-08 | P1 High | Catalog controllers/routes | Public callers could request inactive products, categories, animals, brands and banners. | Soft-delete filters. | Public requests always filter active records; optional auth permits inactive views only for administrators. | Route/controller inspection and builds pass; authenticated API integration test remains absent. |
| F-09 | P1 High | Reviews/rating aggregation | Pending reviews were public, duplicates were allowed, non-buyers could review, and products with no reviews showed a fabricated 5/1 score. | Admin hide/reply controls. | Public approved/replied filter, verified delivered-order requirement, unique user/product index, explicit approval route, pagination, text limits, honest zero state and cache invalidation. | Rating and UI gates pass. Existing duplicate-data/index migration must be rehearsed. |
| F-10 | P1 High | Account deletion | Hard-deleting User orphaned orders/reviews/cart/inquiries and retained PII/media inconsistently. | Profile media cleanup only. | Transactional pseudonymization: preserve financial records, redact order PII, delete cart/inquiries, anonymize reviews, revoke credentials, retain a disabled tombstone and clean media. | Static/syntax verified. Isolated transactional integration and retention-policy sign-off remain blocked. |
| F-11 | P1 High | Production release | New protections require Redis, safe index creation and migration review; those are not available/verified in current production. | Existing Render/Vercel deployments are healthy. | Do not merge/deploy until release gates below pass. | BLOCKED; branch intentionally not merged/deployed. |
| F-12 | P2 Medium | Product detail cache | No cache/negative cache; random misses could repeatedly hit MongoDB. | ObjectId checks existed in rating utility only. | Bounded slug validation, explicit not-found sentinel with 20s TTL, positive 60s TTL, public/admin key isolation, in-process miss coalescing, mutation/review/inventory invalidation, Redis-failure DB fallback. | Coalescing test passes. Redis TTL/invalidation integration remains blocked. |
| F-13 | P2 Medium | List/search controllers | Admin orders/accounts/inquiries/reviews were unbounded; inquiry/review regex was unescaped. | Product list already capped at 100. | Added bounded pagination, search length bounds, regex escaping, Mongoose `sanitizeFilter`/`strictQuery`, and bounded Mongo connection/timeouts. | Syntax/build gates pass; query plans were not captured. |
| F-14 | P2 Medium | Operational quality | No CI workflow enforced tests, lint, builds or audits. | Manual prior checks. | Added a least-privilege Node 22 GitHub Actions matrix. | Workflow syntax reviewed locally; GitHub run awaits branch push. |
| F-15 | P2 Medium | Account enumeration | Recovery and some verification paths disclosed whether an account existed. | Login password error was partly generic. | Generic recovery response, generic missing-account OTP failures, dummy password comparison, generic admin login failures. | Static review; timing distribution not load-tested. |
| F-16 | P2 Medium | Backup/restore and observability | No repository evidence of Mongo backup restore drills, alerting, Redis memory alerts, queue dashboards, or centralized error alerting. | Request IDs, structured 500 logs, Render/Vercel platform logs. | Runbook requirements documented below. | BLOCKED on provider configuration and restore drill evidence. |
| F-17 | P2 Medium | Admin/frontend build reproducibility | Google font fetch and Turbopack process behavior made offline/sandbox builds unreliable; new lint exposed cascading effect calls. | Builds previously passed in a networked environment. | Removed build-time Google fetch, standardized both builds on webpack, deferred effect-triggered loads, upgraded Next. | Both lint and production builds pass on Node 22. |
| F-18 | P3 Low | Backend headers | Existing production exposes `X-Powered-By` and lacks the new Helmet headers. | Vercel sends HSTS for storefront. | Helmet disables/sets backend security headers. | Code inspection; production remains old until safe deploy. |
| F-19 | P3 Low | BullMQ/SSE | Requested audit assumed BullMQ and SSE, but neither exists. | N/A | No unused subsystem added. Re-audit if introduced. | Repository-wide search. |
| F-20 | P3 Low | Metrics/performance | No APM or stable performance baseline exists, so before/after latency and Core Web Vitals cannot be credibly claimed. | Vercel/Render basic deployment data. | Builds were made deterministic; caching/pagination reduce expected load. Add provider metrics before asserting gains. | No measured production improvement claimed. |

## Endpoint inventory and abuse classification

All paths below are under `/api/v1` unless noted. `Public` means no identity is required; public GETs receive IP budgets. `User` means cookie authentication and ownership-derived access. `Admin` means cookie authentication plus server-side role enforcement. Database cost is relative to this application.

| Endpoints | Access | DB/computation | Primary abuse/data risk and control |
|---|---|---|---|
| `GET /`, `GET /health/live`, `GET /health/ready` | Public | none / connection state | Reconnaissance and health floods; small responses, no-store health headers. |
| `POST /users/signup` | Public | user lookup/write, bcrypt, SMTP | Account/email flood; account+IP registration limit, validation and resend cooldown. |
| `POST /users/login`, `POST /users/admin-login` | Public | user lookup, bcrypt | Credential stuffing/enumeration; account+IP auth limit, generic errors, dummy hash. |
| `POST /users/verify-email`, `POST /users/verify-reset-otp` | Public | user lookup/write | Six-digit brute force; verification limit plus hashed purpose-bound code and attempt cap. |
| `POST /users/forgot-password`, `POST /users/reset-password` | Public | lookup/write, bcrypt, SMTP | Enumeration/email flood/takeover; generic response, recovery limit, strong passwords, single-use OTP. |
| `POST /users/refresh-token`, `POST /users/logout` | Cookie | user conditional update | Token replay/session churn; hashed rotation and refresh limit; logout clears cookies. |
| `GET /users/me`; `PATCH /users/profile`, `/users/update-phone`, `/users/change-password`, `/users/profile-image`; `POST /users/request-update-otp`; `DELETE /users/account` | User | user writes, bcrypt/SMTP/media/transaction | CSRF, privilege-field injection, upload/account abuse; protected identity, production CSRF, OTP purpose, upload/recovery budgets. |
| `POST /users/addresses`; `PATCH /users/addresses/:addressId`, `/users/addresses/:addressId/default`; `DELETE /users/addresses/:addressId` | User | bounded embedded user update | IDOR/body abuse; target always `req.user`, mutation budget and body cap. |
| `GET /users/accounts`, `GET /users/accounts/:id` | Admin | paged users and order lookup | PII enumeration/large reads; admin authorization, admin budget, account list pagination. |
| `GET /products/get-products`, `GET /products/get-product/:slug` | Public or Admin | search/populate/rating; detail cache | Query abuse, cache penetration, inactive disclosure; search/browse budgets, caps, escaped regex, bounded cache keys, role-separated cache. |
| `GET /products/get-deleted-products`; `POST /products/create-product`; `PATCH /products/update-product/:slug`; `DELETE /products/delete-product/:slug` | Admin | catalog/media writes | Data/media abuse; admin auth, upload budget, byte signatures and cache invalidation. |
| `GET /categories/get-categories`, `GET /animals/get-animals`, `GET /brands/get-brands`, `GET /banners/get-banners` | Public or Admin | small catalog lists | Inactive disclosure/list flooding; public active-only, optional admin visibility. |
| Category writes: `POST /categories/create-category`, `PATCH /categories/update-category/:slug`, `DELETE /categories/delete-category/:slug`, `PATCH /categories/active-on-off-animals/:slug` | Admin | relation/media writes | Unauthorized mutation/upload; admin auth and validated media. |
| Animal writes: `POST /animals/post-animals`, `PATCH /animals/update-animals/:id`, `DELETE /animals/delete-animals/:id`, `PATCH /animals/active-on-off-animals/:id` | Admin | relation/media writes | Same controls as categories. |
| Brand writes: `POST /brands/create-brand`, `PATCH /brands/update-brand/:slug`, `DELETE /brands/delete-brand/:slug`, `PATCH /brands/active-on-off-brand/:slug` | Admin | relation/media writes | Same controls as categories. |
| Banner writes: `POST /banners/post-banners`, `PATCH /banners/update-banners/:id`, `DELETE /banners/delete-banners/:id`, `PATCH /banners/active-on-off-banners/:id` | Admin | media writes | Upload/storage abuse; admin and upload controls. |
| `GET /cart/get-cart`; `POST /cart/add-to-cart`, `/cart/calculate-cart`; `PATCH /cart/update-cart-item/:itemId`; `DELETE /cart/remove-cart-item/:itemId`, `/cart/clear-cart` | User | product/cart reads and writes | IDOR/resource churn/client price trust; user-derived cart, server product data and mutation budget. |
| `GET /wishlist/get-wishlist`; `POST /wishlist/add-to-wishlist`; `DELETE /wishlist/remove-wishlist-item/:productId`, `/wishlist/clear-wishlist` | User | bounded user/product writes | IDOR/resource churn; user-derived ownership and body limits. |
| `POST /orders/create-order` | User | expensive multi-document transaction | Duplicate order, forged totals, oversell, promo races; checkout budget, strict fields, COD-only, idempotency and conditional updates. |
| `GET /orders/my-orders`, `GET /orders/get-order/:id` | User/Admin | paged list or one order | BOLA/order PII; ownership or admin check, list cap. |
| `GET /orders/get-orders`; `PATCH /orders/update-order/:id`, `/orders/refund-order/:id`; `DELETE /orders/delete-order/:id` | Admin | order transaction/status writes | Forged status/refund/destructive access; admin auth, strict update fields, soft delete. No real payment refund occurs. |
| `GET /promo-codes/get-promo-codes`; `POST /promo-codes/post-promo-codes`; `PATCH /promo-codes/update-promo-codes/:id`, `/promo-codes/active-on-off-promo-code/:id`; `DELETE /promo-codes/delete-promo-codes/:id` | Admin | promo CRUD | Discount abuse; admin authorization and schema bounds. |
| `POST /promo-codes/validate-promo-code` | User | promo/order-scope reads | Enumeration/expensive repeat; protected identity; checkout path revalidates server-side. |
| `POST /promo-codes/check-promo-code` | Public | promo lookup | Code enumeration remains a P2 design risk; global body/rate protections apply but this route should be removed or made generic before a public promotion launch. |
| `GET /promo-deals/get-promo-deals` | Public | small read | Low-cost enumeration; only active data returned. |
| `GET /promo-deals/admin/get-promo-deals`, `PUT /promo-deals/admin/update-promo-deals` | Admin | settings read/write | Unauthorized discount display; admin authorization. |
| `GET /reviews/get-reviews` | Public/Admin | paged read + optional aggregation | Spam disclosure/query abuse; approved-only public view, caps and escaped search. |
| `POST /reviews/post-reviews` | User | delivered-order lookup + insert | Rating manipulation/storage spam; verified purchase, one per user/product, mutation budget. |
| `PATCH /reviews/approve-reviews/:id`, `/reviews/reply-reviews/:id`, `/reviews/hide-reviews/:id`; `DELETE /reviews/delete-reviews/:id` | Admin | review writes/cache invalidation | Moderation abuse; admin authorization. |
| `GET /delivery/get-zones` | Public | one settings read | Low cost; settings validation and frontend cache validation. |
| `PATCH /delivery/update-zones` | Admin | settings write | Price manipulation; admin authorization and server-authoritative checkout calculation. |
| `POST /inquiries/create-inquiry` | Public/optional user | insert | Storage/contact spam; hourly identity budget and strict lengths. |
| `GET /inquiries/my-inquiries` | User | identity-filtered read | PII/IDOR; user/email filter. |
| `GET /inquiries/get-inquiries`, `PATCH /inquiries/update-inquiry/:id` | Admin | paged search/write | PII disclosure/query abuse; admin authorization, escaped/capped search. |
| `GET /invoices/get-invoices`, `GET /invoices/get-invoice/:id` | Admin | order/invoice reads | Financial/PII disclosure; admin authorization. |

## Final 20-area verification matrix

`VERIFIED` means the stated scope has a passing test or sufficiently direct technical evidence. It does not mean the entire product is release-ready.

| # | Production-readiness area | Status | Issues and fixes | Test/evidence | Remaining risk |
|---:|---|---|---|---|---|
| 1 | Repository/apps/dependency discovery | VERIFIED | Three apps, runtime pins, configs and prior audits inventoried. | Full tracked-file/package/config inspection. | None for discovery scope. |
| 2 | Git state, branch, remote and release workflow | VERIFIED | Clean baseline at `8a03d40`; isolated branch created; `pawtail` identified as release remote. | Git status/refs/fetch and GitHub repository metadata. | Branch protection/required checks must be observed after push. |
| 3 | Dependency and supply-chain security | VERIFIED | Critical/high advisories patched; lockfiles updated. | Three production `npm audit` runs report zero vulnerabilities; builds pass. | New advisories can appear; CI audit is required. |
| 4 | Environment and secret contract | BLOCKED | Redis is newly required; existing production Redis configuration cannot be confirmed. No secrets are tracked. | Env-name-only inspection and fail-fast parser. | Provision `REDIS_URL`, use TLS where provider supports it, and verify rotation/access policy. |
| 5 | Endpoint inventory/request-flow audit | VERIFIED | All registered routes classified above; middleware/controllers/models traced. | Static route and controller inspection. | Dynamic third-party behavior still needs staging tests. |
| 6 | Distributed API rate limiting | BLOCKED | Route-specific atomic Redis policies implemented with 429 and retry headers. | Local fallback 429 test passes. | No real Redis atomicity/outage/multi-instance test; sensitive routes fail closed in production. |
| 7 | Redis cache penetration/negative caching | BLOCKED | Sentinel, TTLs, slug bounds, public/admin keys, coalescing and invalidation implemented. | Coalescing regression passes; code inspection. | TTL/invalidation/outage behavior not exercised against Redis; related-list freshness is TTL-bounded. |
| 8 | Authentication, sessions and recovery | BLOCKED | OTP hashing/purpose/attempts/cooldown; strong passwords; generic recovery; refresh rotation. | Static/syntax and general test suite. | No isolated Mongo+SMTP end-to-end, multi-device policy remains single-session, no MFA for admins. |
| 9 | Authorization and customer data isolation | BLOCKED | Existing ownership and admin middleware retained; inactive catalog restricted; deleted users rejected. | Static route/controller review. | No comprehensive customer-vs-customer/admin regression suite with a database. |
| 10 | CORS, CSRF, cookies and proxy trust | VERIFIED | Exact origins, production marker/origin verification, secure cross-site cookies, explicit proxy hops and Helmet. | CSRF regression passes; config inspection. | Must verify headers and cookies after deployment on final domains. |
| 11 | Order idempotency and business-state transitions | BLOCKED | Required idempotency key and guarded order update rules. | Validator regression; code inspection. | Unique index and repeated-request behavior need replica-set integration. |
| 12 | Payment integrity | VERIFIED | No gateway existed; unsupported online methods removed and rejected. | `CARD` rejection test and UI/build inspection. | COD reconciliation is operational; any future gateway requires signed idempotent webhooks. |
| 13 | Inventory and promo concurrency | BLOCKED | Atomic stock predicates and transaction-scoped promo counters/redemptions. | Static/syntax verification only. | Must run concurrent checkout/promo/cancel tests on an isolated replica set and review existing duplicate promo data. |
| 14 | MongoDB queries, indexes and resource limits | BLOCKED | Pagination, escaped regex, sanitizeFilter, pool and timeout limits added. | Syntax/build gates. | No `explain()` evidence; unique review index may conflict with legacy duplicates; index rollout not rehearsed. |
| 15 | Input, upload and infrastructure security | VERIFIED | 100 KiB bodies, multipart caps, magic-byte JPEG/PNG/WebP validation, Cloudinary rollback, Helmet and patched middleware. | Upload/media/health tests pass. | Legacy `/uploads` compatibility remains until migration completion. |
| 16 | BullMQ/background processing | NOT APPLICABLE | No BullMQ dependency, queue, producer or worker exists. | Repository-wide dependency/code search. | Re-open this area if jobs are added. |
| 17 | Server-Sent Events | NOT APPLICABLE | No SSE route or `text/event-stream` implementation exists. | Repository-wide code search. | Re-open for any realtime feature. |
| 18 | Frontend reliability, performance and accessibility gates | VERIFIED | Patched Next, deterministic fonts/builds, webpack production build, lint issues fixed; UI appearance/function retained. | Both lint runs and both 16.4.3 production builds pass. | No browser E2E, accessibility scan, bundle budget, or field Web Vitals evidence. |
| 19 | Health, graceful shutdown and production smoke | VERIFIED | Mongo-aware readiness, liveness, request IDs and bounded shutdown already present. | Backend tests pass; current production live/ready/catalog/storefront all HTTP 200. | Smoke evidence is for old production revision, not this branch. |
| 20 | Logging, monitoring, backups, restore and rollback | BLOCKED | Structured request/error logs and request IDs exist; release/runbook requirements documented. | Code inspection and production headers. | No alert rules, SLOs, backup policy evidence or successful restore drill; Render rollback authority was not verified. |

Matrix totals: **8 VERIFIED, 2 NOT APPLICABLE, 10 BLOCKED**.

## Verification results

Runtime used for final local gates: Node `v22.23.2`, npm `11.16.0`.

- Backend: 20 tests passed, 0 failed; every backend source/test/script JavaScript file passes `node --check`.
- Storefront: ESLint passed; Next.js 16.4.3 webpack production build passed (21 routes/assets generated).
- Admin: ESLint passed; Next.js 16.4.3 webpack production build passed (30 routes generated).
- Production dependency audits: backend, storefront and admin each report 0 vulnerabilities.
- Repository: `git diff --check` passed; tracked secret/key scan found only `.env.example` files.
- GitHub Actions run `40545564251`: backend, storefront and admin matrix jobs passed.
- Vercel pull-request previews: storefront and admin deployments reached Ready; direct anonymous smoke requests returned the expected deployment-protection redirect (302).
- Safe production reads: storefront 200; API live 200; API ready 200; product list 200 with bounded `limit=1` response.
- Not run: destructive stress, real emails/uploads/orders/refunds, production writes, Mongo concurrency tests, Redis integration, browser E2E, accessibility automation, restore drill, or migration execution.

## Release gates and rollback plan

Before merging:

1. Provision isolated staging Redis and production Redis; set `REDIS_URL`; verify TLS/auth, eviction policy, memory alerts and multi-instance atomic rate-limit behavior.
2. Clone sanitized production-like Mongo data into an isolated replica set. Audit duplicate `(product,user)` reviews before creating the unique index. Run index creation, repeated idempotency requests, concurrent last-item checkout, concurrent promo redemption, cancel/restore, refresh rotation and account-erasure tests.
3. Confirm the account-retention policy with the business owner. The implementation preserves anonymized financial order records while removing contact/address data.
4. Run the GitHub workflow on this branch and require it in branch protection.
5. Back up MongoDB and export index definitions before rollout. Record a restore drill and responsible operator. Do not run media migration as part of this release.
6. Configure alerts for readiness failure, 5xx rate, Redis errors/fail-closed responses, Mongo connection errors, latency and disk/memory limits.

Deployment order after gates pass: Redis → Render backend → backend health/security/rate/cache smoke → admin Vercel → storefront Vercel. Because the frontend starts sending CSRF and idempotency headers that the old backend tolerates, backend-first is still preferred for the COD and new security behavior.

Rollback: use the provider’s immutable previous deployment/revision; do not revert database data destructively. The new schema fields are additive. If backend rollback is required after index creation, keep the additive indexes/fields, restore the previous Render revision, and verify live/ready/catalog/auth. Account erasure is intentionally irreversible and therefore must only be tested on isolated users before release.

## Git and deployment status

- Branch: `production-hardening-2026-10-27`.
- Base: `8a03d40` (`pawtail/main` at audit start).
- GitHub access: authenticated with admin permission.
- Vercel access: authenticated; both current production deployments report Ready.
- Code commits: `342ad80` (backend hardening) and `9fd1563` (frontend security/dependency gates). Audit/CI are recorded in the documentation commit.
- Push/PR: branch pushed to `pawtail/production-hardening-2026-10-27`; draft PR #2 is open. GitHub CI and both Vercel preview checks passed. No PR merge is approved while blockers remain.
- Merge/deployment: intentionally not performed because P1 release gates remain blocked.

## Readiness score

**68/100 — materially hardened but not release-ready.** Code quality, dependency security, uploads, health, payment honesty and baseline browser/server builds are strong. The score is capped by the lack of real Redis verification, database concurrency/index migration evidence, comprehensive authorization/auth integration tests, backup/restore proof and monitoring/alert configuration. No claim of full production readiness is made.

# Paw Tail Production Audit — Part 2

Audit date: 2026-09-21

Scope: deployment and runtime readiness of the checked-out `clientend`, `adminend`, and `backend`, including uncommitted files. This report builds on `PRODUCTION_AUDIT_PART1.md`; Part 1 findings are repeated only where they block deployment. No application code or infrastructure was changed.

Verification performed:

- Read all deployment-relevant manifests, lockfiles, Next configuration, server startup, database, mail, upload, routing, API-client, rendering, metadata, and error-handling code.
- `npm audit --omit=dev --json` was run separately for all three applications.
- `npm ci --ignore-scripts --dry-run` completed for all three lockfiles under Node `v22.23.2` / npm `11.16.0`.
- Part 1 already verified that both production builds pass, admin lint passes, client lint fails, and backend syntax checks pass.

## 1. Deployment Architecture

### Required topology

```text
Browser
  ├─> Vercel storefront project (root: clientend)
  └─> Vercel admin project (root: adminend)
          │
          └─ HTTPS + credentialed API requests
                    │
                    v
              Render web service (root: backend)
                    ├─> MongoDB production database
                    ├─> Cloudinary media
                    └─> SMTP provider
```

`clientend` and `adminend` should be **two separate Vercel projects from the same repository**. They have independent package files, routes, domains, environment scopes, indexing rules, and release risk. There is no root workspace/package manifest and no reason to combine them into one Vercel project (`clientend/package.json:1-24`; `adminend/package.json:1-23`).

Recommended custom-domain topology:

- Storefront: `www.example.com` or `shop.example.com`
- Admin: `admin.example.com`
- API: `api.example.com`
- Cloudinary delivery: Cloudinary's HTTPS CDN, optionally behind a later media custom domain

These custom subdomains are cross-origin but **same-site** because they share the registrable domain. That materially improves cookie reliability compared with unrelated `*.vercel.app` and `*.onrender.com` domains.

### Current conflicts

1. Both frontends silently use localhost when `NEXT_PUBLIC_API_URL` is absent (`clientend/src/lib/api.js:1-2`; `adminend/src/lib/adminApi.js:1-2`; both `src/lib/apiBaseUrl.js:3-14`).
2. Cart images have a second localhost fallback through `NEXT_PUBLIC_API_ORIGIN` (`clientend/src/app/cart/page.js:20-21`).
3. The backend start script forces `PORT=3000`, overriding Render's injected port (`backend/package.json:6-9`).
4. The listener does not explicitly bind `0.0.0.0` (`backend/server.js:81-83`).
5. Uploaded media is written to local disk and served by the API (`backend/src/utils/upload.js:5-46`; `backend/server.js:67`).
6. Production CORS still admits localhost/private-network origins (`backend/server.js:15-45,52-61`).
7. Cookies are always `SameSite=None` in production and mutations have no CSRF proof (`backend/src/controllers/v1/authController.js:83-96`).
8. No Cloudinary code or dependency currently exists.
9. There is no environment schema, `.env.example`, Node runtime pin, `vercel.json`, `render.yaml`, Dockerfile, or Procfile.
10. Vercel previews are not isolated by code or documented environment policy.

## 2. Vercel Storefront Readiness

**Verdict: CONDITIONALLY READY.** Vercel can build the application, but a public deployment is not safe or reliable until the blockers below are fixed.

### PASS

- Standard Next.js App Router build: `npm run build` (`clientend/package.json:5-10`).
- A lockfile exists and `npm ci --dry-run` succeeds.
- Dynamic routes are native App Router routes; no SPA fallback is needed.
- Product misses use `notFound()` (`clientend/src/app/product/[slug]/page.js:43-50`).
- Geist uses `next/font`, avoiding a render-blocking external font for the global layout (`clientend/src/app/layout.js:1-17`).
- Production browser source maps are not enabled in `next.config.mjs`, so Next's default of not publishing them applies.

### Deployment requirements

- Vercel root directory: `clientend`
- Node: pin Node 22 LTS consistently; Next 16 requires at least Node 20.9 (lockfile engine evidence).
- Install: `npm ci`
- Build: `npm run build`
- Required build-time public variables:
  - `NEXT_PUBLIC_API_URL=https://<api-host>/api/v1`
  - `NEXT_PUBLIC_API_ORIGIN=https://<api-host>` until the duplicate origin logic is removed

`NEXT_PUBLIC_*` values are embedded in browser bundles. Changing them requires a new Vercel deployment.

### Blocking/gating findings

- Missing API environment configuration produces a successful build aimed at localhost, not a failed build. This is unsafe (`clientend/src/lib/apiBaseUrl.js:3-14`).
- The storefront lint gate still fails as documented in Part 1 B-08.
- `next@16.2.6` has current critical advisories; see section 17.
- `next.config.mjs` allows any HTTPS image host and explicitly allows local/private-IP image optimization (`clientend/next.config.mjs:10-33`). Production should allow only Cloudinary and any deliberately retained asset host.
- No rewrites, middleware, or redirects configuration is required for normal Vercel routing. A `vercel.json` is not required merely to deploy.

### Direct URL behavior

- Vercel will correctly serve direct/refreshed App Router URLs.
- Unknown product: proper 404.
- Unknown category, animal, or brand: redirects to `/`, which hides deleted/invalid URLs and API outages (`categories/[categorySlug]/page.js:19-21`; `animals/[animalSlug]/page.js:20-22`; `brands/[brandSlug]/page.js:12-14`). Use a 404 for an absent record and an error state for an unavailable API.
- There are no custom `error.js` or `not-found.js` files, so deployment failures expose only generic Next UI.

## 3. Vercel Admin Readiness

**Verdict: CONDITIONALLY READY.** The build/project shape is valid, but dependency, indexing, preview, and auth-boundary work remains.

### PASS

- Standard Next.js build and lockfile (`adminend/package.json:5-23`).
- Part 1's production build and lint both passed.
- Direct dashboard URLs are App Router routes and work on Vercel without an SPA rewrite.
- Sensitive API mutations remain backend-authorized; frontend route gating is not treated as the security boundary.

### Deployment requirements

- Vercel root directory: `adminend`
- Node 22 LTS
- Install: `npm ci`
- Build: `npm run build`
- Required build-time public variable: `NEXT_PUBLIC_API_URL=https://<api-host>/api/v1`

### Findings

- `AuthGate` checks `/users/me` only after hydration and then redirects (`adminend/src/components/AuthGate.js:21-54,73-90`). It prevents dashboard rendering after the check, but it is not server/edge route protection.
- API data is fetched only after the backend validates the admin session, so no direct pre-auth sensitive data exposure was found.
- API outage and expired/invalid session are both collapsed into `admin=null`, causing a redirect to login with no outage distinction (`AuthGate.js:21-37`).
- Admin metadata has no `robots: noindex` and no `X-Robots-Tag` (`adminend/src/app/layout.js:15-18`).
- No deployment-protection layer is configured in-repo. Vercel Deployment Protection is recommended for admin previews and optional as defense-in-depth for production.
- The admin package uses `next: ^16.2.6` and `eslint-config-next: 16.2.3`, while the lock currently resolves Next 16.2.6 (`adminend/package.json:12-20`). Pin and align after testing the security update.

## 4. Render Backend Readiness

**Verdict: NOT READY for Render as currently configured.**

### Build and startup

- No compile step is required.
- Recommended build command: `npm ci --omit=dev`
- Recommended start command now: `node server.js`
- After fixing `package.json`, the preferred start command can be `npm start`.

Do not use the current `npm start`: it runs `cross-env PORT=3000 node server.js`, overrides Render's `PORT`, and depends on `cross-env` even though that package is a dev dependency (`backend/package.json:6-9,32-35`).

`server.js` reads `PORT`, but the listener omits an explicit host (`backend/server.js:14,81-83`). Bind `0.0.0.0` for Render.

### Startup and database lifecycle

- PASS: MongoDB is awaited before listening; a failed initial connection exits instead of serving a broken API (`backend/server.js:47-50,84-87`; `backend/src/config/db.js:4-12`).
- FAIL: missing `MONGODB_URI` has no explicit validation; failure is delegated to Mongoose.
- FAIL: only `Brand.init()` is awaited, so index initialization is inconsistent and can lengthen/fail startup (`backend/src/config/db.js:6-8`).
- FAIL: no Mongo `connected`, `disconnected`, or `reconnected` state is recorded for readiness.
- FAIL: no explicit pool or server-selection policy is documented. Driver defaults may work for a showcase, but connection count and startup timeout should be deliberate.

### Process lifecycle

No `SIGTERM`, `SIGINT`, `uncaughtException`, or `unhandledRejection` handlers exist; the listening server is not retained and MongoDB is never closed on service shutdown. Render deploys can therefore terminate active requests abruptly.

Required shutdown behavior:

1. Mark readiness false.
2. Stop accepting new requests with `server.close()`.
3. Allow a bounded drain period for active requests.
4. Close Mongoose.
5. Exit successfully on SIGTERM/SIGINT; log and exit non-zero on unrecoverable process errors.

### Health endpoints

Current `GET /` proves only that Express can respond (`backend/server.js:69-74`). `getHealthStatus` is not mounted and also does not check MongoDB (`backend/src/controllers/base.controller.js:9-16`).

Recommended:

- `GET /health/live`: process liveness only; returns a minimal 200.
- `GET /health/ready`: 200 only when startup completed and MongoDB is connected; use a bounded ping or reliable connection state. Return 503 otherwise.
- Do not return connection strings, hostnames, credentials, cluster names, or stack traces.
- Render Health Check Path: `/health/ready` **after it is implemented**. The current `/` is only a temporary liveness check and is not release-grade readiness.

### Request limits

- `express.json()` and `express.urlencoded()` use implicit framework defaults (`backend/server.js:65-66`).
- Set explicit JSON and URL-encoded limits around 100 KiB; normal Paw Tail JSON does not require large bodies.
- Set URL-encoded `parameterLimit` and reject deeply nested/unexpected input.
- Multipart remains separate: per-file limits plus explicit file/field/part counts. Product allows 10 files; all other upload routes allow one.

### Rate limiting

- **Showcase-sufficient:** an in-memory limiter is acceptable for one Render instance for login, OTP, reset, refresh, inquiry, reviews, and promo checks. It resets on restart; that limitation must be accepted.
- **Real-scale requirement:** when running multiple instances, limits need a shared store. Add a Redis/Valkey-class service only at that point; it is not justified solely for the initial single-instance showcase.

## 5. MongoDB Production Readiness

### Runtime connectivity

- PASS: runtime has no localhost Mongo fallback (`backend/src/config/db.js:4-8`).
- PASS: startup waits for Mongo and exits on failure.
- Mongo TLS is controlled by `MONGODB_URI`; the repository cannot prove the live URI uses `mongodb+srv://`/TLS.
- Database name is not separately configured or asserted. The production URI must contain an explicit production database name.
- Mongoose's driver handles reconnects, but the app does not expose disconnect state through readiness.
- No query-level timeouts exist. Add bounded time only to expensive public/admin reads after pagination; do not apply an arbitrary tiny global limit.
- Order transactions require a replica set/managed cluster. A standalone MongoDB server is incompatible with the shipped transaction flows (`backend/src/controllers/v1/orderController.js:452-614,661-715`).

### Required for showcase

- A separate production/showcase database, never the developer database.
- A dedicated application user with `readWrite` on that database only; no cluster-admin credential.
- TLS connection URI stored only in Render secrets.
- Replica-set/transaction support.
- Network access limited to Render egress addresses where the Mongo provider and Render plan allow it. If static egress is unavailable, use strong unique credentials, TLS, provider alerts, and the narrowest feasible access rule rather than treating `0.0.0.0/0` as safe.
- A provider snapshot/export before destructive seed or migration work.
- Destructive scripts from Part 1 must be blocked from the production database.

### Required before real customer data

- Automated backups with retention and point-in-time recovery where supported.
- A tested restore procedure and periodic restore drill.
- Credential rotation and database alerts.
- Separate development, preview/staging, and production users/databases.
- Capacity/connection monitoring and documented recovery objectives.
- Controlled migration/index deployment rather than ad hoc seed/fix scripts.

## 6. Cloudinary Migration Plan

### Local filesystem inventory

| Use | Evidence | Classification |
|---|---|---|
| Multer writes product/category/animal/brand/banner/user uploads | `backend/src/utils/upload.js:5-46` | **MUST MOVE TO DURABLE STORAGE** |
| Express serves `/uploads` | `backend/server.js:67` | **MUST MOVE / retain temporarily only for legacy reads** |
| Product/brand/category/animal/banner/user file deletion | `imageFiles.js`, `bannerFiles.js`, `authController.js:16-34` | Replace with provider deletion |
| Seed script creates SVG icons/copies product images | `backend/seedReferenceData.js:94-160` | One-off migration input; do not run as production storage |
| Browser CSV export | `adminend/src/components/OrderHistoryDashboard.js:390-408` | **SAFE TEMPORARY STORAGE** (browser Blob only) |
| Invoice print | `adminend/src/components/InvoiceDetailDashboard.js:52-59` | **SAFE**; no server file is created |
| Next `public/` assets and cursors | `clientend/public/**` | **SAFE IMMUTABLE BUILD ASSETS** |
| `clientend/public/uploads/image-1.png` | no code reference found | Static orphan candidate, not runtime storage |

There are no server-generated PDFs, invoice files, report files, or application file caches.

### Recommended upload architecture

Choose **A: Frontend → backend → Cloudinary**.

It matches the existing multipart API, keeps admin/user authorization in one place, avoids frontend upload-signature and abandoned-upload complexity, and is adequate for at most ten 4 MiB product images. Use Multer memory storage with strict limits; do not persist temporary files to Render.

The backend must:

- Keep `CLOUDINARY_API_SECRET` backend-only.
- Allowlist and signature/decode-check JPEG, PNG, and WebP. Do not accept arbitrary `image/*` or untrusted SVG.
- Generate public IDs/folders server-side.
- Reject frontend-provided arbitrary Cloudinary URLs/public IDs.
- On update, accept only existing asset IDs already owned by that record.
- Store Cloudinary response metadata, not just a parseable URL.

### Actual image types and limits

| Resource | Current route limit | Recommended formats | Replacement/deletion | Folder/public-ID strategy |
|---|---|---|---|---|
| Product | Up to 10 × 4 MiB (`productRoutes.js:15-40`) | JPEG/PNG/WebP | Upload new; save DB; delete removed old assets only after DB success. Keep on soft delete; purge on deliberate permanent deletion. | `<env>/products/<product-or-request-id>/<random-id>` |
| User profile | 1 × 2 MiB (`userRoutes.js:31-48`) | JPEG/PNG/WebP | New upload → DB save → delete old; delete on final account-erasure workflow | `<env>/users/<user-id>/<random-id>` |
| Category | 1 × 4 MiB now; 2 MiB is sufficient (`categoryRoutes.js:14-32`) | JPEG/PNG/WebP | Replace after DB success. Soft delete should keep media for restore or clear the field consistently; current code deletes the file but leaves the path (`categoryController.js:178-181`). | `<env>/categories/<category-id>/<random-id>` |
| Animal | 1 × 4 MiB now; 2 MiB is sufficient (`animalRoutes.js:14-32`) | JPEG/PNG/WebP | Same policy as category; current soft delete deletes file but retains path (`animalController.js:272-275`). | `<env>/animals/<animal-id>/<random-id>` |
| Brand | 1 × 4 MiB now; 2 MiB is sufficient (`brandRoutes.js:14-32`) | JPEG/PNG/WebP; migrate trusted seed SVGs separately | Current soft delete retains image; preserve until purge | `<env>/brands/<brand-id>/<random-id>` |
| Banner | 1 × 4 MiB (`bannerRoutes.js:13-31`) | JPEG/PNG/WebP | Hard delete should destroy asset; replacement destroys old only after save (`bannerController.js:282-321`) | `<env>/banners/<type>/<banner-id-or-request-id>/<random-id>` |

PromoDeal has no image field; no promotional-content media migration should be invented.

### Database shape

Use a reusable image subdocument:

```text
{
  secureUrl,
  publicId,
  width,
  height,
  format,
  bytes
}
```

`secureUrl` and `publicId` are required. Dimensions and format support rendering/validation; bytes support diagnostics. Never delete by parsing a URL.

Models requiring changes:

- `Product.images` (`backend/src/models/Product.js:67-72`)
- `User.profilePic` (`backend/src/models/User.js:31-34`)
- `Category.image` (`backend/src/models/Category.js:43-46`)
- `Animal.image` (`backend/src/models/Animal.js:21-24`)
- `Brand.image` (`backend/src/models/Brand.js:33-36`)
- `Banner.imageUrl` (`backend/src/models/Banner.js:24-28`)

`Order.items[].image` is a historical URL snapshot (`backend/src/models/Order.js:43-47`). It can remain a string, but permanent product-media purge must either accept broken historical thumbnails or retain media for the order-retention period.

Controllers/utilities requiring changes:

- `productController.js` image merge/create/update/delete paths
- `authController.js` profile replacement and account deletion
- `categoryController.js`
- `animalController.js`
- `brandController.js`
- `bannerController.js`
- `utils/upload.js`, `utils/imageFiles.js`, and `utils/bannerFiles.js`
- Frontend/admin serializers and renderers if API responses expose the media object rather than mapping it back to `secureUrl`

### Orphan prevention

1. **Upload succeeds, DB create fails:** track uploaded public IDs and destroy them in the request failure path.
2. **Replacement upload succeeds, DB update fails:** destroy the new asset; leave the old DB record/asset unchanged.
3. **Replacement succeeds:** commit DB first, then destroy the old asset. If destroy fails, log an explicit cleanup event.
4. **Permanent product purge:** destroy all owned public IDs after the retention decision; soft delete must not destroy them.
5. **Profile changes:** save new metadata, then destroy old. Account deletion must explicitly destroy the current profile asset.
6. **Admin abandons upload:** architecture A uploads only on form submission, so no pre-submit asset exists.
7. **Multiple product files partially upload:** use `Promise.allSettled`; if any upload fails, destroy every asset uploaded by that request and do not update MongoDB.

The simplest reliable backstop is a small periodic/manual reconciliation script that compares Cloudinary assets under the environment folder with public IDs referenced by MongoDB. A queue or workflow system is unnecessary for the showcase.

## 7. Media Rendering & Optimization

### Current findings

- Major catalog components use Next `<Image>` with stable aspect-ratio containers, which limits layout shift.
- Many remote catalog images set `unoptimized`, bypassing Next optimization: product cards/details, category/animal/brand cards, and navigation (`ProductCard.js:88-95`; `ProductDetails.js:125-131,373-404`; `Navbar.js:85-157`).
- Every `ProductCard` image is marked `priority` (`ProductCard.js:88-95`). A grid can therefore eagerly fetch many below-the-fold images.
- Product cards use `fill` without a `sizes` value, causing poor responsive selection.
- Product detail's main image correctly has `priority` and responsive `sizes`, but is still `unoptimized` (`ProductDetails.js:373-380`).
- `BannerImage` uses raw `<img>` without intrinsic dimensions (`clientend/src/components/BannerImage.js:17-26`). Parent aspect-ratio styling can contain it, but responsive source selection is absent.
- Contact images use raw `<img>`; key hero/store images have width/height, so CLS risk is lower (`clientend/src/app/contact/page.js:243-248,659`).
- Profile images use raw `<img>` and original-size URLs (`profile/page.js:281-285,683-686`; `MiddleBar.js:178-181`).
- Admin account avatars use CSS backgrounds, potentially downloading full originals (`adminend/src/components/AccountDetailsDashboard.js:119-124`).
- Both Next configs allow all HTTPS image hosts; storefront also permits local/private IP optimization (`clientend/next.config.mjs:10-33`; `adminend/next.config.mjs:2-17`).

### Cloudinary delivery

Store original provider metadata once and generate delivery transformations at render time:

- All: `f_auto,q_auto`
- Product grid: bounded square/padded thumbnail around 400 px
- Product detail: `c_limit` around the largest rendered detail width; responsive `srcset`
- Product thumbnails/navigation/brand/category icons: 96–200 px variants
- Banners: crop/fill to the rendered aspect ratio with responsive widths
- Profile: square face-aware crop where appropriate

Use a Cloudinary-aware Next image loader or server URL builder so Next emits responsive widths. Do not store manually resized copies or transformed URLs in MongoDB. Restrict `remotePatterns` to the account's Cloudinary host/path and remove production local-IP allowances.

## 8. Next.js Rendering Audit

| Page | Current strategy | Recommended strategy | Reason |
|---|---|---|---|
| Homepage | Dynamic RSC for two banner calls plus several client-fetching sections | Server-render public content with short revalidation; retain carousel/filter/modal islands | Better initial HTML and fewer post-hydration requests |
| Categories index | Server-rendered, all fetches `no-store` | Revalidate taxonomy for a few minutes | Public taxonomy changes infrequently |
| Animal/category/brand pages | Server-rendered; category/animal use `generateStaticParams`; product data is `no-store` | Dynamic params with short ISR/revalidation; 404 missing records | Avoid build dependence and per-request full origin cost |
| Product detail | Dynamic server render, `cache: no-store`; client reviews fetch | Keep dynamic or very short revalidation for stock/price; cache stable descriptive content only | Inventory must not become stale; SEO benefits from server HTML |
| Search results | Not actually shipped (Part 1 M-15) | Server-render query results once implemented; noindex result pages by default | Avoid empty client shell and low-value index pages |
| Cart | Client-rendered | Client-rendered, private/no-store | Interactive and user-specific |
| Checkout | Client-rendered | Client-rendered, private/no-store | Interactive and user-specific |
| Profile/order history | Large client page | Client-rendered private page; split/lazy-load tabs and paginate | Authentication and interactivity justify CSR |
| Wishlist | Client-rendered | Client-rendered, private/no-store | User/guest state |
| Contact | Entire page client-rendered | Server-render static store/FAQ content; client islands for map/form | Most content needs no client JavaScript |
| Admin routes | Static server page shells around client dashboards | Client UI is acceptable; add server/edge gate only as defense-in-depth | Backend remains authorization boundary |

Meaningful client-boundary issues:

- Entire contact page is client-only for a map/form (`clientend/src/app/contact/page.js:1-9`).
- Home merchandising (`FeaturedProducts`, `PopularBrands`, `ShopByPetType`, `PromoDealsSection`) fetches after hydration even though it is public content.
- `ProductDetails` is a large client component combining gallery, cart, wishlist, reviews, and static description. Static details can remain server-rendered while interactive controls become islands.
- Profile is a very large client page; tab-level code splitting would reduce initial private-page JS.

## 9. Caching Audit

### Static assets

PASS: Vercel/Next can fingerprint and cache built static assets. Keep immutable local design assets in `public`; do not use it for runtime uploads.

### Public API/data

Current public catalog helpers use `cache: "no-store"` (`categoryApi.js:40-74`; `productApi.js:96-134`; `bannerApi.js:54-89`). The backend sets no explicit `Cache-Control`.

Safe short caching candidates:

- Animals, categories, brands: a few minutes
- Banners and promo deals: roughly one minute
- Public product listings: short revalidation if inventory visibility tolerates it
- Product description metadata: cacheable; current stock/price should remain short-lived or uncached

For the showcase, Next's fetch revalidation is sufficient. Tag/webhook invalidation can be added later if stale admin edits become a real operational problem.

### Private/admin data

Set `Cache-Control: private, no-store` on auth, profile, cart, wishlist, orders, inquiries owned by a user, and all admin responses. Browser fetches should also explicitly use `no-store`.

No evidence shows a shared CDN currently caching these responses, but relying on absence of headers is unsafe. Admin `searchCache` is a module-level browser cache that can retain stale order/account/product data until reload (`adminend/src/components/AdminGlobalSearch.js:9-25`).

### Cloudinary

Use versioned/unique public IDs and long immutable CDN caching. Replacement should create a new ID/version, update MongoDB, and then destroy the old asset; this avoids stale cache invalidation problems.

## 10. Environment Variable Matrix

No values are reproduced.

| Variable | Application | Required? | Secret/Public | Platform | Current fallback | Recommended production behavior |
|---|---|---:|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Storefront + admin | Yes | Public | Vercel | localhost/API-on-port-3000 | Fail both builds when absent/invalid; require HTTPS and `/api/v1` |
| `NEXT_PUBLIC_API_ORIGIN` | Storefront cart | Yes until refactored | Public | Vercel | `http://localhost:3000` | Set HTTPS API origin or derive it from `NEXT_PUBLIC_API_URL` and remove this variable |
| `PORT` | Backend | Platform-provided | Public config | Render | `3000` | Read Render's value; never override it |
| `NODE_ENV` | Backend | Yes | Public config | Render | Environment-dependent | Require `production`; Render normally injects it |
| `MONGODB_URI` | Backend/scripts | Yes | Secret | Render/MongoDB | None at runtime | Fail before startup if missing; require explicit prod DB/TLS URI |
| `MONGO_URI` | Maintenance scripts only | No | Secret | Operator environment | None | Deprecate alias; use one guarded variable |
| `ACCESS_TOKEN_SECRET` | Backend | Yes | Secret | Render | None | Fail startup; long independent random value |
| `REFRESH_TOKEN_SECRET` | Backend | Yes | Secret | Render | None | Fail startup; different from access secret |
| `ACCESS_TOKEN_EXPIRES_IN` | Backend | Policy-required | Public config | Render | `1h` | Validate duration; choose deliberate short access lifetime |
| `REFRESH_TOKEN_EXPIRES_IN` | Backend | Policy-required | Public config | Render | `1h` | Validate duration; choose deliberate longer refresh lifetime |
| `CLIENT_URL` | Backend CORS | Yes | Public config | Render | None | Exact HTTPS storefront production origin |
| `ADMIN_URL` | Backend CORS | Yes | Public config | Render | None | Exact HTTPS admin production origin |
| `CLIENTEND_URL` | Backend legacy CORS alias | No | Public config | Render | None | Remove after standardizing names |
| `ADMINEND_URL` | Backend legacy CORS alias | No | Public config | Render | None | Remove after standardizing names |
| `CLIENT_URLS` | Backend extra CORS origins | No | Public config | Render | None | Explicit comma list only; do not add automatic production previews |
| `MAIL_DELIVERY_ENABLED` | Backend | Yes | Public config | Render | Anything except `true` uses logging stub | Require `true` when email auth features are enabled; fail closed in production |
| `SMTP_HOST` | Backend | If mail enabled | Sensitive config | Render | None | Validate at startup |
| `SMTP_PORT` | Backend | If mail enabled | Public config | Render | `NaN` if absent | Parse and validate |
| `SMTP_SECURE` | Backend | If mail enabled | Public config | Render | `false` | Explicit provider-appropriate boolean |
| `SMTP_USER` | Backend | If mail enabled | Secret | Render | None | Secret |
| `SMTP_PASS` | Backend | If mail enabled | Secret | Render | None | Secret |
| `MAIL_FROM` | Backend | If mail enabled | Public/sensitive config | Render | None | Verified sender address |
| `CLOUDINARY_CLOUD_NAME` | Backend (planned) | After migration | Public identifier | Render/Cloudinary | Not implemented | Validate at startup |
| `CLOUDINARY_API_KEY` | Backend (planned) | After migration | Secret credential | Render/Cloudinary | Not implemented | Backend only |
| `CLOUDINARY_API_SECRET` | Backend (planned) | After migration | Secret | Render/Cloudinary | Not implemented | Backend only; never `NEXT_PUBLIC_*` |
| `CLOUDINARY_FOLDER_PREFIX` | Backend (planned) | Recommended | Public config | Render/Cloudinary | Not implemented | Distinct `dev`, `preview`, and `prod` prefixes |

The code has no email callback/base-URL variable because current emails contain OTP text rather than frontend links.

### Fail-fast requirements

Backend startup must fail in production if MongoDB, either JWT secret, exact storefront/admin origins, enabled mail credentials, or post-migration Cloudinary credentials are missing/invalid.

Frontend builds must fail when `NEXT_PUBLIC_API_URL` is absent, localhost, non-HTTPS in production, or malformed. Storefront must also fail for the current separate API-origin variable until it is removed.

## 11. Cookie / CORS / CSRF Deployment Design

### Same-site custom subdomains

For `shop.example.com`, `admin.example.com`, and `api.example.com`:

- Cookies: `Secure`, `HttpOnly`, explicit `Path=/`; omit `Domain` so auth cookies remain host-only to `api.example.com`.
- `SameSite=Lax` is viable because these origins are cross-origin but same-site.
- Browser fetch must keep `credentials: "include"`; current clients do this (`clientend/src/lib/api.js:19-25`; `adminend/src/lib/adminApi.js:24-31`).
- CORS must list the exact storefront and admin HTTPS origins and return credentials.

### Provider domains

`*.vercel.app` and `*.onrender.com` are cross-site. Direct cookie auth requires `SameSite=None; Secure`, but browser third-party-cookie restrictions can still block it. This topology is suitable for limited testing, not a dependable final authentication architecture. Use custom same-site subdomains before treating login as production-ready.

### CORS

Development:

- Permit exact `http://localhost:3001` and `http://localhost:3002`.
- Optional private-LAN origins only under an explicit development condition.

Production:

- Permit only exact configured HTTPS storefront/admin origins.
- No wildcard with credentials.
- No generic private-IP or localhost allowance.
- Send `Vary: Origin`.
- Preview origins must not be automatically accepted by production.

Current code violates the production rules by merging localhost and broad private-origin checks in every environment (`backend/server.js:15-45,52-61`).

### CSRF

Keep cookie JWT authentication. Add a session-bound, signed CSRF token:

1. Return it from a credentialed CSRF endpoint/login response without exposing JWTs.
2. Store it in frontend memory and refresh after reload/login.
3. Send it in `X-CSRF-Token` on POST/PATCH/PUT/DELETE.
4. Validate token and exact `Origin` before mutation.
5. Apply it to authenticated cart, wishlist, profile, address, account, order, review, and all admin mutations, including logout/refresh as appropriate.

Unauthenticated signup/inquiry endpoints need rate limits and validation, not user-session CSRF. Requiring a custom header also ensures hostile cross-site forms cannot silently mutate state.

## 12. Security Headers / CSP

### Baseline

Storefront/admin:

- `Strict-Transport-Security` on custom HTTPS domains (coordinate with platform; add `includeSubDomains` only when all subdomains are HTTPS)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `frame-ancestors 'none'` in CSP; `X-Frame-Options: DENY` as legacy defense
- Admin: `X-Robots-Tag: noindex, nofollow, noarchive`

Backend/API:

- HSTS at the Render/custom-domain edge
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `frame-ancestors 'none'`
- API CSP can be restrictive (`default-src 'none'`) because it serves JSON after local uploads are removed

### Evidence-based CSP sources

Storefront currently needs:

- `default-src 'self'`
- `connect-src 'self' https://<api-host>`
- `img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org`
- `font-src 'self' https://fonts.gstatic.com`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com`
- `script-src 'self' https://unpkg.com`
- `frame-ancestors 'none'`
- `base-uri 'self'`
- `form-action 'self'`
- `object-src 'none'`

The contact page loads Leaflet JS/CSS from unpkg and map tiles from OpenStreetMap (`clientend/src/app/contact/page.js:123,218-226`); contact CSS imports Google Fonts (`contact.css:1`). Packaging Leaflet locally and moving that font to `next/font` would simplify CSP and reduce third-party runtime failure.

Next may require nonce-aware handling for its inline bootstrap. Roll CSP out as `Content-Security-Policy-Report-Only`, inspect violations, then enforce. Do not use `*` or permanently add broad script `unsafe-eval`.

## 13. Logging & Observability

### Current state

- Morgan `combined` logs request method/URL/status/referrer/user-agent in production (`backend/server.js:63`).
- It does not log bodies, cookies, passwords, or Authorization headers: PASS.
- Query strings can still contain searches or identifiers and should be redacted/truncated.
- Mail-disabled mode logs recipient and full OTP text: critical failure inherited from Part 1 (`backend/src/config/mail.js:3-10`).
- Global API errors sanitize responses but do not log internal failures (`backend/src/middleware/error.middleware.js:7-45`).
- No request/correlation ID, structured logs, error monitoring, metrics, or uptime monitor exists.

### Minimum production diagnostics

Mandatory for showcase:

- JSON logs to stdout with timestamp, level, request ID, route template, status, duration, and environment/release ID.
- Redaction of cookies, authorization, JWTs, OTPs, passwords, SMTP/Cloudinary/Mongo credentials, and customer request bodies.
- Server-side logging of 500 errors with stack and request ID while clients receive only the generic ID.
- Explicit Mongo connect/disconnect, SMTP failure, and Cloudinary failure events.
- Render deploy/runtime logs and Vercel function/client logs retained long enough to diagnose the showcase.
- Readiness endpoint and a basic external uptime check.

Error monitoring is **recommended before the public showcase** and **required before real customer data**. One small service (for example, Sentry or equivalent) across Express and both Next apps is sufficient; an enterprise metrics stack is not needed.

## 14. Performance Findings

### Frontend

1. Every storefront route renders async `Header`, which requests animals, categories, and brands; category data is logically requested twice (`clientend/src/layout/Header.js:8-13`; `categoryApi.js:77-92`).
2. Home then refetches animals and brands client-side and separately fetches featured products/promo deals (`ShopByPetType.js:60-78`; `PopularBrands.js:31-56`; `FeaturedProducts.js:13-44`; `PromoDealsSection.js:227-241`).
3. Root `AuthProvider` requests `/users/me` on every page; an anonymous 401 can trigger a refresh attempt before settling (`AuthContext.js:35-52`; `clientend/src/lib/api.js:34-48`).
4. Guest cart/wishlist merge sends one sequential request per item (`CartProvider.js:83-98`; `WishlistProvider.js:82-90`).
5. Product grids fetch up to 50 featured products, shuffle client-side, and display 10 (`FeaturedProducts.js:16-31`).
6. All product-card images are priority and unoptimized.
7. Contact loads third-party Leaflet after hydration; profile and product-detail components are large client bundles.
8. No API polling was found. One-second promo countdown updates are UI-only but cause regular rerenders.

### Backend

Deployment-relevant performance issues from Part 1:

- Orders, accounts, account orders, reviews, inquiries, invoices, brands/categories/animals, and several admin datasets are unbounded.
- Admin screens repeatedly download full order/account datasets and filter/aggregate in the browser.
- Product list is capped and rating aggregation is batched: PASS.
- Auth middleware loads a full User document on every protected request, including fields not needed for authorization (`backend/src/middleware/auth.middleware.js:16-27`).
- No response compression is configured.
- No media processing currently occurs; Cloudinary should handle transformations instead of adding synchronous image processing to request handlers.

Highest-value fixes are pagination/projections, cached public taxonomy, server-rendered home data, batched guest sync, and image delivery—not micro-optimizations.

## 15. Core Web Vitals

### LCP risks

- Home hero's first local image is priority with responsive sizes: PASS (`HomeBannerCarousel.js:247-255`).
- All product-card images are also priority, competing with the real LCP (`ProductCard.js:88-95`).
- Public home product/brand/category content appears only after hydration/API requests.
- Product detail main image is priority but bypasses optimization (`ProductDetails.js:373-380`).

### CLS risks

- Most Next Image containers have fixed aspect ratios: PASS.
- Raw `BannerImage` lacks intrinsic dimensions and relies on parent sizing (`BannerImage.js:17-26`).
- Client sections return `null` while loading and later insert large blocks, shifting content below them (`FeaturedProducts.js:46-48`; similar brand/promo sections).

### INP risks

- Large global client provider tree, custom cursor effects, hero pointer/animation handlers, and large profile/contact/product components increase main-thread work.
- Product cards force many eager image requests.
- Promo cards can update countdown state every second.

Measure with Vercel Web Analytics/Speed Insights or browser field data after deployment; these are evidence-based risks, not measured production scores.

## 16. SEO Findings

**Verdict: NOT READY for public indexing.**

- Root storefront title/description are unchanged create-next-app placeholders (`clientend/src/app/layout.js:19-22`).
- Product pages have title/description metadata: PASS (`product/[slug]/page.js:28-41`).
- Categories, animals, brands, homepage, and contact lack tailored metadata.
- No canonical URLs, Open Graph/Twitter metadata, social images, sitemap, or robots file exists.
- Search is not functional; when implemented, result pages should normally be `noindex,follow`.
- Cart, checkout, wishlist, profile, and order views should be `noindex`.
- Invalid taxonomy slugs redirect home rather than returning 404.
- Product slugs change when names change (`backend/src/models/Product.js:160-182`), so URLs are not stable without redirects or immutable-slug policy.
- Heading structure is generally present on public pages, but metadata and URL behavior are the larger gaps.
- Admin has no robots exclusion/noindex (`adminend/src/app/layout.js:15-18`).

Required showcase SEO: real global metadata, metadata base/canonical policy, product/category metadata, `sitemap.js`, `robots.js`, private-page noindex, admin noindex, and custom 404/error pages.

## 17. Dependency / Build Findings

### Audit results

Audit output is time-sensitive and was recorded on the audit date.

- Storefront production dependencies: 5 findings — 1 critical, 3 high, 1 moderate.
- Admin production dependencies: 5 findings — 1 critical, 3 high, 1 moderate.
- Backend production dependencies: 6 findings — 2 high, 3 moderate, 1 low.

Material direct packages:

- Both Next apps use `next@16.2.6`; npm reports critical/high Next/Image Optimization/server advisories and a non-major fix path to 16.3.5 at audit time. Upgrade to a currently fixed release and rerun build/lint/smoke tests before deployment.
- Backend `multer@2.1.1` has multipart denial-of-service and cleanup/limit advisories; a fixed 2.3.0+ line was indicated.
- `nodemailer@8.0.7` has high/moderate advisories; npm indicated a major upgrade path. Review release notes and test SMTP.
- Mongoose's resolved vulnerable range is below 8.24.1; update within the supported major.
- Morgan has log-forging advisories; update to a fixed release or replace it in the structured-logging work.
- Transitive `body-parser`/`qs` findings should resolve through compatible dependency updates.

The Windows-specific Next RCE is not directly applicable to Linux Vercel, but the AVIF image-optimization advisory and other Next findings still make the current version unacceptable for public release.

### Reproducibility

- PASS: all three `package-lock.json` files are lockfile v3.
- PASS: `npm ci --ignore-scripts --dry-run` completed in all three projects.
- FAIL: no Node `engines`, `.nvmrc`, `.node-version`, or `packageManager` pin.
- FAIL: frontend builds succeed with absent API variables because localhost fallbacks mask configuration errors.
- Backend has no build artifact or generated code requirement.
- Direct `mongodb@7` is unused in application code while Mongoose carries its own driver; remove it after confirmation to avoid duplicate driver majors.

No `vercel.json`, `render.yaml`, Dockerfile, Procfile, or CI workflow exists. Platform dashboard settings are enough for the initial three services; configuration files are optional until repeatability or additional environments justify them.

## 18. Preview vs Production Isolation

Current code does not enforce isolation.

Risks:

- Vercel Preview can inherit a production API URL if environment scopes are configured carelessly.
- A preview allowed by production CORS can send production cookies and perform real user/admin mutations.
- Preview traffic can indirectly reach the production MongoDB, Cloudinary folder, SMTP recipients, and admin accounts through the production API.
- `SameSite=None` on provider domains increases the importance of strict origin isolation.

Required policy:

- Production Vercel variables point only to production API.
- Preview variables point to a separate staging API/database and distinct Cloudinary prefix.
- Production API CORS never automatically accepts `*.vercel.app`.
- Preview admin authentication is disabled unless a specific protected preview is explicitly allowlisted on the staging API.
- Use Vercel Deployment Protection for preview URLs.
- Use mail sandbox/sink behavior in preview; never send real OTP mail to customers.
- Use separate staging admin credentials and never seed the known Part 1 account.

## 19. Deployment Settings

### Storefront — Vercel

Root Directory: `clientend`

Framework Preset: `Next.js`

Node.js Version: `22.x` LTS

Build Command: `npm run build`

Install Command: `npm ci`

Environment Variables:

- `NEXT_PUBLIC_API_URL` — required, public, HTTPS API URL ending `/api/v1`
- `NEXT_PUBLIC_API_ORIGIN` — required by current cart code; remove after deriving it centrally

Production and Preview values must differ.

### Admin — Vercel

Root Directory: `adminend`

Framework Preset: `Next.js`

Node.js Version: `22.x` LTS

Build Command: `npm run build`

Install Command: `npm ci`

Environment Variables:

- `NEXT_PUBLIC_API_URL` — required, public, HTTPS API URL ending `/api/v1`

Enable preview deployment protection and noindex.

### Backend — Render

Service Type: Web Service

Runtime: Node

Root Directory: `backend`

Node Version: `22.x` LTS

Build Command: `npm ci --omit=dev`

Start Command: `node server.js`

Health Check: `/health/ready` after implementation. Do not treat current `/` as a database readiness check.

Environment Variables:

- `NODE_ENV=production`
- `MONGODB_URI`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_IN`
- `CLIENT_URL`
- `ADMIN_URL`
- `MAIL_DELIVERY_ENABLED`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- Post-migration Cloudinary variables from section 10

Leave `PORT` to Render. Do not attach a persistent disk as a substitute for Cloudinary: it restricts scaling and changes zero-downtime deployment behavior.

## 20. BLOCKERS

1. **Current Render start script overrides `PORT` and listener does not explicitly bind `0.0.0.0`.** (`backend/package.json:8`; `backend/server.js:81-83`).
2. **All user/admin uploads are still on ephemeral local disk** and will be lost across deploy/restart/instance replacement.
3. **Both Next deployments use a version with current critical production advisories**; backend Multer/Nodemailer also have high findings.
4. **Part 1 blockers remain release blockers:** fixed admin credentials, OTP logging/no abuse controls, unsupported payment choices, missing CSRF/strict CORS, checkout concurrency, inactive catalog exposure, and failing storefront lint.
5. **Production cookie auth is unreliable on unrelated provider domains** and unsafe with current production CORS/CSRF behavior.
6. **No reliable Render readiness endpoint or graceful shutdown exists.**
7. **Critical environment variables silently fall back to localhost or fail only on first use.**
8. **Preview deployments are not isolated from production data/API by repository policy.**

## 21. MUST FIX

1. Implement Cloudinary migration and migrate/backfill all six media-owning models before removing legacy `/uploads`.
2. Add environment schema validation and value-free examples; remove production localhost fallbacks.
3. Separate production and staging MongoDB, Cloudinary prefixes, mail behavior, and admin accounts.
4. Use exact production CORS origins, same-site custom subdomains, appropriate cookies, and session-bound CSRF proof.
5. Add `/health/live`, `/health/ready`, Mongo state tracking, SIGTERM drain, and clean Mongo shutdown.
6. Update audited vulnerable dependencies and pin Node/npm/package versions.
7. Make email fail closed, verify SMTP configuration, retain existing 5/5/8-second Nodemailer timeouts (`backend/src/config/mail.js:18-20`), and never log OTP content.
8. Add private/no-store cache headers to authenticated/admin APIs and short deliberate caching to public taxonomy/media.
9. Add storefront metadata/sitemap/robots/private-page noindex and admin noindex.
10. Add explicit outage/404/500/timeout UI; an API outage must not become an empty catalog or login redirect.

## 22. SHOULD FIX

1. Server-render public homepage data and remove duplicate post-hydration catalog requests.
2. Paginate/project all unbounded admin and user-history endpoints.
3. Remove `unoptimized` from major catalog images, add responsive `sizes`, and remove priority from non-LCP cards.
4. Add structured redacted logs, request IDs, one error-monitoring service, and uptime monitoring.
5. Explicitly configure JSON/URL-encoded/multipart limits.
6. Split the contact/product/profile client bundles into server content plus interactive islands.
7. Replace generic social links and placeholder policy anchors with real production URLs (`clientend/src/components/Footer.js:11-31`; `adminend/src/components/DashboardShell.js:612-616`).
8. Add bounded client/API timeouts to the storefront's general `apiRequest`; admin already has 10 seconds (`adminend/src/lib/adminApi.js:17-42`).
9. Remove unused direct `mongodb` dependency and align Next/ESLint package versions.
10. Add response compression after measuring payloads and ensuring it is not duplicated by the platform.

## 23. NICE TO HAVE

1. Add a `render.yaml` only when repeatable staging/production service definitions outweigh dashboard simplicity.
2. Add cache-tag invalidation from admin mutations if short TTLs become visibly stale.
3. Add field-level performance monitoring/Web Vitals.
4. Use a Cloudinary custom delivery domain later if branding or CSP simplification warrants it.
5. Add stronger server/edge admin route gating as defense-in-depth; backend authorization remains mandatory.

## 24. Production Smoke-Test Checklist

Use a new production-like test account and disposable COD order. Verify desktop and mobile browsers.

### Storefront

- [ ] Homepage loads correct banners, animals, categories, featured products, promo content, and brands; API outage shows an error, not an empty valid catalog.
- [ ] Catalog/category/animal/brand direct URLs and refresh work.
- [ ] Invalid/deleted taxonomy and product URLs return appropriate 404 states.
- [ ] Search works only after Part 1 M-15 is implemented; otherwise remove it from the shipped showcase.
- [ ] Product details, variants, stock, responsive Cloudinary images, reviews, and related products load.
- [ ] Signup sends a real verification email; OTP is absent from logs.
- [ ] Verification, login, refresh after reload, logout, forgot-password, and expiry behavior work.
- [ ] Profile read/update/profile-image replacement work; old Cloudinary asset is removed.
- [ ] Guest and authenticated cart/wishlist add/update/remove/merge work.
- [ ] Checkout exposes COD only until a real gateway exists.
- [ ] COD order decrements stock and appears in order history.
- [ ] Approved review appears only according to the corrected moderation rule.
- [ ] Inquiry submit and authenticated inquiry history work.
- [ ] API timeout/offline and broken-image states are visible and recoverable.

### Admin

- [ ] Login accepts only admin and handles expiry/API outage distinctly.
- [ ] Products create/update/soft-delete with 1 and multiple Cloudinary images; failed validation leaves no orphan.
- [ ] Categories, brands, and animals create/update/toggle/delete with correct media lifecycle.
- [ ] Banners create/replace/toggle/delete; old media is removed.
- [ ] Orders list/detail/status and COD payment state work.
- [ ] Customers list/detail are backend-authorized.
- [ ] Reviews moderate/reply/hide/delete correctly.
- [ ] Inquiries list/detail/status/reply work.
- [ ] Paid invoice list/detail/print work; unpaid order is excluded.
- [ ] Admin direct route refresh works and unauthenticated access redirects without exposing data.
- [ ] Admin host and previews return noindex headers/metadata.

### Infrastructure

- [ ] Render binds the injected port and `0.0.0.0`.
- [ ] `/health/live` works without exposing internals.
- [ ] `/health/ready` becomes 503 when Mongo is unavailable.
- [ ] SIGTERM drains and closes Mongo cleanly.
- [ ] Mongo connection is TLS, points to the intended database, supports transactions, and uses least privilege.
- [ ] Cloudinary create/replace/delete/partial-failure cleanup succeeds in the production folder only.
- [ ] SMTP sender/TLS/timeouts work; mail failure returns failure rather than fake success.
- [ ] Production CORS accepts only storefront/admin; hostile and preview origins fail.
- [ ] CSRF-less mutations fail; valid frontend CSRF proof succeeds.
- [ ] Logs include request IDs and no secrets, cookies, OTPs, passwords, or tokens.
- [ ] Error-monitoring test events arrive from backend/storefront/admin.

## 25. Final Deployment Checklist

### Code fixes

- [ ] Complete all Part 1 blockers and must-fix release items.
- [ ] Fix Render port/bind, health, shutdown, environment validation, CORS/CSRF, headers, limits, logging, and error handling.
- [ ] Update vulnerable dependencies; rerun audit, lint, builds, syntax, and tests.
- [ ] Complete Cloudinary model/controller/frontend migration and legacy backfill.
- [ ] Add caching policy, image optimization, SEO, admin noindex, and production error pages.

### Infrastructure setup

- [ ] Create separate Vercel storefront/admin projects and one Render web service.
- [ ] Select/pin Node 22 LTS in all three.
- [ ] Create Cloudinary production and preview/staging separation.
- [ ] Configure SMTP provider/sender and error monitoring.

### Environment variables

- [ ] Enter the section 10 contract in Vercel/Render without committing values.
- [ ] Scope Production and Preview values separately.
- [ ] Generate independent secrets and remove/rotate the Part 1 seeded admin.
- [ ] Confirm no production variable points to localhost or development resources.

### Database

- [ ] Create/confirm separate production DB, least-privilege user, TLS, replica-set transactions, network controls, and backups.
- [ ] Guard destructive scripts and apply tested schema/index migrations.
- [ ] Seed only deliberate showcase data; never run destructive development seeds.

### Cloudinary

- [ ] Set production folder prefix and credentials.
- [ ] Backfill local assets, verify every DB reference and rendered URL, then retain a rollback manifest.
- [ ] Verify orphan cleanup and only then stop local writes/static serving.

### Backend

- [ ] Deploy with `backend`, `npm ci --omit=dev`, `node server.js`, and `/health/ready`.
- [ ] Verify startup, DB reconnect/readiness, SMTP, Cloudinary, logs, rate limits, request limits, and shutdown.

### Frontends

- [ ] Deploy storefront/admin with correct root directories and environment scopes.
- [ ] Confirm server-rendered API calls and browser calls both use HTTPS production API.
- [ ] Verify images, direct routes, metadata, robots, error pages, and admin noindex.

### Domains, CORS, and cookies

- [ ] Attach same-site custom subdomains and TLS.
- [ ] Change cookies to the final SameSite policy; retain host-only API cookies.
- [ ] Configure exact CORS origins and validate CSRF end to end.
- [ ] Keep production API inaccessible to unapproved Vercel preview origins.

### Smoke tests and release

- [ ] Run section 24 against production-like data.
- [ ] Test backup/restore and Cloudinary/Mongo consistency expectations.
- [ ] Enable CI-gated deploys and release only the tested commit.
- [ ] Monitor health, errors, logs, mail, and first COD order after release.

# FINAL ASSESSMENT

1. **Are both Next.js apps ready for Vercel?** Structurally yes; release-ready no. Environment fail-fast, dependency updates, Part 1 fixes, SEO/admin indexing, and cookie/CORS work remain.
2. **Is the Express backend ready for Render?** No. Port binding/start command, durable media, readiness, graceful shutdown, dependency, and security work remain.
3. **Will Render restart currently lose important data?** Yes. Every runtime upload stored under `backend/uploads` can be lost.
4. **Is anything still dependent on local files?** Yes: all product, profile, category, animal, brand, and banner uploads and legacy seed media.
5. **Is anything still dependent on localhost?** Yes. Both API clients, server-rendered helpers, cart image origin, and production CORS contain localhost behavior.
6. **Can the project run entirely from environment configuration without source edits?** No. Current start, upload, health/shutdown, CORS/CSRF, fail-fast, and Cloudinary behavior require code changes.
7. **Is MongoDB production configuration safe?** Runtime fails instead of using local Mongo, but live TLS/database/user/network/backup/replica-set safety is unverified and no config validation/readiness exists.
8. **Is the project ready to migrate from local uploads to Cloudinary?** The scope is clear and frontend URL helpers already accept absolute HTTPS URLs, but backend/provider code and schema migration do not exist.
9. **What exact models/controllers must change for Cloudinary?** `Product`, `User`, `Category`, `Animal`, `Brand`, `Banner`; their six controllers plus `upload.js`, `imageFiles.js`, and `bannerFiles.js`.
10. **Can uploaded/replaced/deleted images leak orphan Cloudinary assets?** Yes unless request-scoped rollback, DB-first replacement deletion, account/purge cleanup, and reconciliation are implemented.
11. **Are storefront images rendered efficiently?** No. Many are unoptimized, every product-card image is priority, responsive sizes are incomplete, and raw images use originals.
12. **Are public pages using reasonable Next.js rendering strategies?** Mixed. Product/server catalog pages have a sound base, but all public fetches are uncached and major homepage/contact content is unnecessarily client-dependent.
13. **Is private data protected from shared caching?** No shared CDN leak was found, but explicit `private, no-store` headers are absent and should be mandatory.
14. **Are cookies compatible with Vercel + Render?** Technically with `SameSite=None`, but provider-domain third-party restrictions make them unreliable. Same-site custom subdomains are the recommended final topology.
15. **Is production CORS sufficiently strict?** No. Localhost/private-network origins are accepted in production.
16. **Are preview deployments isolated from production?** No repository-enforced isolation exists.
17. **Are required environment variables documented and validated?** They are inventoried in this report but not documented or validated by the application.
18. **Does Render have a reliable health check?** No. Current `/` is liveness only; the unused health controller also lacks DB readiness.
19. **Does backend shut down cleanly?** No.
20. **Are production errors observable?** Not adequately; access logs exist, internal 500 logging/IDs and error monitoring do not.
21. **Are logs free from sensitive information?** No. Mail-disabled mode logs OTP messages.
22. **Is email correctly configured for production?** SMTP supports explicit TLS mode and bounded timeouts, but config is not startup-validated and disabled mode falsely succeeds/logs secrets.
23. **Are storefront SEO fundamentals ready?** No: placeholder metadata, no canonical/OG/sitemap/robots, unstable slug behavior, and missing noindex policy.
24. **Is admin prevented from indexing appropriately?** No.
25. **Are production builds reproducible?** Lockfiles and `npm ci` work, but Node/npm are unpinned and missing env is masked by localhost fallbacks.
26. **Are there dependency/security issues blocking deployment?** Yes: critical Next findings in both apps and high Multer/Nodemailer findings, plus other moderate/low advisories.
27. **What must be fixed before the first public showcase deployment?** Every BLOCKER in sections 20 and Part 1, Cloudinary, environment validation, strict CORS/CSRF/cookies, health/shutdown, dependency updates, working email, preview isolation, honest COD-only checkout, lint/build gates, and minimum SEO/error observability.
28. **What additional work is required before accepting real customer data?** Payment integration if non-COD is offered, refresh/OTP hardening, atomic stock/promo/refund logic, comprehensive integration tests, automated/PITR backups with restore drills, shared rate limits for multiple instances, stronger monitoring, privacy/retention/account deletion, audit trails, and measured capacity/security testing.

# FIRST 10 IMPLEMENTATION TASKS AFTER BOTH AUDITS

1. **Remove/rotate the predictable administrator and all exposed bootstrap assumptions; inspect every database for the seeded account.**
2. **Upgrade the audited vulnerable dependency set, pin Node/npm/package versions, and restore green client lint/build/audit gates.**
3. **Create a typed environment contract and startup/build validation; eliminate production localhost and mail-disabled fallbacks.**
4. **Fix backend platform lifecycle:** Render port/host binding, live/ready endpoints, Mongo state, SIGTERM drain, crash handling, request limits, and structured redacted errors.
5. **Migrate all six media owners to Cloudinary** with signature validation, metadata/public IDs, rollback cleanup, legacy backfill, and environment-specific folders.
6. **Harden authentication and abuse controls from Part 1:** stop OTP logging, purpose-bind/hash OTPs, rate-limit auth/public forms, strengthen validation, rotate refresh tokens, and fail closed on SMTP.
7. **Finalize domain security:** same-site custom subdomains, host-only secure cookies, exact production CORS, session-bound CSRF, security headers/CSP, admin noindex, and isolated previews.
8. **Fix commerce/data correctness:** COD-only UI, atomic stock/promo/refund guards, active-only catalog, approved truthful reviews/ratings, safe promo responses, and deletion/retention policy.
9. **Fix production data/rendering paths:** pagination/projections, deliberate public/private caching, server-rendered home/catalog data, optimized Cloudinary images, SEO metadata/routes, and explicit outage/404/500 states.
10. **Add CI and meaningful automated coverage**, provision separated production/staging infrastructure and backups, run the complete smoke plan, then release the tested commit.

# Paw Tail Production Fix — Phase 2

Implementation date: 2026-09-21

Scope: Render lifecycle, health/readiness, MongoDB runtime state, request limits, Cloudinary-backed media, legacy-media compatibility, scoped image delivery improvements, request IDs, structured backend errors, migration tooling, and automated tests. No deployment, production database access, real Cloudinary upload, or migration execution was performed.

## Changes Made

- Split Express application construction from process startup so the application, health routes, and shutdown logic can be tested independently.
- Retained the HTTP server instance and added bounded graceful shutdown for `SIGTERM` and `SIGINT`.
- Added fatal `uncaughtException` and `unhandledRejection` handling with structured logs and non-zero exit.
- Added `/health/live` and Mongo-aware `/health/ready`.
- Added explicit Mongo connection state tracking and intentional disconnect behavior.
- Added 100 KiB JSON and URL-encoded request limits with a 100-parameter URL-encoded limit.
- Added backend-generated UUID request IDs in `X-Request-ID`.
- Added production-safe structured internal-error logs and client-visible request IDs for HTTP 500 responses.
- Added official Cloudinary backend integration and `file-type` signature validation.
- Replaced Multer disk storage with memory storage. New runtime uploads never write to `backend/uploads`.
- Restricted runtime media uploads to JPEG, PNG, and WebP and rejected SVG, spoofed MIME, unsupported signatures, oversized files, and excess files.
- Added a common Cloudinary media object and temporary string-or-object schema compatibility.
- Migrated Product, User, Category, Animal, Brand, and Banner controllers to Cloudinary create/replace/delete lifecycles with rollback.
- Preserved media on Product, Category, Animal, and Brand soft deletion.
- Added profile-media cleanup after final User deletion and Banner media cleanup after hard deletion.
- Added a guarded, explicit, idempotent local-media migration script with dry-run and manifest output.
- Centralized storefront/admin media URL resolution, Cloudinary transformations, and retained-media tokens.
- Restricted Next.js image hosts to Cloudinary plus the configured API `/uploads/**` host; production private-IP optimization is disabled.
- Removed eager priority from product-card images, added responsive `sizes`, and removed unconditional `unoptimized` from Cloudinary-capable catalog rendering.
- Changed the storefront production build to Next's supported webpack builder because Turbopack completed generation but repeatedly failed to terminate in this environment. `npm run build` now exits successfully and development behavior is unchanged.

## Files Changed

Backend runtime and configuration:

- `backend/package.json`
- `backend/package-lock.json`
- `backend/.env.example`
- `backend/.gitignore`
- `backend/server.js`
- `backend/src/app.js`
- `backend/src/config/cloudinary.js`
- `backend/src/config/db.js`
- `backend/src/config/env.js`
- `backend/src/runtime/state.js`
- `backend/src/runtime/shutdown.js`
- `backend/src/routes/healthRoutes.js`
- `backend/src/middleware/requestId.middleware.js`
- `backend/src/middleware/error.middleware.js`
- `backend/src/utils/logger.js`
- `backend/src/utils/upload.js`
- `backend/src/utils/media.js`
- `backend/src/utils/imageFiles.js`
- `backend/src/utils/bannerFiles.js` — removed as obsolete
- `backend/src/services/mediaService.js`

Backend media models and controllers:

- `backend/src/models/media.js`
- `backend/src/models/Product.js`
- `backend/src/models/User.js`
- `backend/src/models/Category.js`
- `backend/src/models/Animal.js`
- `backend/src/models/Brand.js`
- `backend/src/models/Banner.js`
- `backend/src/controllers/v1/productController.js`
- `backend/src/controllers/v1/authController.js`
- `backend/src/controllers/v1/categoryController.js`
- `backend/src/controllers/v1/animalController.js`
- `backend/src/controllers/v1/brandController.js`
- `backend/src/controllers/v1/bannerController.js`
- `backend/src/controllers/v1/orderController.js`

Migration and tests:

- `backend/scripts/migrateLocalMediaToCloudinary.js`
- `backend/test/health-shutdown.test.js`
- `backend/test/upload-validation.test.js`
- `backend/test/media-lifecycle.test.js`

Storefront:

- `clientend/package.json`
- `clientend/next.config.mjs`
- `clientend/src/lib/media.js`
- `clientend/src/lib/productApi.js`
- `clientend/src/lib/categoryApi.js`
- `clientend/src/lib/bannerApi.js`
- `clientend/src/app/cart/page.js`
- `clientend/src/app/profile/page.js`
- `clientend/src/app/wishlist/page.js`
- `clientend/src/components/MiddleBar.js`
- `clientend/src/components/Navbar.js`
- `clientend/src/components/PopularBrands.js`
- `clientend/src/components/ProductDetails.js`
- `clientend/src/components/ShopByPetType.js`
- `clientend/src/components/brand/BrandPageContent.js`
- `clientend/src/components/brand/BrandSidebar.js`
- `clientend/src/components/category/AnimalPageContent.js`
- `clientend/src/components/category/CategoryPageContent.js`
- `clientend/src/components/category/ProductCard.js`
- `clientend/src/components/explore/ExplorePageContent.js`

Admin:

- `adminend/next.config.mjs`
- `adminend/src/lib/apiBaseUrl.js`
- `adminend/src/lib/bannerApi.js`
- `adminend/src/lib/media.js`
- `adminend/src/app/dashboard/banners/page.js`
- `adminend/src/components/AccountDetailsDashboard.js`
- `adminend/src/components/CategoryListDashboard.js`
- `adminend/src/components/CreateAnimalDashboard.js`
- `adminend/src/components/CreateBrandDashboard.js`
- `adminend/src/components/CreateCategoryDashboard.js`
- `adminend/src/components/ProductEditorDashboard.js`
- `adminend/src/components/ProductListDashboard.js`

Pre-existing uncommitted feature work in the repository was preserved.

## Render Lifecycle

### Startup

`server.js` now loads configuration, awaits the initial MongoDB connection, creates the Express app, retains the HTTP server, and marks startup complete only after the listener is accepting connections on `0.0.0.0:$PORT`.

Initial Mongo failure is logged and rethrown by the database layer. Startup does not begin listening and exits non-zero.

### `/health/live`

- Returns HTTP 200 with only `status` and `timestamp`.
- Does not inspect MongoDB and does not disclose infrastructure details.

### `/health/ready`

- Returns HTTP 200 only after startup completed, Mongoose is connected, and shutdown has not started.
- Returns HTTP 503 while starting, disconnected, reconnecting/error, or shutting down.
- Intended Render Health Check Path: `/health/ready`.

### SIGTERM / SIGINT behavior

1. Readiness is marked false immediately.
2. `server.close()` stops new HTTP connections.
3. Existing requests receive up to 10 seconds to drain.
4. Remaining connections are forcibly closed only after that deadline.
5. Mongoose receives up to 3 seconds to disconnect.
6. Normal signals exit 0; fatal errors and shutdown failures exit non-zero.

Signal handlers are registered once.

### Mongo lifecycle

The runtime records `connecting`, `connected`, `disconnected`, `reconnected`, `error`, and intentional disconnect state. Temporary disconnects fail readiness; reconnection restores it. Graceful disconnect does not emit a misleading outage warning.

## Request Limits

Normal bodies:

- JSON: 100 KiB
- URL-encoded: 100 KiB
- URL-encoded parameters: 100

Multipart:

- Maximum field value: 100 KiB
- Maximum fields: 30
- Maximum parts: 50
- Maximum field-name length: 100 bytes
- Maximum nesting depth: 3
- Maximum array index: 100
- Generic Multer file cap: 10, with stricter route-level `.single()` or `.array(..., 10)` enforcement

Express JSON/form parsers do not process multipart bodies.

## Cloudinary Architecture

The implemented flow is:

`Browser → Express backend → Cloudinary`

Browsers send the existing authorized multipart requests to Express. The backend validates bytes, generates folders and UUID public IDs, uploads to Cloudinary, and stores provider metadata.

`CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` exist only in backend configuration. No Cloudinary credential or signed upload behavior was added to either frontend.

Added dependencies:

- `cloudinary@2.11.0`
- `file-type@22.1.1`

Production now requires:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER_PREFIX`

Provider folders are generated as `<prefix>/<resource>`, and public IDs are backend UUIDs. The client cannot choose a folder or a new public ID.

## Media Schema Changes

New Cloudinary writes use:

```js
{
  secureUrl,
  publicId,
  width,
  height,
  format,
  bytes
}
```

The six owners now support this media value:

- Product: `images[]`
- User: `profilePic`
- Category: `image`
- Animal: `image`
- Brand: `image`
- Banner: `imageUrl`

The schema temporarily accepts either a legacy string or a validated Cloudinary object so existing data remains readable before backfill. `Order.items[].image` remains a URL string; order creation now extracts `secureUrl` when snapshotting a Cloudinary-backed product image.

## Upload Limits and Formats

- Product: up to 10 files, 4 MiB each
- User profile: 1 file, 2 MiB
- Category: 1 file, 4 MiB
- Animal: 1 file, 4 MiB
- Brand: 1 file, 4 MiB
- Banner: 1 file, 4 MiB

All runtime routes accept only:

- JPEG
- PNG
- WebP

MIME is checked before buffering and then compared with the detected file signature. SVG and arbitrary `image/*` values are rejected.

## Media Lifecycle

### Create

Files are validated and uploaded only after ordinary controller validation. If Product or another resource fails to persist, every newly uploaded request asset is destroyed.

### Replacement

For Product:

1. Retained images are selected only from media already stored on that Product.
2. New files upload with partial-upload rollback.
3. MongoDB saves the combined state.
4. Newly uploaded assets are destroyed if MongoDB fails.
5. Removed old assets are destroyed only after MongoDB succeeds.

For User, Category, Animal, Brand, and Banner:

1. Upload new media.
2. Save new metadata.
3. Destroy the new asset if save fails.
4. Destroy the old asset only after save succeeds.

### Soft deletion

- Product: media retained.
- Category: media retained.
- Animal: media retained.
- Brand: media retained.

These records use soft-delete semantics, so retaining media avoids broken restore state. No Product permanent-purge route currently exists; a future deliberate purge must derive all public IDs from the stored Product.

### Permanent deletion

- Banner hard deletion destroys its stored media after database deletion.
- Final User hard deletion destroys the stored profile image after database deletion.

### Failure and orphan behavior

- Partial product upload cleans every earlier upload from that request.
- Cloudinary upload failure fails the requested create/update.
- Old-media cleanup failure after a successful DB update is logged; the valid new DB state is not rolled back.
- Cloudinary `not found` destruction is naturally idempotent.
- Client-provided identifiers are used only to select retained media from the current Product. Deletions are always derived from the entity's stored record.

## Legacy Media Compatibility

Both UIs centrally resolve:

- Cloudinary objects through `media.secureUrl`
- Absolute legacy URLs
- Existing `/uploads/...` paths through the configured API origin

Express temporarily serves `backend/uploads` read-only for legacy records. No new upload writes use that directory.

Remove legacy static serving and string schema support only after:

1. the migration manifest reports no missing files,
2. all six model collections contain Cloudinary metadata,
3. storefront/admin smoke tests confirm every migrated image, and
4. a rollback copy of the manifest and original files is retained.

## Migration Script

Commands from `backend`:

```text
MEDIA_MIGRATION_ENABLED=true npm run migrate:media -- --dry-run
MEDIA_MIGRATION_ENABLED=true npm run migrate:media -- --execute
```

Production execution additionally requires:

```text
MEDIA_MIGRATION_ALLOW_PRODUCTION=true
```

Properties:

- Never runs at application startup.
- Requires exactly one of `--dry-run` or `--execute`.
- Supports Product, User, Category, Animal, Brand, and Banner.
- Reads only paths contained by `backend/uploads`.
- Skips and reports missing/non-local/already-migrated values.
- Does not upload already-Cloudinary values, making reruns idempotent.
- Updates Mongo only after upload succeeds.
- Uses an optimistic old-value match to avoid overwriting a concurrent change.
- Destroys request uploads if the DB update fails.
- Never deletes original files.
- Writes a JSON debug/rollback manifest under ignored `backend/migration-output/`.

The script was created but not executed.

## Image Rendering Changes

- Added shared media and Cloudinary delivery helpers in both Next applications.
- Cloudinary URLs derive `f_auto`, `q_auto`, and bounded `c_limit,w_*` transformations without storing transformed URLs in MongoDB.
- Product cards are lazy by default and use responsive `sizes`.
- Product detail keeps priority only for its genuine main/LCP candidate.
- Removed unconditional `unoptimized` across storefront catalog images.
- Admin local `blob:` previews remain unoptimized; remote images can use optimization.
- Next production image hosts are limited to `res.cloudinary.com` and the configured API's `/uploads/**` compatibility path.
- Production no longer permits arbitrary HTTPS hosts or private-IP optimization.

## Logging / Request IDs

Every request receives a backend UUID and an `X-Request-ID` response header.

HTTP 500 logs are JSON and include:

- timestamp
- severity
- event
- request ID
- HTTP method
- safe path/route
- error message
- server-side stack

Clients receive a generic error plus the request ID, never a stack.

The new logger does not include request bodies, cookies, JWTs, OTPs, passwords, MongoDB URIs, SMTP credentials, or Cloudinary credentials.

## Automated Tests Added

Eleven Node tests cover:

- live health 200
- request-ID response header
- readiness before startup/disconnected, connected, and shutting down
- shutdown readiness, HTTP close, and Mongo close
- JPEG/PNG/WebP signature acceptance
- SVG, unsupported content, and fake MIME rejection
- oversized multipart rejection
- excess-file rejection
- upload success plus DB-create failure rollback
- replacement DB failure rollback and old-media retention
- successful replacement ordering and old cleanup attempt
- partial multi-upload rollback
- rejection of unrelated client public IDs

Cloudinary is mocked; tests make no provider or database connection.

## Verification Results

Runtime:

- Node: `v22.23.2`
- npm: `11.16.0`

Clean installs:

- Backend `npm ci`: exit 0; 155 packages; 0 vulnerabilities
- Storefront `npm ci`: exit 0; 354 packages; 0 vulnerabilities
- Admin `npm ci`: exit 0; 350 packages; 0 vulnerabilities (one non-fatal package-owned dotfile `TAR_ENTRY_ERROR` warning)

Backend:

- `npm test`: exit 0; 11 passed, 0 failed
- `node --check` for `server.js`, `src`, `scripts`, and `test`: exit 0
- `npm audit --omit=dev`: 0 vulnerabilities
- Complete synthetic production environment including Cloudinary: accepted
- Production environment without Cloudinary: rejected with `CLOUDINARY_CLOUD_NAME is required`

Storefront:

- `npm run lint`: exit 0
- `NEXT_PUBLIC_API_URL=https://api.example.invalid/api/v1 npm run build`: exit 0; 19 routes generated
- `npm audit --omit=dev`: 0 vulnerabilities

Admin:

- `npm run lint`: exit 0
- `NEXT_PUBLIC_API_URL=https://api.example.invalid/api/v1 npm run build`: exit 0; 30 routes generated
- `npm audit --omit=dev`: 0 vulnerabilities

General:

- IDE diagnostics: no errors
- `git diff --check`: exit 0
- No Multer disk storage or controller `file.filename` writes remain.
- No Cloudinary API secret/key references exist in storefront/admin source.
- Runtime controllers do not accept a client public ID as a deletion target.

npm continues to print the existing local `devdir` deprecation warning. The first storefront Turbopack verification attempts compiled and generated all 19 routes but did not terminate; changing the production script to the webpack builder produced a clean exit 0.

## Remaining Local Filesystem Dependencies

Runtime:

- `/uploads` static serving remains temporarily for legacy reads.
- `imageFiles.js` can delete a replaced legacy file owned by the affected record.
- Immutable Next `public/` assets remain normal build assets.

Manual tooling:

- The migration script reads existing local uploads and writes an operator manifest.
- `seedReferenceData.js` still writes local demo/seed media and stores legacy paths. It is not part of startup and must not be used as a production media workflow.
- Older image-fix scripts still reference legacy paths and should be retired after migration.

No new customer/admin runtime upload is written to local disk.

## Remaining Issues for Later Phases

Intentionally unchanged:

- OTP purpose/hash/attempt redesign and auth rate limits
- refresh-token rotation
- CSRF and final cookie/domain work
- commerce, stock, promo, and refund concurrency
- payment integration
- review redesign
- pagination and general caching
- complete SEO and full Next rendering refactor
- broader account-retention/data-integrity policy
- CI/CD and production deployment
- real Cloudinary/MongoDB migration execution

## Manual Actions Required

Configure in Render without committing values:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER_PREFIX` — use a distinct value per development/staging/production environment

Render settings:

- Build Command: `npm ci --omit=dev`
- Start Command: `npm start`
- Health Check Path: `/health/ready`
- Leave `PORT` to Render.

Before migration:

1. Back up the target MongoDB database and `backend/uploads`.
2. Confirm the URI/database and Cloudinary prefix.
3. Run dry-run only and review the generated manifest.
4. Resolve every missing file.
5. Run execute only with explicit migration flags.
6. Smoke-test all six media owners.
7. Retain originals and manifests until rollback is no longer needed.

No external environment variable, Cloudinary account, MongoDB record, or local media record was changed by this implementation.

## Ready for Phase 3?

**YES — code foundation only.**

- Backend lifecycle is Render-safe and bounded.
- Health/readiness reflects MongoDB and shutdown state.
- New uploads are memory-backed and Cloudinary-only.
- Media create/update/delete ordering and rollback are implemented.
- Legacy reads remain compatible.
- Migration tooling exists but was not run.
- Both frontend lint/build checks pass.
- Backend tests, syntax, and all three production dependency audits pass.

External Cloudinary/Render configuration and the reviewed manual media migration remain required before deployment.

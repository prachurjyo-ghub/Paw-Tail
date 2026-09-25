# Paw Tail Production Audit — Part 1

Audit date: 2026-09-21

Scope: the complete checked-out repository (`clientend`, `adminend`, and `backend`) as it existed at audit time, including uncommitted files. This is a code and safe-build audit, not a deployment configuration audit. No application code was changed.

## Architecture Detected

Paw Tail is a three-application JavaScript repository:

- **Storefront:** Next.js 16 App Router with React 19 in `clientend`; development port 3002 (`clientend/package.json:6-10`).
- **Admin application:** Next.js 16 App Router with React 19 in `adminend`; development port 3001 (`adminend/package.json:6-9`).
- **Backend:** Express 5 REST API in `backend`; development/default port 3000 (`backend/package.json:6-10`, `backend/server.js:14`).
- **Database:** MongoDB (`backend/src/config/db.js:4-8`).
- **ODM:** Mongoose 8, with 13 models under `backend/src/models`.
- **API architecture:** versioned REST routes mounted at `/api/v1`; resource routers cover users, products, categories, animals, brands, carts, wishlists, orders, promo codes, promo deals, banners, reviews, delivery, invoices, and inquiries (`backend/src/routes/index.js:6-7`, `backend/src/routes/v1/index.js:20-34`).
- **Authentication:** bcrypt password hashing and access/refresh JWTs in `httpOnly` cookies (`backend/src/controllers/v1/authController.js:69-96,138-155`).
- **Authorization:** backend `protect` and role middleware, with most admin writes guarded by `protect` plus `admin`/`adminOnly` (`backend/src/middleware/auth.middleware.js:5-81`).
- **Image/file storage:** Multer writes to local `uploads/<resource>` directories and Express exposes `/uploads` as static content (`backend/src/utils/upload.js:5-46`, `backend/server.js:67`).
- **Email:** Nodemailer over configurable SMTP; a console-only fallback is used when mail delivery is disabled (`backend/src/config/mail.js:3-25`).
- **Payment services:** none. The application records a selected payment method but does not integrate a payment provider.
- **Testing:** no unit, integration, or end-to-end tests; no backend lint script and no repository CI configuration were found.

Short summary: the project is a conventional Next.js storefront and admin UI over an Express/Mongoose API. The principal commerce CRUD flows are connected, backend role checks are generally present, and production builds compile. It is not production-safe yet because account recovery, payment choices, cookie security, uploads, catalog visibility, data races, misleading fallback data, and operational testing still contain concrete blockers.

## Already Production Ready

The following implementation details are materially sound and should be preserved:

- Passwords are hashed with bcrypt before persistence (`backend/src/controllers/v1/authController.js:201-203,222-229,539-543,695-699`).
- Access and refresh tokens are placed in `httpOnly` cookies; production cookies are `secure` (`backend/src/controllers/v1/authController.js:83-96,145-155`).
- Admin login verifies the user role on the backend, rather than relying on hidden frontend controls (`backend/src/controllers/v1/authController.js:296-341`).
- Product, category, brand, animal, banner, delivery, invoice, promo administration, and order administration mutation routes generally use backend `protect` plus `adminOnly` (`backend/src/routes/v1/*.js`).
- Single-order access prevents IDOR by requiring the owner or an admin (`backend/src/controllers/v1/orderController.js:639-652`).
- Cart, wishlist, address, and profile actions derive the user from `req.user`; they do not accept a target user ID from the client.
- Order creation rejects unknown and protected price/total fields, validates product and variant IDs, validates enums and quantities, and recomputes prices from database products (`backend/src/middleware/order.validation.middleware.js:22-63,170-229,314-368`; `backend/src/controllers/v1/orderController.js:457-590`).
- Order creation and cancellation stock restoration use MongoDB sessions/transactions (`backend/src/controllers/v1/orderController.js:452-614,661-715`).
- Product list pagination is implemented and capped at 100 rows (`backend/src/controllers/v1/productController.js:241-268`).
- Product ratings for a list are calculated in one aggregation, not one query per product (`backend/src/utils/reviewRatings.js:5-36,45-59`).
- Orders, categories, brands, and animals include soft-delete protections; order hard deletion is explicitly blocked (`backend/src/models/Order.js:268-300`).
- Category deletion checks for referenced products (`backend/src/controllers/v1/categoryController.js:166-176`).
- Product update removes images no longer referenced, and profile replacement removes the old profile image (`backend/src/controllers/v1/productController.js:675-681`; `backend/src/controllers/v1/authController.js:721-729`).
- Global API error handling masks stack traces and internal 500 messages from clients (`backend/src/middleware/error.middleware.js:7-45`).
- No tracked `.env` or PEM files were found. Root ignore rules cover `.env` variants (`.gitignore:12-18`).
- Storefront and admin production builds both completed successfully during this audit.
- Admin ESLint completed successfully.

## BLOCKERS

### B-01 — Predictable bootstrap administrator credentials

- **Severity:** Critical
- **File:** `backend/seedAdmin.js`
- **Line:** 12-24
- **Problem:** The script contains a fixed administrator identity and fixed plaintext password. The values are intentionally not reproduced in this report.
- **Why it matters:** If the script has ever been run against a production or shared database, anyone with repository access can try the known credentials at the public admin login endpoint. The script also uses ES-module syntax in a CommonJS package, so its execution behavior is inconsistent.
- **Recommended fix:** Remove the fixed values, rotate any administrator created with them, inspect production for that account, and replace the script with an environment-driven one-time bootstrap that forces an immediate password change.

### B-02 — Live verification and reset codes are written to logs

- **Severity:** Critical
- **File:** `backend/src/config/mail.js`
- **Line:** 3-11
- **Problem:** When `MAIL_DELIVERY_ENABLED` is not exactly `"true"`, the fallback logs the full mail body. That body contains verification, password-reset, account-update, and account-deletion OTPs.
- **Why it matters:** Anyone with application log access can take over accounts or authorize sensitive changes. In addition, the API still tells the user that email was sent even though no email was delivered.
- **Recommended fix:** Never log code content. In production, fail startup or fail the operation if mail is unavailable. In development, log only non-sensitive metadata.

### B-03 — Six-digit OTP and login endpoints have no abuse controls

- **Severity:** Critical
- **File:** `backend/src/routes/v1/userRoutes.js`
- **Line:** 34-44
- **Problem:** Signup, login, admin login, verification, forgot-password, OTP verification, reset, and OTP generation have no IP/account rate limits, attempt counter, cooldown, or lockout. Codes are six digits (`backend/src/controllers/v1/authController.js:12-14`) and are stored in plaintext.
- **Why it matters:** Verification and reset codes can be brute-forced online; login and admin-login are exposed to credential stuffing. Public inquiry and review creation can also be used for storage abuse.
- **Recommended fix:** Apply route-specific per-IP and per-account limits, cap attempts per code, invalidate a code after the cap, add resend cooldowns, and store hashed purpose-bound OTPs.

### B-04 — Payment options imply payment processing that does not exist

- **Severity:** Critical
- **File:** `clientend/src/app/checkout/page.js`
- **Line:** 47-52, 206-230, 416-436
- **Problem:** Customers can choose bKash, Nagad, or Card. The backend creates the order with `paymentStatus: "Pending"` and never starts, verifies, or captures a payment (`backend/src/controllers/v1/orderController.js:567-590`). No payment SDK/webhook implementation exists.
- **Why it matters:** Customers can reasonably believe they paid when only an unpaid order was created. Admins can later set payment state to `Paid` manually.
- **Recommended fix:** Until a gateway is implemented and verified server-side, expose only Cash on Delivery. Treat gateway implementation, signed callbacks/webhooks, idempotency, and reconciliation as a separate production task.

### B-05 — Cookie-authenticated mutations lack CSRF protection and production CORS is too permissive

- **Severity:** Critical
- **File:** `backend/server.js`
- **Line:** 15-61
- **Problem:** Production cookies use `SameSite=None` (`backend/src/controllers/v1/authController.js:83-96`), but state-changing routes have no CSRF token/header check. CORS permits localhost and broad private-IP origins in every environment; requests without `Origin` are accepted.
- **Why it matters:** A compromised allowed frontend/subdomain or an attacker-controlled private-network origin can issue credentialed mutations as a victim. The private-origin exception should not be active in production.
- **Recommended fix:** In production, use only exact environment-configured HTTPS origins; disable local/private-origin exceptions. Add CSRF protection or a required same-origin custom header and assess whether `SameSite=Lax` is possible for the final domain topology.

### B-06 — Concurrent checkouts can oversell stock and exceed promo limits

- **Severity:** Critical
- **File:** `backend/src/controllers/v1/orderController.js`
- **Line:** 262-291, 359-420, 423-444, 457-600
- **Problem:** Transactions are present, but stock and promo counters are read, mutated in memory, then saved. No conditional atomic decrement guarantees `stock >= requested`, and promo usage checks/increments are not atomic.
- **Why it matters:** Two transactions can both observe available inventory or remaining promo usage and both proceed, causing overselling or exceeding global/per-user limits.
- **Recommended fix:** Use conditional atomic updates (`$inc` with stock/usage predicates) inside the transaction and fail when the guarded update matches zero records. Add concurrency integration tests.

### B-07 — Public catalog APIs expose inactive records

- **Severity:** High
- **File:** `backend/src/controllers/v1/productController.js`
- **Line:** 182-214, 334-342
- **Problem:** Public product lists do not default to `isActive: true`, and any caller can pass `includeInactive=true` to product detail. Similar unauthenticated `includeInactive` handling exists in category, animal, brand, and banner controllers.
- **Why it matters:** Hidden inventory, pricing, draft-like records, and inactive navigation content remain publicly discoverable.
- **Recommended fix:** Public routes must always enforce active/not-deleted filters. Put inactive/deleted access behind distinct admin-protected endpoints.

### B-08 — Client quality gate currently fails

- **Severity:** High
- **File:** `clientend` (multiple files)
- **Line:** See Testing Gaps
- **Problem:** `npm --prefix clientend run lint` fails with 17 errors and 12 warnings.
- **Why it matters:** The completed project does not pass its own configured static quality gate. Several errors concern cascading renders and incomplete Hook dependencies in checkout/auth/cart/wishlist flows.
- **Recommended fix:** Resolve the reported errors and make lint/build/tests mandatory in CI before release.

## MUST FIX

### M-01 — Fake rating data is returned as real product data

- **Severity:** High
- **File:** `backend/src/utils/reviewRatings.js`
- **Line:** 3, 39-42, 53-58
- **Problem:** Products with no reviews are reported as 5 stars with one review. The product card also falls back to five stars and one review (`clientend/src/components/category/ProductCard.js:145-150`).
- **Why it matters:** This is fabricated customer feedback, not a visual placeholder. It misleads customers and corrupts sorting/display semantics.
- **Recommended fix:** Return `averageRating: 0`, `reviewCount: 0`, and render an honest “No reviews yet” state.

### M-02 — Pending reviews are public and included in ratings

- **Severity:** High
- **File:** `backend/src/controllers/v1/reviewController.js`
- **Line:** 37-63, 118-125
- **Problem:** New reviews are marked `pending`, but non-admin listing excludes only hidden reviews. The rating aggregation also excludes only hidden reviews (`backend/src/utils/reviewRatings.js:12-26`).
- **Why it matters:** Unmoderated spam immediately appears and changes public ratings. The UI incorrectly tells the author, “Your review is live” (`clientend/src/components/ProductDetails.js:335`).
- **Recommended fix:** Define an approval state, filter public listings and aggregates to approved reviews, and align the success message with actual publication state.

### M-03 — Reviews permit unlimited duplicates

- **Severity:** High
- **File:** `backend/src/models/Review.js`
- **Line:** 3-54
- **Problem:** There is no unique `(product, user)` constraint and no verified-purchase requirement. `postReview` always inserts another record (`backend/src/controllers/v1/reviewController.js:81-138`).
- **Why it matters:** One account can inflate or deflate ratings repeatedly; duplicate submissions also grow the collection.
- **Recommended fix:** Decide the business rule, then enforce it in the database (normally unique user/product) and controller. If only purchasers may review, verify a delivered order containing the product.

### M-04 — Refresh-token handling is replay-prone

- **Severity:** High
- **File:** `backend/src/controllers/v1/authController.js`
- **Line:** 138-155, 1012-1055
- **Problem:** Refresh tokens are stored plaintext in `User.refreshToken` and are not rotated when used. A new login overwrites the previous token, allowing only one stored session without making that behavior explicit.
- **Why it matters:** A database leak exposes active refresh tokens; a stolen token remains replayable until expiration/logout. Session behavior across devices is unpredictable.
- **Recommended fix:** Store hashed, per-session refresh-token records, rotate on every refresh, detect reuse, and explicitly support or reject multiple sessions.

### M-05 — OTPs are not bound to their requested purpose

- **Severity:** High
- **File:** `backend/src/models/User.js`
- **Line:** 50-61
- **Problem:** Verification, reset, phone update, password change, and deletion share one `otp` and expiry. `requestUpdateOtp` validates a `type` but does not persist it (`backend/src/controllers/v1/authController.js:554-583`).
- **Why it matters:** A code requested for one account operation can be submitted to another operation while valid, and simultaneous flows overwrite one another.
- **Recommended fix:** Store hashed code, purpose, issued time, expiry, attempts, and consumed time per flow; require exact purpose match.

### M-06 — Password and identity validation is insufficient

- **Severity:** High
- **File:** `backend/src/controllers/v1/authController.js`
- **Line:** 175-184, 253-261, 404-413, 498-507, 649-658
- **Problem:** The server has no minimum password length/policy and does not consistently validate field types, lengths, email shape, or phone shape before operations such as `.toLowerCase()`.
- **Why it matters:** Weak passwords are accepted; malformed JSON values can produce 500 errors; unbounded identity fields create data-quality and abuse risks.
- **Recommended fix:** Add one shared schema validator for every auth request with strict types, normalized email, sensible lengths, phone format, password minimum, and unknown-field rejection.

### M-07 — Password reset leaks account existence

- **Severity:** Medium
- **File:** `backend/src/controllers/v1/authController.js`
- **Line:** 404-442
- **Problem:** Forgot-password returns distinct status/messages for missing and unverified accounts.
- **Why it matters:** Attackers can enumerate registered and verified users.
- **Recommended fix:** Always return the same 200 response and timing profile; send mail only when an eligible account exists.

### M-08 — Upload validation trusts client MIME and permits risky formats

- **Severity:** High
- **File:** `backend/src/utils/upload.js`
- **Line:** 11-46
- **Problem:** The filter accepts any `mimetype` beginning with `image/`, retains the original extension, performs no signature/decode verification, and allows SVG. Files are served inline from the API origin.
- **Why it matters:** MIME is attacker-controlled. SVG or polyglot content can become stored script/content abuse, and non-images can be persisted with image labels.
- **Recommended fix:** Allowlist JPEG/PNG/WebP, verify magic bytes and decode/re-encode server-side, generate server-owned names/extensions, reject SVG, and set safe serving headers.

### M-09 — Failed product updates can leave orphan uploads

- **Severity:** Medium
- **File:** `backend/src/controllers/v1/productController.js`
- **Line:** 520-708
- **Problem:** Multer stores new files before controller validation. Several update validation returns (for duplicate name, invalid refs, price, stock, or variants) do not call `cleanupUploadedFiles(req)`.
- **Why it matters:** Invalid requests accumulate files not referenced by any product.
- **Recommended fix:** Centralize cleanup in all failure paths or stage uploads until validation/database success. Add tests for every rejected multipart update.

### M-10 — Account deletion leaves related records and media

- **Severity:** High
- **File:** `backend/src/controllers/v1/authController.js`
- **Line:** 939-980
- **Problem:** Account deletion removes only the User document. Cart data, reviews, inquiries, promo usage references, historical order user references, and profile media are not deliberately handled.
- **Why it matters:** This creates orphan records, broken population, retained personal data, and orphan files. Hard deletion may also undermine order/accounting history.
- **Recommended fix:** Define retention requirements. In one transaction, delete transient data, anonymize retained order/review data as appropriate, remove media, and record an auditable deletion state.

### M-11 — Public search accepts unescaped regular expressions

- **Severity:** High
- **File:** `backend/src/controllers/v1/productController.js`
- **Line:** 182-188
- **Problem:** Public `search` becomes a raw case-insensitive MongoDB regex. Admin inquiry, invoice, and review searches do the same.
- **Why it matters:** Crafted regular expressions can cause expensive scans/regex work. Ordinary substring searches also cannot use existing indexes effectively.
- **Recommended fix:** Escape regex metacharacters, cap query length, and add a search strategy/index only after measuring actual catalog needs.

### M-12 — Important list endpoints are unbounded

- **Severity:** High
- **File:** Multiple backend controllers
- **Line:** `orderController.js:617-631`; `authController.js:1070-1093,1120`; `reviewController.js:61-63`; `inquiryController.js:66-68`; `invoiceController.js:49-69`
- **Problem:** Orders, user orders, accounts, account orders, reviews, inquiries, invoices, promo codes, brands, categories, and animals can return full collections.
- **Why it matters:** Payloads and memory/database work grow without bound. Several admin pages fetch everything and filter in the browser.
- **Recommended fix:** Add consistent server pagination, capped limits, stable sorts, total counts, and server-side filters. Require a product filter or strict pagination for public reviews.

### M-13 — Admin Settings reports a password change without changing anything

- **Severity:** High
- **File:** `adminend/src/app/dashboard/settings/page.js`
- **Line:** 24-36
- **Problem:** “Update password” validates local fields, clears them, and shows “Password updated.” No backend request is made.
- **Why it matters:** Administrators receive false security confirmation while their password remains unchanged.
- **Recommended fix:** Connect it to the existing protected OTP/password-change flow, handle all failures, and do not show success until the backend confirms.

### M-14 — Admin profile edits are local-only

- **Severity:** Medium
- **File:** `adminend/src/app/dashboard/profile/page.js`
- **Line:** 27, 49-76
- **Problem:** Profile data is loaded/saved through local admin session storage rather than the authenticated user API.
- **Why it matters:** The UI can diverge from the real admin account and falsely claim persistence.
- **Recommended fix:** Use `/users/me` and the protected profile API; remove local profile-as-source-of-truth.

### M-15 — Storefront search controls do not search

- **Severity:** High
- **File:** `clientend/src/components/MiddleBar.js`
- **Line:** 100-113, 157-169
- **Problem:** Both search forms have no submit handler, input name/state, or navigation. Submitting only performs the browser’s default current-page GET.
- **Why it matters:** A prominent customer feature is nonfunctional even though the product API supports a search query.
- **Recommended fix:** Route a validated query to a real results/catalog page and pass it to the product API.

### M-16 — Public promo endpoint enables code enumeration and leaks internals

- **Severity:** High
- **File:** `backend/src/routes/v1/promoCodeRoutes.js`
- **Line:** 24-25
- **Problem:** `check-promo-code` is unauthenticated and reveals promo validity/details. The protected validation response returns the full promo document, including usage/scope internals (`backend/src/controllers/v1/promoCodeController.js:507-512`).
- **Why it matters:** Codes can be enumerated and internal user scopes/usage records can be disclosed.
- **Recommended fix:** Protect and rate-limit checking, return generic failures, and use explicit response DTOs containing only the calculated result and public code name.

### M-17 — Destructive scripts are insufficiently guarded

- **Severity:** High
- **File:** `backend/seedReferenceData.js`
- **Line:** 90-102
- **Problem:** This script bypasses Mongoose middleware and deletes all brands and products. `backend/seedProducts.js:82-84` also clears products before inserting demo rows.
- **Why it matters:** Pointing either script at a production URI causes immediate data loss.
- **Recommended fix:** Require an explicit non-production environment, database-name allowlist, typed confirmation flag, and backup check. Remove obsolete scripts from routine package commands.

### M-18 — A stale review migration targets fields that do not exist

- **Severity:** Medium
- **File:** `backend/scripts/approveLegacyReviews.js`
- **Line:** 19-31
- **Problem:** The script updates approval fields that are absent from `backend/src/models/Review.js`.
- **Why it matters:** It is likely a no-op or creates out-of-schema database fields and gives a false impression that legacy reviews were moderated.
- **Recommended fix:** Delete it or rewrite it against the final review approval schema, with dry-run output and tests.

## SHOULD FIX

### S-01 — Backend error handling does not record internal failures

- **Severity:** Medium
- **File:** `backend/src/middleware/error.middleware.js`
- **Line:** 7-45
- **Problem:** 500 responses are correctly sanitized, but the handler does not log an error ID, stack, request context, or structured event.
- **Why it matters:** Production failures will be difficult to investigate.
- **Recommended fix:** Add structured server-side logging with redaction and a correlation ID; continue returning generic client messages.

### S-02 — Frontend API failures often look like empty valid data

- **Severity:** Medium
- **File:** `clientend/src/lib/categoryApi.js`, `clientend/src/lib/productApi.js`, `clientend/src/lib/brandApi.js`
- **Line:** `categoryApi.js:53-55,72-74`; `productApi.js:132-134`; `brandApi.js:32-34`
- **Problem:** Failures return empty arrays. Home sections similarly hide themselves on fetch failure.
- **Why it matters:** Outages are presented as “no products/brands/categories,” preventing users and operators from distinguishing real empty states from failures.
- **Recommended fix:** Propagate typed errors and render explicit retry/error states while keeping harmless image/avatar fallbacks.

### S-03 — Cart/wishlist synchronization errors are discarded

- **Severity:** Medium
- **File:** `clientend/src/components/CartProvider.js`, `clientend/src/components/WishlistProvider.js`
- **Line:** `CartProvider.js:272-273`; `WishlistProvider.js:197-198`
- **Problem:** Guest-to-account synchronization failure is swallowed, and the fallback fetch failure is also discarded.
- **Why it matters:** Guest selections can remain unsynchronized or appear lost with no warning.
- **Recommended fix:** Preserve guest data until every item succeeds, report partial failures, and provide retry.

### S-04 — Product card actions fail only in the console

- **Severity:** Medium
- **File:** `clientend/src/components/category/ProductCard.js`
- **Line:** 47-74
- **Problem:** Wishlist/cart errors are only logged; no customer-visible error is shown.
- **Why it matters:** Buttons appear to do nothing on API failure.
- **Recommended fix:** Display an accessible toast/inline error and retain button state accurately.

### S-05 — Product “New” badge is hardcoded

- **Severity:** Low
- **File:** `clientend/src/components/category/ProductCard.js`
- **Line:** 79-81
- **Problem:** Every non-discounted product is marked new.
- **Why it matters:** The status is fake merchandising data.
- **Recommended fix:** Derive it from a documented creation-age rule or an explicit backend field.

### S-06 — Guest voucher application is a non-discounting local state

- **Severity:** Medium
- **File:** `clientend/src/lib/guestStorage.js`
- **Line:** 133-141
- **Problem:** A guest can “apply” a code, but the calculated voucher discount remains zero and no server validation occurs.
- **Why it matters:** The control implies an applied promotion while producing no discount.
- **Recommended fix:** Disable the apply action with a clear sign-in requirement, or provide a safe anonymous quote endpoint with rate limiting.

### S-07 — Backend capabilities are not connected to admin UI

- **Severity:** Medium
- **File:** Backend routes with no admin consumer
- **Line:** `backend/src/routes/v1/promoCodeRoutes.js:14-22`; `productRoutes.js:23-25`; `orderRoutes.js:30-36`
- **Problem:** Promo-code CRUD, deleted-product listing, and refunds exist on the backend but have no working admin interface.
- **Why it matters:** Production operations require direct API/database access, increasing error and authorization risk.
- **Recommended fix:** Either connect and test the required operations or remove/defer unsupported endpoints so the shipped scope is explicit.

### S-08 — Public review endpoint can return every visible review

- **Severity:** Medium
- **File:** `backend/src/controllers/v1/reviewController.js`
- **Line:** 24-74
- **Problem:** Omitting a product filter returns the complete public review collection without pagination.
- **Why it matters:** This exposes cross-product customer content and becomes increasingly expensive.
- **Recommended fix:** Require `product` for product-review APIs or add a separately designed, paginated homepage review endpoint.

### S-09 — Product/relationship deletion rules are inconsistent

- **Severity:** Medium
- **File:** `backend/src/controllers/v1/brandController.js`, `animalController.js`
- **Line:** `brandController.js:169-184`; `animalController.js:258-263`
- **Problem:** Category deletion checks products, but brand deletion does not. Animal deletion checks category names, not `Product.animal`. Carts, wishlists, and promo scopes retain stale IDs.
- **Why it matters:** Active products can reference soft-deleted classification records and embedded references accumulate.
- **Recommended fix:** Define one relationship policy and enforce it consistently: block deletion while actively referenced or perform deliberate cleanup/reassignment.

### S-10 — Product soft-delete slug semantics differ from other catalog models

- **Severity:** Medium
- **File:** `backend/src/models/Product.js`
- **Line:** 53-59, 160-181
- **Problem:** Product slug uniqueness is global, so soft-deleted products retain names/slugs. Category/brand/animal use partial unique indexes for non-deleted records.
- **Why it matters:** Recreating a deleted product with the same name can produce surprising suffixes or uniqueness behavior.
- **Recommended fix:** Decide whether deleted product slugs are reusable. If yes, use an equivalent partial unique index and make slug generation match it.

### S-11 — Promo usage history is an unbounded embedded array

- **Severity:** Medium
- **File:** `backend/src/models/PromoCode.js`
- **Line:** 37-54, 100-110
- **Problem:** Every user’s usage record is embedded in one promo document.
- **Why it matters:** Popular codes can approach MongoDB document limits and create hot-document contention.
- **Recommended fix:** Move usage to a separate collection with a unique promo/user index and atomic counters, or strictly bound the business scale.

### S-12 — Inquiries and reviews lack practical text limits

- **Severity:** Medium
- **File:** `backend/src/models/Inquiry.js`, `backend/src/models/Review.js`
- **Line:** `Inquiry.js:20-39`; `Review.js:10-36`
- **Problem:** Names, phones, emails, messages, comments, replies, and admin replies have no explicit maximum lengths.
- **Why it matters:** Oversized submissions waste storage, inflate responses, and complicate moderation.
- **Recommended fix:** Add project-appropriate limits in request validation and schema constraints.

### S-13 — Admin/global search fetches excessive data client-side

- **Severity:** Medium
- **File:** `adminend/src/components/AdminGlobalSearch.js`
- **Line:** 14-17, 51-59
- **Problem:** Search builds a local index from orders, accounts, and up to 1,000 products; failures silently become empty results.
- **Why it matters:** Startup/network cost grows with production data and search quality degrades.
- **Recommended fix:** Add a protected, capped server-side search endpoint over allowed summary fields.

### S-14 — Security middleware is minimal

- **Severity:** Medium
- **File:** `backend/server.js`
- **Line:** 50-68
- **Problem:** No security-header middleware is configured, and body limits are left implicit.
- **Why it matters:** Baseline hardening and explicit resource controls are missing.
- **Recommended fix:** Add and configure security headers for the actual frontend/upload domains and explicit JSON/form size limits. Do not apply defaults without checking image and cross-origin behavior.

### S-15 — There is no documented environment contract

- **Severity:** Medium
- **File:** Repository root/backend
- **Line:** N/A
- **Problem:** `.env` files are correctly ignored, but no `.env.example`/`.env.sample` exists.
- **Why it matters:** Required JWT, MongoDB, SMTP, CORS, and URL settings can be omitted or misconfigured; mail currently fails open into console logging.
- **Recommended fix:** Add a value-free environment template and startup validation. Never place real values in it.

### S-16 — No account disable/suspension state

- **Severity:** Medium
- **File:** `backend/src/models/User.js`, `backend/src/middleware/auth.middleware.js`
- **Line:** `User.js:3-62`; `auth.middleware.js:5-27`
- **Problem:** Authentication checks only that the JWT is valid and the user exists. There is no disabled/suspended field or token version.
- **Why it matters:** Operators cannot promptly block an account while preserving its records; already-issued access tokens remain valid after refresh-token invalidation until expiry.
- **Recommended fix:** Add an explicit account status and token/session version only if account suspension is a required production operation, then enforce it in `protect`.

### S-17 — Response shapes are inconsistent

- **Severity:** Low
- **File:** Multiple backend controllers
- **Line:** For example `orderController.js:10-15` versus `productController.js:259-268`
- **Problem:** Some responses nest payloads under `data`; others expose resource keys at the top level. Consumers contain fallback parsing for both.
- **Why it matters:** Client code becomes harder to validate and errors are easier to hide.
- **Recommended fix:** Adopt one response envelope for new and touched endpoints; migrate existing clients deliberately rather than rewriting all endpoints at once.

## NICE TO HAVE

### N-01 — Remove orphan/duplicate admin routes

- **Severity:** Low
- **File:** `adminend/src/app/dashboard/sales-reports/page.js`, `adminend/src/app/dashboard/comments/page.js`
- **Line:** Entire route files
- **Problem:** `sales-reports` duplicates the navigated `sales-report` route; `comments` only redirects.
- **Why it matters:** Duplicate routes increase maintenance and confuse audit/navigation coverage.
- **Recommended fix:** Keep one canonical route and explicit redirects only where backward compatibility is required.

### N-02 — Fix inert admin notification controls

- **Severity:** Low
- **File:** `adminend/src/components/DashboardShell.js`
- **Line:** 397-400, 433-441
- **Problem:** Notification bell controls have no action and no backend source.
- **Why it matters:** They visually promise a feature that is absent.
- **Recommended fix:** Remove/disable with an honest label until notifications are implemented.

### N-03 — Replace placeholder footer links

- **Severity:** Low
- **File:** `adminend/src/components/DashboardShell.js`
- **Line:** 612-616
- **Problem:** Terms and Policy links point to `#`.
- **Why it matters:** They are nonfunctional navigation.
- **Recommended fix:** Link to real policy routes or remove them.

### N-04 — Review single-field boolean indexes after real query metrics

- **Severity:** Low
- **File:** `backend/src/models/Product.js`
- **Line:** 73-143
- **Problem:** Product defines many low-selectivity single-field indexes.
- **Why it matters:** They add write/storage cost and may not match actual compound filter/sort patterns.
- **Recommended fix:** Use `explain()` and production-like data before dropping indexes; replace only with indexes supported by measured queries.

## Fake / Fallback / Mock Findings

### Dangerous runtime/data fallbacks

| Finding | File and line | Classification |
|---|---|---|
| No-review products are represented as 5 stars/1 review | `backend/src/utils/reviewRatings.js:3,39-42` | Dangerous fake business data |
| Product card falls back to five stars and one review | `clientend/src/components/category/ProductCard.js:145-150` | Dangerous fake business data |
| Every non-sale product is marked “New” | `clientend/src/components/category/ProductCard.js:79-81` | Misleading hardcoded status |
| Mail-disabled mode logs OTP and reports delivery success | `backend/src/config/mail.js:3-11`; `authController.js:213-219,439-442` | Dangerous authentication fallback |
| bKash/Nagad/Card selections only create pending orders | `clientend/src/app/checkout/page.js:47-52`; `orderController.js:584-586` | Dangerous unfinished runtime path |
| Admin password settings reports success locally | `adminend/src/app/dashboard/settings/page.js:24-36` | Fake success |
| Admin profile stores edits only in browser storage | `adminend/src/app/dashboard/profile/page.js:49-76` | Fake persistence |
| Guest voucher “apply” preserves a code but discount is zero | `clientend/src/lib/guestStorage.js:133-141` | Misleading local-only fallback |
| PromoDeal defaults/demo marketing cards can be auto-created | `backend/src/models/PromoDeal.js:137-197`; `promoDealController.js:3-7` | Runtime seed/default; verify content before launch |
| Catalog API helpers convert failures into empty lists | `clientend/src/lib/categoryApi.js:53-55,72-74`; `productApi.js:132-134`; `brandApi.js:32-34` | Dangerous outage-as-empty fallback |

### Harmless or acceptable UI/development fallbacks

| Finding | File and line | Classification |
|---|---|---|
| Initials/default visual when no profile image | `clientend/src/components/MiddleBar.js:178-188` | Harmless visual fallback |
| “No Image” product placeholder | `clientend/src/components/category/ProductCard.js:98-101` | Harmless visual fallback |
| Contact map fallback message | `clientend/src/app/contact/page.js:694-697` | Harmless availability fallback |
| Localhost API URL defaults | `clientend/src/lib/api.js:1-2`; `adminend/src/lib/adminApi.js:1-2` | Development fallback; production env must be mandatory |
| Safe empty JSON after non-JSON response parsing | `clientend/src/lib/api.js:29`; `adminend/src/lib/adminApi.js:43` | Defensive parse fallback, though diagnostics are generic |

No substantive `TODO`, `FIXME`, or `HACK` markers were found. The notable unfinished-code comment is the hardcoded “New” badge at `clientend/src/components/category/ProductCard.js:81`.

## Feature Completeness Matrix

| Feature | Frontend | Backend | Database | Working End-to-End | Problem |
|---|---|---|---|---|---|
| User signup/email verification | Login modal calls user APIs | Routes/controllers exist | User OTP fields | Partial | No rate limit; mail-disabled path logs OTP and does not deliver |
| User/admin login | Storefront modal and admin login | Password/role checks | User | Yes, with security gaps | No brute-force protection; refresh replay concerns |
| Password reset | Forgot-password UI connected | Reset endpoints exist | User OTP fields | Partial | Enumeration, no rate limit, plaintext shared-purpose OTP |
| User profile/phone/password | Storefront profile connected | Protected APIs exist | User | Mostly | Validation gaps; access tokens not immediately revoked by token version |
| User addresses | Profile UI connected | Protected subdocument handlers | User Mixed array | Yes | Mixed schema and weak length/type constraints |
| Admin profile | Admin UI | Profile APIs exist | User | No | Admin page uses browser storage, not API |
| Admin settings password | Form/button present | Change-password API exists | User | No | Local success toast only |
| Product catalog/detail | Storefront pages call APIs | Product reads exist | Product | Yes, with leak | Inactive products are publicly accessible |
| Storefront search | Search boxes present | Product `search` exists | Product | No | Forms have no search handler/results flow |
| Product admin CRUD | Admin editor/list connected | Admin-protected CRUD | Product | Yes | Multipart failure can orphan files; soft-delete slug semantics |
| Category/brand/animal admin | Admin CRUD connected | Admin-protected CRUD | Category/Brand/Animal | Mostly | Relationship deletion rules differ |
| Banners | Homepage and admin editor | Public read/admin writes | Banner | Yes | Link URL validation and upload validation need hardening |
| Logged-in cart | Cart provider/pages | User-scoped cart APIs | Cart | Yes | Client sync/error reporting gaps |
| Guest cart | LocalStorage UI | N/A | Browser only | Yes for guest use | Login merge failures are swallowed |
| Wishlist | Guest and logged-in UI | User-scoped APIs | User.wishList | Yes | Login merge errors swallowed; stale IDs retained |
| Delivery pricing | Cart/checkout and admin | Read/admin update | DeliveryZone | Yes | Admin load can silently fall back |
| Checkout/order creation | Checkout form | Transactional create | Order/Product/PromoCode | Mostly | Stock/promo race; fake non-COD payment choices |
| Order history/detail | Storefront profile/admin pages | Owner/admin protected APIs | Order | Yes | Lists unbounded |
| Order status update | Admin UI connected | Admin-protected update | Order | Yes | No audit trail; payment can be manually marked paid |
| Refund | No admin UI found | Admin-protected endpoint | Order refunds | No | Backend-only capability |
| Promo deal cards | Homepage and admin editor | Public read/admin update | PromoDeal | Yes | Default demo content can auto-seed |
| Promo vouchers | Cart validation | Full CRUD/validation | PromoCode | Partial | No admin CRUD UI; public code oracle; atomicity issues |
| Reviews | Product detail and admin moderation | Create/reply/hide/delete | Review | Partial | Pending reviews public; duplicate/fake ratings |
| Inquiries | Contact/profile/admin connected | Public create/user/admin reads | Inquiry | Yes | No rate limit/length limits; lists unbounded |
| Invoices | Admin list/detail | Admin-only derived endpoints | Order | Yes | Unbounded query |
| Sales reports | Admin dashboard | Uses order/product APIs | Order/Product | Partial | Client-side full-data aggregation; not production-scalable |
| Deleted products | No admin UI found | Admin endpoint exists | Product | No | Backend-only capability |
| Notifications | Bell controls only | None | None | No | Buttons do nothing |

## Database Findings

### Indexes supported by actual query patterns

1. **Orders by user and date:** `getMyOrders` and account details filter by `user` and sort by newest (`backend/src/controllers/v1/orderController.js:627-631`; `authController.js:1120`). Replace or supplement separate indexes with `{ user: 1, createdAt: -1 }`.
2. **Paid invoices by date:** invoice listing filters payment status and sorts by creation date (`backend/src/controllers/v1/invoiceController.js:49-69`). Test a compound `{ paymentStatus: 1, createdAt: -1 }` with `explain()` before adding.
3. **Product public listing:** filters repeatedly combine active/not-deleted/category/brand/animal and date or price sort (`backend/src/controllers/v1/productController.js:164-252`). Existing independent boolean indexes are unlikely to cover these patterns. Use representative queries and data to select a small number of compound indexes; do not add every combination.
4. **Inquiry ownership:** `getMyInquiries` uses an `$or` over user and email then sorts newest (`backend/src/controllers/v1/inquiryController.js:81-89`). Existing `user` index covers only one branch; consider user/date and email/date if this query is retained.

### Constraints and relationship behavior

- Good: unique user email (`backend/src/models/User.js:10-16`), unique cart per user (`Cart.js:26-34`), unique promo normalized name (`PromoCode.js:64-69`), unique order number (`Order.js:261-266`), and partial unique slugs for category/brand/animal.
- Product has global unique slug while being soft-deleted (`Product.js:53-59`), unlike other catalog entities.
- Mongoose references are not database foreign keys. Account deletion, brand/animal deletion, and product soft deletion have no complete cascade/cleanup policy.
- Category points to an animal by mutable `animalName` string (`Category.js:29-35`), not an ObjectId; animal renames/deletes can break logical linkage.
- User addresses use `Schema.Types.Mixed` (`User.js:45-48`), so database-level shape validation is absent.
- Promo scope IDs are not verified to reference active records.

### Query and pagination findings

- Product list pagination is good and capped.
- Admin order, account, invoice, inquiry, promo, review, and reference-data lists are unbounded.
- Product-rating aggregation is batched and avoids N+1.
- Order creation preloads products and uses an in-memory map; it avoids product queries inside the item loop.
- Several maintenance scripts use document loops; acceptable only as guarded one-off migrations.
- Regex searches are unindexed and in several cases unescaped.
- Responses frequently load full Mongoose documents where summary projections would be enough, especially admin list/search/report flows.

### Transactions and race conditions

- Order creation/cancellation use transactions, which is a strong foundation.
- Stock, promo usage, and refunds still use read-modify-save patterns. Transactions alone do not supply the required guarded business condition under concurrency.
- Refund calculation/save is not transactional (`backend/src/controllers/v1/orderController.js:719-760`), allowing concurrent over-refund risk.
- Unique order number plus retry/fallback is reasonable (`orderController.js:294-310`; `Order.js:262`).

### Migrations, seeds, and reset risk

- No formal migration framework or migration history exists.
- `seedReferenceData.js:99-102` bypasses middleware and wipes Brand and Product collections.
- `seedProducts.js:82-84` clears all products before inserting demo data.
- `seedAdmin.js:12-24` contains predictable fixed administrator credentials.
- `scripts/syncIndexes.js:12-21` synchronizes only Animal and Category, and `db.js:6-7` explicitly initializes only Brand; index deployment is not consistently managed.
- `scripts/approveLegacyReviews.js:19-31` targets fields absent from the current Review schema.
- `fixDbImages.js:10-20` and other older fix scripts reference hardcoded/stale shapes and must not be treated as safe migrations.

## Authentication Findings

- **Implemented correctly:** bcrypt password hashing; verified-email check at login; signed access/refresh JWTs; `httpOnly`/secure production cookies; logout clears stored refresh token and cookies; password reset/change clears the stored refresh token.
- **Critical:** OTPs are logged when mail is disabled and no auth/OTP endpoint has rate limiting.
- **High:** refresh tokens are plaintext and not rotated; only one token is stored per user.
- **High:** all OTP purposes share one plaintext code/expiry.
- **High:** password rules and request schemas are incomplete.
- **Medium:** password reset enumerates accounts.
- **Medium:** access-token middleware checks only user existence, not a disable status, verification state, or token version (`backend/src/middleware/auth.middleware.js:5-27`).
- **Medium:** changing/resetting a password invalidates refresh but not an already-issued access token until its expiry.
- **Configuration:** access and refresh default to the same one-hour lifetime (`backend/src/controllers/v1/authController.js:60-80`), reducing the value of a refresh token and needing an explicit production policy.

## Authorization Findings

Backend authorization, not frontend visibility, was used for this assessment.

### Correctly protected

- Product/category/brand/animal/banner/delivery/promo administration writes: admin-protected.
- Account lists/details and invoices: admin-protected.
- Orders: list/update/refund/delete are admin-protected; single read checks owner/admin.
- Cart/wishlist/addresses/profile: scoped from authenticated `req.user`.
- Inquiry admin updates and admin lists: admin-protected.
- Review reply/hide/delete: admin-protected.

### Problems

- Public catalog reads expose inactive records through defaults/query flags.
- Public promo checking acts as a code oracle; protected validation returns excessive internal document data.
- `getMyInquiries` also matches the authenticated email (`inquiryController.js:83-88`). This intentionally claims guest inquiries after signup, but should be documented and tested because email identity becomes the ownership bridge.
- No account disable/suspension enforcement exists.
- Pending reviews are publicly readable even though their state implies moderation.
- No direct customer IDOR was found for orders, carts, wishlists, addresses, or invoices in the audited code.

## API / Validation Findings

- Order validation is the strongest area: unknown fields and client-controlled prices/totals are rejected, quantities and IDs are validated, and prices are recalculated.
- Auth APIs lack strict field types, length limits, email validation, phone validation, unknown-field rejection, and password policy.
- Inquiry fields and review text/replies lack maximum lengths.
- Review creation does not prevent duplicate submissions.
- Public product search accepts unescaped regex and no search-length cap.
- Product list price query values are coerced without a dedicated finite/non-negative validation response.
- Product/category/brand/animal multipart handlers validate manually and inconsistently; a shared request schema would reduce missed cleanup/edge paths.
- Promo validation leaks its full database document.
- Inconsistent response envelopes (`data` nested versus flat resource keys) force defensive client parsing.
- Most unbounded list APIs lack validated `page`/`limit`.
- Unexpected fields are well controlled for order APIs but not consistently rejected elsewhere.

## Upload Findings

- **Existing controls:** per-route count limits are present (for example, 10 product images at `backend/src/routes/v1/productRoutes.js:28-40`); size limits are configured (4 MB products, 2 MB user profile); old product/profile files are removed on successful replacement.
- **Type risk:** validation trusts `file.mimetype.startsWith("image/")`; no extension allowlist, magic-byte validation, decoding, dimension check, or SVG rejection.
- **Filename risk:** sanitized client basenames and original extensions are retained. Server-generated opaque filenames/extensions would be safer.
- **Orphans:** product update validation failures can leave newly stored files. Account deletion leaves profile media. Soft-deleted products intentionally retain media, but no later purge lifecycle exists.
- **Parent deletion:** category/brand/animal/banner controllers should be checked consistently for successful deletion/replacement cleanup; utilities exist but behavior is controller-specific.
- **Storage:** current local disk writes are functional in local development but not durable on an ephemeral deployment platform. Cloudinary redesign is intentionally outside this audit; current implementation is nevertheless not production-persistent.

## Security Findings

- No tracked environment secret files were found; no secret values are printed here.
- Hardcoded bootstrap admin credentials are present in source and must be rotated/removed.
- Credentialed CORS accepts broad local/private origins in production.
- Cookie-authenticated mutations have no CSRF protection.
- No route rate limiting, account lockout, OTP attempt cap, or public-form abuse protection exists.
- Public product regex can be used for expensive searches.
- Uploads can accept spoofed/SVG content and are served from the API origin.
- No `dangerouslySetInnerHTML` use was found in application JavaScript; React text rendering provides useful default XSS escaping.
- Admin-controlled banner/promo links accept arbitrary strings and are rendered as links (`clientend/src/components/PromoDealsSection.js:160-162`). Restrict to allowed internal paths or approved HTTPS hosts to avoid `javascript:`/phishing destinations after admin compromise.
- No SQL injection applies because the project uses MongoDB. No direct object-to-query mass assignment was found in the inspected high-risk flows, but strict request schemas remain necessary.
- Global error handling does not expose stacks/internal 500 details.
- Morgan logs requests; ensure URLs and production logs do not contain secrets and access is restricted.
- Explicit security headers are not configured.

## Error Handling Findings

- Central backend errors are consistently shaped and 500 details are hidden.
- The central handler does not log internal failures or provide correlation IDs.
- Numerous storefront fetch helpers convert any failure to an empty list/null, hiding outages.
- Product-card cart/wishlist failures are console-only.
- Guest cart/wishlist synchronization failures are discarded.
- Admin dashboard/global-search failures become empty metrics/results or console-only messages.
- Admin settings emits success without an operation.
- Mail-disabled mode emits success after a console-only “send.”
- Review success text claims publication even though the record is pending.
- JSON parse errors are swallowed into `{}` and then become generic request errors; this is safe for clients but loses useful diagnostics.
- No raw stack traces were found in API responses.

## Testing Gaps

### Existing command results

- `npm --prefix adminend run lint`: **passed**.
- `npm --prefix clientend run lint`: **failed** with **17 errors and 12 warnings**. Errors include:
  - `clientend/src/app/cart/page.js:99`
  - `clientend/src/app/checkout/page.js:102,130`
  - `clientend/src/app/contact/page.js:103`
  - `clientend/src/app/profile/page.js:117,122,1130`
  - `clientend/src/components/CartProvider.js:263`
  - `clientend/src/components/ChangePasswordPopover.js:32`
  - `clientend/src/components/CustomerReviews.js:70`
  - `clientend/src/components/DeleteAccountPopover.js:27`
  - `clientend/src/components/LoginPopover.js:91`
  - `clientend/src/components/ProductDetails.js:181,220`
  - `clientend/src/components/WishlistProvider.js:188`
  - `clientend/src/context/AuthContext.js:51`
- `npm --prefix clientend run build`: **passed**; 19 routes generated.
- `npm --prefix adminend run build`: **passed**; 30 routes generated.
- Backend `node --check` across all `.js` files: **passed**.
- Backend `npm test`: **not available** because no test script exists.
- No dedicated typecheck scripts exist. Next production builds completed their built-in TypeScript phase, but the application source is JavaScript.

### Missing meaningful coverage

1. Signup, verification, login, admin-login role enforcement, logout, refresh rotation/reuse, password reset, OTP expiry/attempt/purpose, and cookie attributes.
2. Brute-force/rate-limit behavior.
3. Backend authorization matrix for every admin route and owner-scoped route.
4. IDOR tests for order/cart/wishlist/address/inquiry/invoice IDs.
5. Order mass-assignment and protected price/status fields.
6. Concurrent checkout stock guards and promo global/per-user limits.
7. Refund concurrency and maximum refundable amount.
8. Product/category/brand/animal/banner/promo/review/inquiry CRUD success and validation failures.
9. Upload count, size, extension, signature, SVG/polyglot, cleanup, replacement, and parent deletion behavior.
10. Review duplicate/moderation/rating calculations.
11. Inactive/deleted public catalog visibility.
12. Pagination caps and abusive regex/search inputs.
13. Guest cart/wishlist merge behavior and partial API failures.
14. Payment-method behavior; currently tests should assert only actually supported methods are exposed.
15. Production smoke tests for storefront/admin against an isolated database and storage.
16. CI that runs lint, builds, backend checks, and automated tests on every change.

## First 10 Tasks To Fix

1. **Remove and rotate predictable administrator credentials.** Audit every environment for the seeded account before doing other release work.
2. **Stop logging OTPs and fail closed on production mail misconfiguration.** Add a value-free environment template and startup validation.
3. **Add auth/OTP/public-form rate limits and purpose-bound hashed OTPs.** Include attempt caps, cooldowns, generic reset responses, and password validation.
4. **Lock down cookie security:** exact production CORS origins, no production private-origin exception, CSRF protection, and an explicit SameSite/domain design.
5. **Remove unsupported payment choices from checkout** until a real provider flow, webhook verification, idempotency, and reconciliation exist.
6. **Make checkout business updates atomic:** guarded stock decrements, promo limit increments, and refund updates, with concurrency tests.
7. **Fix public data integrity and visibility:** active-only catalog, approved-only reviews/ratings, zero-review truth, duplicate-review rule, and safe promo responses.
8. **Harden uploads and cleanup:** signature/decode validation, safe formats, orphan cleanup on every failure/deletion, then connect durable storage in the later deployment phase.
9. **Add pagination and query-specific indexes** for orders/accounts/invoices/inquiries/reviews and measured product listing patterns; guard destructive scripts/migrations.
10. **Make the UI truthful and establish release gates:** connect admin password/profile and storefront search, expose errors instead of empty fallbacks, fix all client lint errors, then add auth/authz/order/upload integration tests and CI.

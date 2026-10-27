const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/pawtail_test";
process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";

const express = require("express");
const createCsrfProtection = require("../src/middleware/csrf.middleware");
const { createRateLimit } = require("../src/middleware/rateLimit.middleware");
const { validateCreateOrder } = require("../src/middleware/order.validation.middleware");
const { coalesce } = require("../src/services/productCache");

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.post(
    "/limited",
    createRateLimit({ name: "test", max: 2, windowSeconds: 60 }),
    (_req, res) => res.json({ ok: true })
  );
  server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test("rate limiting returns 429 with retry metadata", async () => {
  assert.equal((await fetch(`${baseUrl}/limited`, { method: "POST" })).status, 200);
  assert.equal((await fetch(`${baseUrl}/limited`, { method: "POST" })).status, 200);
  const response = await fetch(`${baseUrl}/limited`, { method: "POST" });
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("retry-after")) > 0);
  assert.equal(response.headers.get("ratelimit-remaining"), "0");
});

test("production CSRF protection requires an allowed origin and marker header", () => {
  const middleware = createCsrfProtection({
    isProduction: true,
    clientUrl: "https://store.example",
    adminUrl: "https://admin.example",
    additionalClientUrls: [],
  });
  const invoke = (headers) => {
    let status;
    let nextCalled = false;
    const req = { method: "POST", get: (name) => headers[name.toLowerCase()] };
    const res = { status(code) { status = code; return this; }, json() { return this; } };
    middleware(req, res, () => { nextCalled = true; });
    return { status, nextCalled };
  };
  assert.equal(invoke({ origin: "https://evil.example", "x-pawtail-request": "1" }).status, 403);
  assert.equal(invoke({ origin: "https://store.example" }).status, 403);
  assert.equal(invoke({ origin: "https://store.example", "x-pawtail-request": "1" }).nextCalled, true);
});

test("checkout requires an idempotency key and rejects unimplemented payment methods", () => {
  const validBody = {
    items: [{ productId: "507f1f77bcf86cd799439011", quantity: 1 }],
    paymentMethod: "COD",
    shippingAddress: { name: "A", phone: "1234567", city: "Dhaka", area: "A", address: "Road" },
    deliveryZone: "inside-dhaka",
  };
  const run = (body, key) => {
    let status;
    let nextCalled = false;
    const req = { body, get: () => key };
    const res = { status(code) { status = code; return this; }, json() { return this; } };
    validateCreateOrder(req, res, () => { nextCalled = true; });
    return { req, status, nextCalled };
  };
  assert.equal(run(validBody).status, 400);
  assert.equal(run({ ...validBody, paymentMethod: "CARD" }, "checkout-key-123456").status, 400);
  assert.equal(run(validBody, "checkout-key-123456").nextCalled, true);
});

test("product cache miss coalescing executes one loader", async () => {
  let calls = 0;
  const loader = async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 5)); return { ok: true }; };
  const [first, second] = await Promise.all([coalesce("same", loader), coalesce("same", loader)]);
  assert.equal(calls, 1);
  assert.deepEqual(first, second);
});

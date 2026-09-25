const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");

const express = require("express");

const requestId = require("../src/middleware/requestId.middleware");
const createHealthRouter = require("../src/routes/healthRoutes");
const { createRuntimeState } = require("../src/runtime/state");
const { createShutdownManager } = require("../src/runtime/shutdown");

let server;
let baseUrl;
let mongoReadyState = 0;
const state = createRuntimeState({
  getMongoReadyState: () => mongoReadyState,
});

before(async () => {
  const app = express();
  app.use(requestId);
  app.use("/health", createHealthRouter(state));

  server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(
  () =>
    new Promise((resolve) => {
      server.close(resolve);
    })
);

test("live health returns 200 and a request ID", async () => {
  const response = await fetch(`${baseUrl}/health/live`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "alive");
  assert.match(response.headers.get("x-request-id"), /^[0-9a-f-]{36}$/);
});

test("ready health reflects startup, Mongo, and shutdown state", async () => {
  let response = await fetch(`${baseUrl}/health/ready`);
  assert.equal(response.status, 503);

  mongoReadyState = 1;
  state.setMongoState("connected");
  state.markStartupComplete();
  response = await fetch(`${baseUrl}/health/ready`);
  assert.equal(response.status, 200);

  state.beginShutdown();
  response = await fetch(`${baseUrl}/health/ready`);
  assert.equal(response.status, 503);
});

test("shutdown marks not-ready, closes HTTP, and closes Mongo", async () => {
  const calls = [];
  const fakeState = {
    beginShutdown() {
      calls.push("not-ready");
    },
  };
  const fakeServer = {
    close(callback) {
      calls.push("http-close");
      callback();
    },
    closeIdleConnections() {
      calls.push("idle-close");
    },
  };
  let exitCode;

  const manager = createShutdownManager({
    server: fakeServer,
    state: fakeState,
    disconnectDatabase: async () => {
      calls.push("mongo-close");
    },
    exit: (code) => {
      exitCode = code;
    },
  });

  await manager.shutdown({ reason: "test", exitCode: 0 });

  assert.deepEqual(calls, [
    "not-ready",
    "http-close",
    "idle-close",
    "mongo-close",
  ]);
  assert.equal(exitCode, 0);
});

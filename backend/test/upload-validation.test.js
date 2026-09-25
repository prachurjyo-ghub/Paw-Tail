const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");

const express = require("express");

const {
  createImageUpload,
  validateImageFile,
} = require("../src/utils/upload");

const samples = {
  "image/jpeg": Buffer.concat([
    Buffer.from("ffd8ffe000104a46494600010100000100010000", "hex"),
    Buffer.alloc(128),
  ]),
  "image/png": Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  ),
  "image/webp": Buffer.concat([
    Buffer.from("52494646100000005745425056503820", "hex"),
    Buffer.alloc(128),
  ]),
};

test("accepts valid JPEG, PNG, and WebP signatures", async () => {
  for (const [mimetype, buffer] of Object.entries(samples)) {
    const detected = await validateImageFile({ mimetype, buffer });
    assert.equal(detected.mime, mimetype);
  }
});

test("rejects SVG, unsupported content, and fake MIME declarations", async () => {
  await assert.rejects(
    validateImageFile({
      mimetype: "image/png",
      buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
    }),
    (error) => error.code === "UNSUPPORTED_IMAGE_FORMAT"
  );

  await assert.rejects(
    validateImageFile({
      mimetype: "image/jpeg",
      buffer: samples["image/png"],
    }),
    (error) => error.code === "INVALID_IMAGE_CONTENT"
  );

  await assert.rejects(
    validateImageFile({
      mimetype: "image/png",
      buffer: Buffer.from("not an image"),
    }),
    (error) => error.code === "UNSUPPORTED_IMAGE_FORMAT"
  );
});

let server;
let baseUrl;

before(async () => {
  const app = express();
  const upload = createImageUpload({ maxSizeKB: 1 });
  app.post("/upload", upload.array("images", 2), (req, res) => {
    res.status(204).end();
  });
  app.use((error, req, res, next) => {
    res.status(400).json({ code: error.code, message: error.message });
  });

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

test("Multer rejects SVG declarations, oversized files, and too many files", async () => {
  const svgForm = new FormData();
  svgForm.append(
    "images",
    new Blob(["<svg></svg>"], { type: "image/svg+xml" }),
    "asset.svg"
  );
  let response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    body: svgForm,
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_IMAGE_TYPE");

  const oversizedForm = new FormData();
  oversizedForm.append(
    "images",
    new Blob([Buffer.alloc(2048)], { type: "image/png" }),
    "large.png"
  );
  response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    body: oversizedForm,
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "LIMIT_FILE_SIZE");

  const manyForm = new FormData();
  for (let index = 0; index < 3; index += 1) {
    manyForm.append(
      "images",
      new Blob([samples["image/png"]], { type: "image/png" }),
      `${index}.png`
    );
  }
  response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    body: manyForm,
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "LIMIT_UNEXPECTED_FILE");
});

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the protected Google sign-in page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Secure company access/i);
  assert.match(html, /approved Google account/i);
  assert.match(html, /No password sheet/i);
  assert.doesNotMatch(html, /dashboard-data\.json/i);
});
test("keeps report data out of the public website build", async () => {
  await assert.rejects(access(new URL("public/dashboard-data.json", root)));
  await assert.rejects(access(new URL("dashboard-data.json", root)));

  const [client, gateway, config] = await Promise.all([
    readFile(new URL("app/dashboard-client.tsx", root), "utf8"),
    readFile(new URL("google-apps-script/Code.gs", root), "utf8"),
    readFile(new URL("public/auth-config.json", root), "utf8"),
  ]);

  assert.doesNotMatch(client, /fetch\([^)]*dashboard-data\.json/i);
  assert.match(gateway, /verifyGoogleCredential_/);
  assert.match(gateway, /findApprovedUser_/);
  assert.match(gateway, /GOOGLE_CLIENT_ID/);
  assert.equal(JSON.parse(config).clientId, "");
});

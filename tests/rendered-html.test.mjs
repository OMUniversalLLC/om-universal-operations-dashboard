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

test("server-renders the open dashboard without a login gate", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Executive overview/i);
  assert.match(html, /Public snapshot/i);
  assert.match(html, /Open dashboard mode/i);
  assert.doesNotMatch(html, /Secure company access/i);
});
test("publishes the approved report snapshot without exposing a separate JSON endpoint", async () => {
  await assert.rejects(access(new URL("public/dashboard-data.json", root)));
  await assert.rejects(access(new URL("dashboard-data.json", root)));

  const [app, snapshot, gateway, config] = await Promise.all([
    readFile(new URL("app/dashboard-app.tsx", root), "utf8"),
    readFile(new URL("app/public-dashboard-data.json", root), "utf8"),
    readFile(new URL("google-apps-script/Code.gs", root), "utf8"),
    readFile(new URL("public/auth-config.json", root), "utf8"),
  ]);

  assert.match(app, /public-dashboard-data\.json/i);
  assert.doesNotMatch(app, /<LoginPage/i);
  assert.equal(JSON.parse(snapshot).dailyRecords.length, 66);
  assert.match(gateway, /verifyGoogleCredential_/);
  assert.match(gateway, /findApprovedUser_/);
  assert.match(gateway, /GOOGLE_CLIENT_ID/);
  assert.equal(JSON.parse(config).clientId, "");
});

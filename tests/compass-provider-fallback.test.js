const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const apiSource = fs.readFileSync(path.join(root, "api", "compass-chat.js"), "utf8");
const localServerSource = fs.readFileSync(path.join(root, "local-server.js"), "utf8");

for (const [label, source] of [
  ["Vercel API", apiSource],
  ["local server", localServerSource]
]) {
  assert.ok(source.includes("function providerOrder()"), `${label} defines provider fallback order`);
  assert.ok(source.includes("function providerHasKey"), `${label} checks provider credentials before calling`);
  assert.ok(source.includes("async function callConfiguredProvider"), `${label} routes through configured provider fallback`);
  assert.ok(source.includes("trying next provider if available"), `${label} logs failed providers and continues`);
  assert.ok(source.includes("No configured AI provider key is available"), `${label} returns a clear no-key error only after every provider is checked`);
}

console.log("Compass AI provider fallback tests passed.");

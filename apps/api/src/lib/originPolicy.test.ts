import assert from "node:assert/strict";
import test from "node:test";
import { buildOriginPolicy } from "./originPolicy.js";

test("origin policy allows requests without an Origin header", () => {
  const policy = buildOriginPolicy(undefined, undefined);
  assert.equal(policy.isAllowedOrigin(undefined), true);
  assert.equal(policy.isAllowedOrigin(null), true);
});

test("origin policy fails closed for explicit origins when no allowlist is configured", () => {
  const policy = buildOriginPolicy(undefined, undefined);
  assert.equal(policy.isAllowedOrigin("https://app.example"), false);
});

test("origin policy allows exact origins and wildcard patterns", () => {
  const policy = buildOriginPolicy("https://app.example", "https://*.freestyle.example");
  assert.equal(policy.isAllowedOrigin("https://app.example"), true);
  assert.equal(policy.isAllowedOrigin("https://studio.freestyle.example"), true);
  assert.equal(policy.isAllowedOrigin("https://evil.example"), false);
});

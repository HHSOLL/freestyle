import assert from "node:assert/strict";
import test from "node:test";
import { buildViewerTelemetryEnvelope } from "./viewerTelemetry.js";

test("buildViewerTelemetryEnvelope converts viewer host events into product telemetry", () => {
  const envelope = buildViewerTelemetryEnvelope(
    {
      name: "viewer.host.garment-swap.preview-latency",
      value: 88,
      tags: {
        source: "cache",
      },
    },
    {
      host: "viewer-react",
      phase9Enabled: true,
      killSwitch: false,
      source: "phase9-release-flag",
      avatarId: "female-base",
      garmentIds: ["starter-top-soft-casual"],
      qualityTier: "balanced",
    },
  );

  assert.equal(envelope?.events[0]?.metric_name, "viewer.host.garment-swap.preview-latency");
  assert.equal(envelope?.events[0]?.value, 88);
  assert.equal(envelope?.events[0]?.viewer_host, "viewer-react");
  assert.equal(envelope?.events[0]?.tags.phase9Source, "phase9-release-flag");
});

test("buildViewerTelemetryEnvelope ignores unknown viewer telemetry events", () => {
  const envelope = buildViewerTelemetryEnvelope(
    {
      name: "viewer.experimental.debug-only",
      value: 1,
    },
    {
      host: "viewer-react",
      phase9Enabled: true,
      killSwitch: false,
      source: "phase9-release-flag",
      avatarId: "female-base",
      garmentIds: [],
      qualityTier: "balanced",
    },
  );

  assert.equal(envelope, null);
});

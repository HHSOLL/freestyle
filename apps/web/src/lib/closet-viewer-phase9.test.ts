import assert from "node:assert/strict";
import test from "node:test";
import { resolveClosetViewerPhase9Snapshot } from "./closet-viewer-phase9";

test("phase 9 closet viewer flag defaults to viewer-react", () => {
  assert.deepEqual(resolveClosetViewerPhase9Snapshot({}), {
    host: "viewer-react",
    phase9Enabled: true,
    killSwitch: false,
    source: "default-viewer-react",
  });
});

test("phase 9 closet viewer flag enables viewer-react when release flag is on", () => {
  assert.deepEqual(
    resolveClosetViewerPhase9Snapshot({
      NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED: "true",
    }),
    {
      host: "viewer-react",
      phase9Enabled: true,
      killSwitch: false,
      source: "phase9-release-flag",
    },
  );
});

test("phase 9 closet viewer kill switch wins over the release flag", () => {
  assert.deepEqual(
    resolveClosetViewerPhase9Snapshot({
      NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED: "true",
      NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH: "true",
    }),
    {
      host: "runtime-3d",
      phase9Enabled: false,
      killSwitch: true,
      source: "phase9-kill-switch",
    },
  );
});

test("phase 9 closet viewer snapshot can still inherit the global viewer host override", () => {
  assert.deepEqual(
    resolveClosetViewerPhase9Snapshot({
      NEXT_PUBLIC_VIEWER_HOST: "viewer-react",
    }),
    {
      host: "viewer-react",
      phase9Enabled: false,
      killSwitch: false,
      source: "global-viewer-host",
    },
  );
});

test("phase 9 closet viewer snapshot reads direct NEXT_PUBLIC env defaults", () => {
  const previousRelease = process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED;
  const previousKillSwitch = process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH;
  const previousViewerHost = process.env.NEXT_PUBLIC_VIEWER_HOST;

  process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED = "true";
  delete process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH;
  delete process.env.NEXT_PUBLIC_VIEWER_HOST;

  try {
    assert.deepEqual(resolveClosetViewerPhase9Snapshot(), {
      host: "viewer-react",
      phase9Enabled: true,
      killSwitch: false,
      source: "phase9-release-flag",
    });
  } finally {
    if (previousRelease === undefined) {
      delete process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED = previousRelease;
    }
    if (previousKillSwitch === undefined) {
      delete process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH;
    } else {
      process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH = previousKillSwitch;
    }
    if (previousViewerHost === undefined) {
      delete process.env.NEXT_PUBLIC_VIEWER_HOST;
    } else {
      process.env.NEXT_PUBLIC_VIEWER_HOST = previousViewerHost;
    }
  }
});

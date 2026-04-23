import { resolveViewerHost, type ViewerHostMode } from "@freestyle/viewer-react";

export type ClosetViewerPhase9Source =
  | "phase9-release-flag"
  | "phase9-kill-switch"
  | "global-viewer-host"
  | "default-runtime-3d";

export type ClosetViewerPhase9Snapshot = {
  host: ViewerHostMode;
  phase9Enabled: boolean;
  killSwitch: boolean;
  source: ClosetViewerPhase9Source;
};

const isEnabled = (value?: string) => value === "true";

const readClosetViewerPhase9Env = (): Partial<Record<string, string | undefined>> => ({
  NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH:
    process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH,
  NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED: process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED,
  NEXT_PUBLIC_VIEWER_HOST: process.env.NEXT_PUBLIC_VIEWER_HOST,
});

export const resolveClosetViewerPhase9Snapshot = (
  env: Partial<Record<string, string | undefined>> = readClosetViewerPhase9Env(),
): ClosetViewerPhase9Snapshot => {
  const killSwitch = isEnabled(env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH);
  if (killSwitch) {
    return {
      host: "runtime-3d",
      phase9Enabled: false,
      killSwitch: true,
      source: "phase9-kill-switch",
    };
  }

  const phase9Enabled = isEnabled(env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED);
  if (phase9Enabled) {
    return {
      host: "viewer-react",
      phase9Enabled: true,
      killSwitch: false,
      source: "phase9-release-flag",
    };
  }

  if (env.NEXT_PUBLIC_VIEWER_HOST) {
    return {
      host: resolveViewerHost(env.NEXT_PUBLIC_VIEWER_HOST),
      phase9Enabled: false,
      killSwitch: false,
      source: "global-viewer-host",
    };
  }

  return {
    host: "runtime-3d",
    phase9Enabled: false,
    killSwitch: false,
    source: "default-runtime-3d",
  };
};

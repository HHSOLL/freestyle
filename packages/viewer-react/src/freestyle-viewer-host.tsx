"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  AvatarPoseId,
  AvatarRenderVariantId,
  BodyProfile,
  RuntimeGarmentAsset,
} from "@freestyle/shared-types";
import { createFreestyleViewer, type FreestyleViewer } from "@freestyle/viewer-core";
import { buildViewerSceneInput } from "./bridge.js";
import { hasViewerViewportChanged, measureViewerViewport } from "./viewport.js";

export type ViewerQualityTier = "low" | "balanced" | "high";

export type FreestyleViewerHostProps = {
  bodyProfile: BodyProfile;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  qualityTier: ViewerQualityTier;
  backgroundColor?: string;
};

type HostState = "booting" | "ready" | "error";

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "The experimental viewer host failed while syncing the current avatar state.";
}

function ViewerHostOverlay({ state, errorMessage }: { state: HostState; errorMessage: string | null }) {
  if (state === "ready") {
    return null;
  }

  const title = state === "booting" ? "Preparing viewer-core stage" : "viewer-core stage failed";
  const description =
    state === "booting"
      ? "Creating the imperative viewer host and syncing the current avatar + garments."
      : errorMessage ?? "The experimental viewer host could not finish initializing.";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        background:
          "radial-gradient(circle at top, rgba(110, 136, 196, 0.18), rgba(9, 12, 18, 0.96) 64%)",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      <div style={{ maxWidth: "24rem", display: "grid", gap: "0.75rem" }} aria-live="polite">
        <p
          style={{
            margin: 0,
            fontSize: "11px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Freestyle Viewer
        </p>
        <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.7, color: "rgba(255,255,255,0.72)" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export function FreestyleViewerHost({
  bodyProfile,
  avatarVariantId,
  poseId,
  equippedGarments,
  selectedItemId,
  qualityTier,
  backgroundColor,
}: FreestyleViewerHostProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<FreestyleViewer | null>(null);
  const releaseErrorListenerRef = useRef<(() => void) | null>(null);
  const viewportRef = useRef<ReturnType<typeof measureViewerViewport> | null>(null);
  const [hostState, setHostState] = useState<HostState>("booting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sceneInput = useMemo(
    () =>
      buildViewerSceneInput({
        avatarVariantId,
        backgroundColor,
        bodyProfile,
        equippedGarments,
        poseId,
        qualityTier,
        selectedItemId,
      }),
    [avatarVariantId, backgroundColor, bodyProfile, equippedGarments, poseId, qualityTier, selectedItemId],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let disposed = false;

    void createFreestyleViewer(canvas, {
      renderBackend: "webgl2",
      telemetry: {
        emit: () => undefined,
      },
    })
      .then((viewer) => {
        if (disposed) {
          viewer.dispose();
          return;
        }

        viewerRef.current = viewer;
        releaseErrorListenerRef.current = viewer.on("error", (event) => {
          setErrorMessage(event.message);
          setHostState("error");
        });

        setHostState("ready");
      })
      .catch((error) => {
        if (disposed) {
          return;
        }
        setErrorMessage(resolveErrorMessage(error));
        setHostState("error");
      });

    return () => {
      disposed = true;
      releaseErrorListenerRef.current?.();
      releaseErrorListenerRef.current = null;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hostState !== "ready" || !viewerRef.current || !hostRef.current) {
      return;
    }

    const element = hostRef.current;

    const syncViewport = () => {
      const nextViewport = measureViewerViewport(element);
      if (!hasViewerViewportChanged(viewportRef.current, nextViewport)) {
        return;
      }

      viewportRef.current = nextViewport;
      viewerRef.current?.setViewport(nextViewport);
    };

    syncViewport();

    if (typeof ResizeObserver !== "function") {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncViewport();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hostState]);

  useEffect(() => {
    if (hostState !== "ready" || !viewerRef.current) {
      return;
    }

    let cancelled = false;

    void viewerRef.current.setScene(sceneInput).catch((error) => {
      if (cancelled) {
        return;
      }
      setErrorMessage(resolveErrorMessage(error));
      setHostState("error");
    });

    return () => {
      cancelled = true;
    };
  }, [hostState, sceneInput]);

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "360px",
        overflow: "hidden",
        borderRadius: "28px",
        background:
          backgroundColor ??
          "radial-gradient(circle at top, rgba(76, 96, 132, 0.24), rgba(7, 10, 16, 0.98) 66%)",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Freestyle experimental viewer stage"
        data-selected-item-id={selectedItemId ?? ""}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
      <ViewerHostOverlay state={hostState} errorMessage={errorMessage} />
    </div>
  );
}

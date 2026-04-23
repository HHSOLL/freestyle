import { expect, test } from "@playwright/test";

const phase9ClosetKillSwitchEnabled =
  process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH === "true";

const viewerReactClosetHostEnabled =
  !phase9ClosetKillSwitchEnabled &&
  (process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_VIEWER_HOST === "viewer-react");

test.describe("closet preview runtime evidence", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("runtime-3d host exposes typed reduced-preview runtime evidence", async ({
    page,
  }) => {
    test.slow();
    test.skip(
      viewerReactClosetHostEnabled,
      "This smoke only applies when the runtime-3d compatibility host is active.",
    );

    await page.addInitScript(() => {
      (window as Window & { __previewRuntimeEvents?: unknown[] }).__previewRuntimeEvents = [];
      (window as Window & { __previewEngineEvents?: unknown[] }).__previewEngineEvents = [];
      window.addEventListener("freestyle:viewer-event", (event) => {
        const detail = (event as CustomEvent).detail;
        if (detail?.type === "fit:preview-runtime-updated") {
          (window as Window & { __previewRuntimeEvents?: unknown[] }).__previewRuntimeEvents?.push(
            detail.payload,
          );
        }
        if (detail?.type === "fit:preview-engine-status") {
          (window as Window & { __previewEngineEvents?: unknown[] }).__previewEngineEvents?.push(
            detail.payload,
          );
        }
      });
    });

    await page.goto("/app/closet", { waitUntil: "domcontentloaded" });

    const routeRoot = page.locator("[data-closet-visual-root]").first();
    await expect(routeRoot).toBeVisible({
      timeout: 15000,
    });
    await expect(routeRoot).toHaveAttribute("data-closet-viewer-host", "runtime-3d");

    if (process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH === "true") {
      await expect(routeRoot).toHaveAttribute("data-closet-viewer-phase9-enabled", "false");
      await expect(routeRoot).toHaveAttribute("data-closet-viewer-flag-source", "phase9-kill-switch");
    }

    await page.waitForFunction(
      () => Boolean(document.querySelector("[data-preview-runtime-root]")),
      undefined,
      { timeout: 15000 },
    );
    const root = page.locator("[data-preview-runtime-root]").first();
    await expect(root).toHaveAttribute(
      "data-preview-runtime-execution-mode",
      /(reduced-preview|static-fit)/,
    );
    await expect(root).toHaveAttribute(
      "data-preview-runtime-backend",
      /(worker-reduced|cpu-reduced|static-fit|experimental-webgpu)/,
    );
    await expect(root).toHaveAttribute(
      "data-preview-engine-kind",
      /(static-fit-compat|reduced-preview-compat|wasm-preview)/,
    );
    await expect(root).toHaveAttribute(
      "data-preview-engine-status",
      /(ready|fallback)/,
    );

    const payload = await page.waitForFunction(() => {
      const events = (window as Window & { __previewRuntimeEvents?: unknown[] })
        .__previewRuntimeEvents;
      return Array.isArray(events) && events.length > 0 ? events.at(-1) : null;
    });
    const enginePayload = await page.waitForFunction(() => {
      const events = (window as Window & { __previewEngineEvents?: unknown[] })
        .__previewEngineEvents;
      return Array.isArray(events) && events.length > 0 ? events.at(-1) : null;
    });
    const lastEvent = await payload.jsonValue();
    const lastEngineEvent = await enginePayload.jsonValue();

    expect(lastEvent).toMatchObject({
      schemaVersion: "preview-runtime-snapshot.v1",
    });
    expect(lastEngineEvent).toMatchObject({
      schemaVersion: "preview-engine-status.v1",
    });
    expect(typeof (lastEvent as { settled?: unknown }).settled).toBe("boolean");
    expect(typeof (lastEngineEvent as { status?: unknown }).status).toBe("string");
  });
});

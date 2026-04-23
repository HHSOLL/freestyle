import { expect, test } from "@playwright/test";

const phase9ClosetKillSwitchEnabled =
  process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_KILL_SWITCH === "true";

const viewerReactClosetHostEnabled =
  !phase9ClosetKillSwitchEnabled &&
  (process.env.NEXT_PUBLIC_CLOSET_VIEWER_PHASE9_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_VIEWER_HOST === "viewer-react");

test.describe("closet viewer-react host", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("closet mounts the viewer-react stage and records blocking latency evidence when the cutover flag is on", async ({
    page,
  }) => {
    test.skip(
      !viewerReactClosetHostEnabled,
      "This smoke only applies when the Closet route is cut over onto viewer-react.",
    );

    await page.addInitScript(() => {
      (window as Window & { __phase9ViewerEventTypes?: string[] }).__phase9ViewerEventTypes = [];
      window.addEventListener("freestyle:viewer-event", (event) => {
        const detail = (event as CustomEvent).detail;
        const nextType = typeof detail?.type === "string" ? detail.type : null;
        if (!nextType) {
          return;
        }
        (
          window as Window & { __phase9ViewerEventTypes?: string[] }
        ).__phase9ViewerEventTypes?.push(nextType);
      });
    });

    await page.goto("/app/closet", { waitUntil: "domcontentloaded" });

    const root = page.locator("[data-closet-visual-root]").first();
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute("data-closet-viewer-host", "viewer-react");
    await expect(page.getByText("viewer-core stage failed")).toHaveCount(0);

    const host = page.locator("[data-viewer-host-root]").first();
    const canvas = page.locator('canvas[aria-label="Freestyle experimental viewer stage"]').first();
    await expect(page.getByText("Preparing 3D fitting stage")).toHaveCount(0, { timeout: 15_000 });
    await expect(host).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(host).toHaveAttribute("data-first-avatar-paint-ms", /\d+/);
    await expect(host).toHaveAttribute("data-last-preview-source", "static-fit");
    await expect(host).toHaveAttribute("data-preview-runtime-execution-mode", "static-fit");
    await expect(host).toHaveAttribute("data-preview-runtime-backend", "static-fit");
    await expect(host).toHaveAttribute("data-preview-engine-kind", "static-fit-compat");
    await expect(host).toHaveAttribute("data-preview-engine-fallback-reason", "no-continuous-motion");
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const eventTypes = (
              window as Window & { __phase9ViewerEventTypes?: string[] }
            ).__phase9ViewerEventTypes;
            return {
              hasPreviewEngineStatus: Array.isArray(eventTypes)
                ? eventTypes.includes("fit:preview-engine-status")
                : false,
              hasPreviewRuntimeUpdated: Array.isArray(eventTypes)
                ? eventTypes.includes("fit:preview-runtime-updated")
                : false,
            };
          }),
        { timeout: 15_000 },
      )
      .toEqual({
        hasPreviewEngineStatus: true,
        hasPreviewRuntimeUpdated: true,
      });

    const swapCandidate = page
      .locator('[data-closet-asset-tile][data-closet-asset-selected="false"]')
      .first();
    await expect(swapCandidate).toBeVisible();
    await swapCandidate.click();

    await expect(host).toHaveAttribute("data-last-garment-swap-ms", /\d+/);
    const latencyMs = await host.evaluate((element) =>
      Number((element as HTMLElement).dataset.lastGarmentSwapMs ?? "0"),
    );
    expect(latencyMs).toBeGreaterThan(0);
    expect(latencyMs).toBeLessThanOrEqual(300);
  });
});

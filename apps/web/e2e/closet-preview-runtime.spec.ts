import { expect, test } from "@playwright/test";

test.describe("closet preview runtime evidence", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("runtime-3d host exposes typed reduced-preview runtime evidence", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_VIEWER_HOST === "viewer-react",
      "This smoke only applies when the runtime-3d compatibility host is active.",
    );

    await page.addInitScript(() => {
      (window as Window & { __previewRuntimeEvents?: unknown[] }).__previewRuntimeEvents = [];
      window.addEventListener("freestyle:viewer-event", (event) => {
        const detail = (event as CustomEvent).detail;
        if (detail?.type === "fit:preview-runtime-updated") {
          (window as Window & { __previewRuntimeEvents?: unknown[] }).__previewRuntimeEvents?.push(
            detail.payload,
          );
        }
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/app/closet", { waitUntil: "domcontentloaded" });

    await expect(page.locator("[data-closet-visual-root]").first()).toBeVisible({
      timeout: 15000,
    });
    const root = page.locator("[data-preview-runtime-root]").first();
    await expect(root).toBeVisible({ timeout: 15000 });
    await expect(root).toHaveAttribute(
      "data-preview-runtime-execution-mode",
      /(reduced-preview|static-fit)/,
    );
    await expect(root).toHaveAttribute(
      "data-preview-runtime-backend",
      /(worker-reduced|cpu-reduced|static-fit|experimental-webgpu)/,
    );

    const payload = await page.waitForFunction(() => {
      const events = (window as Window & { __previewRuntimeEvents?: unknown[] })
        .__previewRuntimeEvents;
      return Array.isArray(events) && events.length > 0 ? events.at(-1) : null;
    });
    const lastEvent = await payload.jsonValue();

    expect(lastEvent).toMatchObject({
      schemaVersion: "preview-runtime-snapshot.v1",
    });
    expect(typeof (lastEvent as { settled?: unknown }).settled).toBe("boolean");
  });
});

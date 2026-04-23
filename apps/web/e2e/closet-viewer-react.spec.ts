import { expect, test } from "@playwright/test";

test.describe("closet viewer-react host", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("closet mounts the viewer-react stage when the host is forced on", async ({ page }) => {
    test.skip(
      process.env.NEXT_PUBLIC_VIEWER_HOST !== "viewer-react",
      "This smoke only applies when the product route is forced onto viewer-react.",
    );

    await page.goto("/app/closet");

    await expect(page.locator("[data-closet-visual-root]").first()).toBeVisible();
    await expect(page.getByText("viewer-core stage failed")).toHaveCount(0);

    const host = page.locator("[data-viewer-host-root]").first();
    const canvas = page.locator('canvas[aria-label="Freestyle experimental viewer stage"]').first();
    await expect(host).toHaveAttribute("data-first-avatar-paint-ms", /\d+/);
    await expect(host).toHaveAttribute("data-last-preview-source", "static-fit");
    await expect(canvas).toBeVisible();
  });
});

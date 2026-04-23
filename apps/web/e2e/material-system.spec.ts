import { expect, test } from "@playwright/test";

test.describe("material-system harness", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("material and lighting harness mounts with visible controls and canvas", async ({ page }) => {
    await page.goto("/app/lab/material-system", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Phase 4 material and lighting harness" })).toBeVisible();

    const root = page.locator("[data-material-system-root]").first();
    const stage = page.locator("[data-material-stage]").first();
    const canvas = stage.locator("canvas").first();

    await expect(root).toHaveAttribute("data-selected-quality", "balanced");
    await expect(root.getByRole("button", { name: "low", exact: true })).toBeVisible();
    await expect(root.getByRole("button", { name: "balanced", exact: true })).toBeVisible();
    await expect(root.getByRole("button", { name: "high", exact: true })).toBeVisible();
    await expect(root.getByRole("button", { name: "dressed", exact: true })).toBeVisible();
    await expect(canvas).toBeVisible();
  });
});

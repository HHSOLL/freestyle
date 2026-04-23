import { expect, test } from "@playwright/test";

test.describe("viewer-platform harness", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("viewer-core harness mounts and responds to control changes", async ({ page }) => {
    await page.goto("/app/lab/viewer-platform");

    await expect(page.getByRole("heading", { name: "viewer-core browser harness" })).toBeVisible();

    const root = page.locator("[data-viewer-platform-root]").first();
    const canvas = page.locator('canvas[aria-label="Freestyle experimental viewer stage"]').first();

    await expect(root).toHaveAttribute("data-selected-avatar", "female-base");
    await expect(root).toHaveAttribute("data-body-profile-gender", "female");
    await expect(root).toHaveAttribute("data-viewer-host-mode", "viewer-react");
    await expect(root).toHaveAttribute("data-selected-pose", "neutral");
    await expect(root).toHaveAttribute("data-selected-quality", "balanced");
    await expect(canvas).toBeVisible();

    await page.getByRole("button", { name: "male-base", exact: true }).click();
    await page.getByRole("button", { name: "stride", exact: true }).click();
    await page.getByRole("button", { name: "high", exact: true }).click();
    await page.getByRole("button", { name: /Soft Day/i }).click();

    await expect(root).toHaveAttribute("data-selected-avatar", "male-base");
    await expect(root).toHaveAttribute("data-body-profile-gender", "male");
    await expect(root).toHaveAttribute("data-selected-pose", "stride");
    await expect(root).toHaveAttribute("data-selected-quality", "high");
    await expect(root).toHaveAttribute("data-selected-item-id", "starter-shoe-soft-day");
    await expect(canvas).toHaveAttribute("data-selected-item-id", "starter-shoe-soft-day");
  });

  test("viewer-core harness canvas resizes with the browser viewport", async ({ page }) => {
    await page.goto("/app/lab/viewer-platform");

    const canvas = page.locator('canvas[aria-label="Freestyle experimental viewer stage"]').first();
    const initialBox = await canvas.boundingBox();
    expect(initialBox).not.toBeNull();

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(250);

    const resizedBox = await canvas.boundingBox();
    expect(resizedBox).not.toBeNull();
    expect(resizedBox!.width).toBeLessThan(initialBox!.width);
  });
});

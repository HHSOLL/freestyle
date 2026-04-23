import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("redirects fitting to closet and persists a canvas board from the current closet state", async ({ page }) => {
  await page.goto("/app/fitting", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/app\/closet$/);
  await expect(page.getByRole("link", { name: "Closet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Canvas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Community" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
  await expect(page.getByText("Outfit", { exact: true })).toBeVisible();

  await page.goto("/app/canvas", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/app\/canvas$/);
  await expect(page.getByRole("button", { name: "Import closet" })).toBeVisible();
  await expect(page.getByText("No board has been saved yet.", { exact: true })).toBeVisible();

  // The button is server-rendered before the client hook is hydrated. Keep the
  // route assertion independent from late resource load, but wait for the app to
  // settle before clicking so the persistence handler is attached.
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

  await page.getByRole("button", { name: "Import closet" }).click();

  await expect(page.getByText("New canvas board", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Saved boards", { exact: true }).first()).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByText("New canvas board", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
});

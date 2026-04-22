import { expect, test, type Page } from "@playwright/test";

const defaultBodyProfile = {
  version: 2,
  gender: "female",
  bodyFrame: "balanced",
  simple: {
    heightCm: 170,
    shoulderCm: 42,
    chestCm: 92,
    waistCm: 76,
    hipCm: 96,
    inseamCm: 79,
  },
  detailed: {
    armLengthCm: 59,
    headCircumferenceCm: 55,
    torsoLengthCm: 61,
    thighCm: 55,
    calfCm: 36,
  },
} as const;

const buildClosetSceneState = (qualityTier: "low" | "balanced" | "high") => ({
  version: 7,
  avatarVariantId: "female-base",
  poseId: "relaxed",
  activeCategory: "tops",
  selectedItemId: "starter-top-soft-casual",
  qualityTier,
  equippedItemIds: {
    tops: "starter-top-soft-casual",
    bottoms: "starter-bottom-soft-wool",
    shoes: "starter-shoe-soft-day",
  },
});

async function seedVisualState(page: Page, qualityTier: "low" | "balanced" | "high" = "high") {
  await page.addInitScript(
    ({ bodyProfile, closetScene }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("freestyle-language", "en");
      window.localStorage.setItem("freestyle:avatar-profile:v2", JSON.stringify(bodyProfile));
      window.localStorage.setItem("freestyle:closet-scene:v7", JSON.stringify(closetScene));
      document.cookie = "freestyle-language=en; path=/; max-age=31536000; samesite=lax";
    },
    { bodyProfile: defaultBodyProfile, closetScene: buildClosetSceneState(qualityTier) },
  );
}

async function settlePage(page: Page) {
  await page.evaluate(async () => {
    if ("fonts" in document) {
      await (document.fonts as FontFaceSet).ready;
    }
  });
  await page.waitForTimeout(250);
}

test.describe("product route visual baselines", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("home route matches the baseline shell", async ({ context, page }) => {
    await context.clearCookies();
    await seedVisualState(page);

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Open closet" })).toBeVisible();
    await settlePage(page);

    await expect(page).toHaveScreenshot("home-shell.png");
  });

  test("canvas route matches the empty-board baseline shell", async ({ context, page }) => {
    await context.clearCookies();
    await seedVisualState(page);

    await page.goto("/app/canvas");
    await expect(page.getByRole("button", { name: "Import closet" })).toBeVisible();
    await expect(page.getByText("No board has been saved yet.", { exact: true })).toBeVisible();
    await settlePage(page);

    await expect(page).toHaveScreenshot("canvas-empty-shell.png");
  });

  test("community route matches the image-first baseline shell", async ({ context, page }) => {
    await context.clearCookies();
    await seedVisualState(page);

    await page.goto("/app/community");
    await expect(page.getByText("A feed that keeps the wardrobe tone", { exact: true })).toBeVisible();
    await settlePage(page);

    await expect(page).toHaveScreenshot("community-feed-shell.png");
  });

  test("profile route matches the formal summary baseline shell", async ({ context, page }) => {
    await context.clearCookies();
    await seedVisualState(page);

    await page.goto("/app/profile");
    await expect(page.getByText("Account and wardrobe summary", { exact: true })).toBeVisible();
    await settlePage(page);

    await expect(page).toHaveScreenshot("profile-summary-shell.png");
  });
});

test.describe("closet quality tier visual baselines", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const qualityTier of ["low", "balanced", "high"] as const) {
    test(`closet route remains stable in ${qualityTier} tier`, async ({ context, page }) => {
      await context.clearCookies();
      await seedVisualState(page, qualityTier);

      await page.goto("/app/closet");
      await expect(page.getByText("Outfit", { exact: true })).toBeVisible();
      const closetRoot = page.locator("[data-closet-visual-root]").first();
      await expect(closetRoot).toBeVisible();
      await page.waitForTimeout(1200);
      await settlePage(page);

      await expect(await closetRoot.screenshot()).toMatchSnapshot(`closet-${qualityTier}-tier.png`, {
        maxDiffPixels: qualityTier === "high" ? 620 : 480,
      });
    });
  }
});

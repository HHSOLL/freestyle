import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const outputDir = path.join(process.cwd(), "output/fit-quality");
const evidencePath = path.join(outputDir, "hardware-gpu-probe.latest.json");
const screenshotPath = path.join(outputDir, "hardware-gpu-closet.png");
const softwareRendererPattern =
  /(swiftshader|llvmpipe|softpipe|software rasterizer|software renderer|mesa offscreen|warp)/i;

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

const closetScene = {
  version: 7,
  avatarVariantId: "female-base",
  poseId: "relaxed",
  activeCategory: "tops",
  selectedItemId: "starter-top-soft-casual",
  qualityTier: "high",
  equippedItemIds: {
    tops: "starter-top-soft-casual",
    bottoms: "starter-bottom-soft-wool",
    shoes: "starter-shoe-soft-day",
  },
} as const;

async function seedClosetState(page: Page) {
  await page.addInitScript(
    ({ bodyProfile, scene }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("freestyle-language", "en");
      window.localStorage.setItem("freestyle:avatar-profile:v2", JSON.stringify(bodyProfile));
      window.localStorage.setItem("freestyle:closet-scene:v7", JSON.stringify(scene));
      document.cookie = "freestyle-language=en; path=/; max-age=31536000; samesite=lax";
    },
    { bodyProfile: defaultBodyProfile, scene: closetScene },
  );
}

test.describe("hardware-backed GPU visual lane", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders closet route with a non-software WebGL renderer", async ({ page, browserName }) => {
    await seedClosetState(page);
    await page.goto("/app/closet");
    await expect(page.getByText("Outfit", { exact: true })).toBeVisible();
    const closetRoot = page.locator("[data-closet-visual-root]").first();
    await expect(closetRoot).toBeVisible();
    await page.waitForTimeout(1200);

    const rendererEvidence = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ??
        canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false });
      if (!gl) {
        return {
          contextType: null,
          vendor: null,
          renderer: null,
          unmaskedVendor: null,
          unmaskedRenderer: null,
        };
      }

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        contextType: gl instanceof WebGL2RenderingContext ? "webgl2" : "webgl",
        vendor: String(gl.getParameter(gl.VENDOR) ?? ""),
        renderer: String(gl.getParameter(gl.RENDERER) ?? ""),
        unmaskedVendor: debugInfo
          ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? "")
          : null,
        unmaskedRenderer: debugInfo
          ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "")
          : null,
      };
    });

    await mkdir(outputDir, { recursive: true });
    await closetRoot.screenshot({ path: screenshotPath });

    const rendererText = [
      rendererEvidence.vendor,
      rendererEvidence.renderer,
      rendererEvidence.unmaskedVendor,
      rendererEvidence.unmaskedRenderer,
    ]
      .filter(Boolean)
      .join(" ");
    const hardwareAccelerated =
      Boolean(rendererEvidence.contextType) && !softwareRendererPattern.test(rendererText);

    const evidence = {
      schemaVersion: "hardware-gpu-probe.v1",
      generatedAt: new Date().toISOString(),
      browserName,
      projectName: test.info().project.name,
      hardwareAccelerated,
      softwareRendererPattern: softwareRendererPattern.source,
      rendererText,
      rendererEvidence,
      screenshotPath,
    };

    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

    expect(hardwareAccelerated, `Expected a hardware WebGL renderer, got: ${rendererText}`).toBe(
      true,
    );
  });
});

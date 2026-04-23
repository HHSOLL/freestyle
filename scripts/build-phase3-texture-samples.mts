import path from "node:path";
import sharp from "sharp";
import { ensureDir, parseArgs, relativeFromRepo, repoRoot, runCommand } from "./phase3-asset-lib.mts";

type TextureSampleSpec = {
  outputPath: string;
  textureRole: "runtime-color" | "runtime-linear";
  width: number;
  height: number;
  rgba: [number, number, number, number];
};

const sampleSpecs: TextureSampleSpec[] = [
  {
    outputPath: "apps/web/public/assets/viewer-manifests/garments/published-top-precision-tee/textures/basecolor.ktx2",
    textureRole: "runtime-color",
    width: 1024,
    height: 1024,
    rgba: [220, 223, 229, 255],
  },
  {
    outputPath: "apps/web/public/assets/viewer-manifests/garments/published-top-precision-tee/textures/normal.ktx2",
    textureRole: "runtime-linear",
    width: 1024,
    height: 1024,
    rgba: [128, 128, 255, 255],
  },
  {
    outputPath: "apps/web/public/assets/viewer-manifests/garments/published-top-precision-tee/textures/orm.ktx2",
    textureRole: "runtime-linear",
    width: 1024,
    height: 1024,
    rgba: [255, 184, 0, 255],
  },
  {
    outputPath: "apps/web/public/assets/viewer-manifests/garments/published-top-precision-tee/textures/detail_normal.ktx2",
    textureRole: "runtime-linear",
    width: 512,
    height: 512,
    rgba: [128, 128, 255, 255],
  },
  {
    outputPath: "apps/web/public/assets/viewer-manifests/avatars/female-base/textures/skin_basecolor.ktx2",
    textureRole: "runtime-color",
    width: 1024,
    height: 1024,
    rgba: [227, 193, 172, 255],
  },
  {
    outputPath: "apps/web/public/assets/viewer-manifests/avatars/female-base/textures/skin_normal.ktx2",
    textureRole: "runtime-linear",
    width: 1024,
    height: 1024,
    rgba: [128, 128, 255, 255],
  },
  {
    outputPath: "apps/web/public/assets/viewer-manifests/avatars/female-base/textures/skin_roughness.ktx2",
    textureRole: "runtime-linear",
    width: 1024,
    height: 1024,
    rgba: [182, 182, 182, 255],
  },
  {
    outputPath: "apps/web/public/assets/viewer-manifests/avatars/female-base/textures/hair_basecolor.ktx2",
    textureRole: "runtime-color",
    width: 1024,
    height: 1024,
    rgba: [59, 45, 40, 255],
  },
  {
    outputPath: "apps/web/public/assets/viewer-manifests/avatars/female-base/textures/hair_normal.ktx2",
    textureRole: "runtime-linear",
    width: 1024,
    height: 1024,
    rgba: [128, 128, 255, 255],
  },
];

const tempRoot = path.join(repoRoot, "output", "phase3-texture-sources");

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);

  for (const spec of sampleSpecs) {
    const absoluteOutputPath = path.join(repoRoot, spec.outputPath);
    const tempInputPath = path.join(tempRoot, `${path.basename(spec.outputPath, ".ktx2")}.png`);

    await ensureDir(path.dirname(tempInputPath));
    await ensureDir(path.dirname(absoluteOutputPath));

    if (!dryRun) {
      await sharp({
        create: {
          width: spec.width,
          height: spec.height,
          channels: 4,
          background: {
            r: spec.rgba[0],
            g: spec.rgba[1],
            b: spec.rgba[2],
            alpha: spec.rgba[3] / 255,
          },
        },
      })
        .png()
        .toFile(tempInputPath);
    }

    runCommand(
      "node",
      [
        "--import",
        "tsx",
        "scripts/encode-ktx2.mts",
        "--input",
        tempInputPath,
        "--output",
        absoluteOutputPath,
        "--texture-role",
        spec.textureRole,
      ],
      { dryRun },
    );

    console.log(`Built sample texture ${relativeFromRepo(absoluteOutputPath)}`);
  }
};

await main();

import fs from "node:fs/promises";
import path from "node:path";

const main = async () => {
  process.env.HUMAN_FACE_MODEL_SOURCE = process.env.HUMAN_FACE_MODEL_SOURCE || "local";
  let hasErrors = false;
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    console.error("Usage: npm run smoke:human-signals -- <image-path> [image-path...]");
    process.exitCode = 1;
    return;
  }

  const { detectHumanSignals } = await import("../src/lib/humanDetection");

  for (const input of inputs) {
    const absolutePath = path.resolve(process.cwd(), input);
    try {
      const buffer = await fs.readFile(absolutePath);
      const signals = await detectHumanSignals(buffer, {
        mode: "face",
        maxSide: 320,
        minFaceAreaRatio: 0.004,
      });
      console.log(
        JSON.stringify(
          {
            file: absolutePath,
            signals,
          },
          null,
          2
        )
      );
    } catch (error) {
      hasErrors = true;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(
        JSON.stringify(
          {
            file: absolutePath,
            error: message,
          },
          null,
          2
        )
      );
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
};

void main();

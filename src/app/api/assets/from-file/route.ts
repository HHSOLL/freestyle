import { NextResponse } from "next/server";
import {
  MAX_UPLOAD_BYTES,
  removeBackground,
} from "@/lib/assetProcessing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large." }, { status: 413 });
    }

    const mime = file.type || "image/png";
    const inputBuffer = await file.arrayBuffer();

    // Process background removal directly
    const result = await removeBackground(inputBuffer, mime);

    // Convert output to data URL for the frontend
    const imageDataUrl = `data:${result.mime};base64,${result.buffer.toString("base64")}`;

    return NextResponse.json({
      status: "completed",
      imageDataUrl,
      removedBackground: result.removedBackground,
      warnings: result.warnings
    });
  } catch (error) {
    console.error("Direct upload error:", error);
    return NextResponse.json({ error: "Failed to process the image." }, { status: 500 });
  }
}

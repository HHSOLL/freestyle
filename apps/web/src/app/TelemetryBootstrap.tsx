"use client";

import { useEffect } from "react";
import { startCanaryTelemetry } from "@/lib/canaryTelemetry";

export function TelemetryBootstrap() {
  useEffect(() => startCanaryTelemetry(), []);

  return null;
}

import { z } from "zod";

export const viewerTelemetryEventSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    value: z.number().optional(),
    tags: z.record(z.string(), z.string()).default({}),
  })
  .strict();

export type ViewerTelemetryEvent = z.infer<typeof viewerTelemetryEventSchema>;

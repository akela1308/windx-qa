import { z } from "zod";

export const VisualPlanSchema = z.object({
  intent: z
    .string()
    .min(1)
    .max(240)
    .describe("Visitor's main task, in the cabinet language"),
  layout: z
    .string()
    .min(1)
    .max(400)
    .describe(
      "Why the opening, text/visual relationship and next section fit this task; in the cabinet language",
    ),
  references: z
    .array(z.string().regex(/^cssda-[a-z0-9-]+$/))
    .max(4)
    .describe(
      "Only reference IDs actually supplied in this request; empty if none are useful",
    ),
  images: z
    .array(
      z.object({
        sectionId: z.string().regex(/^[a-z0-9-]+$/),
        role: z.enum([
          "person",
          "place",
          "product",
          "work",
          "explanation",
          "atmosphere",
        ]),
        source: z.enum(["owner", "original-vector", "optional-owner"]),
        subject: z.string().min(1).max(300),
        purpose: z.string().min(1).max(240),
        framing: z.enum(["portrait", "landscape", "square", "wide"]),
        placement: z.string().min(1).max(240),
        focalPoint: z.string().min(1).max(160),
      }),
    )
    .max(6)
    .describe(
      "Private image guidance, in the cabinet language. optional-owner is future enrichment, never an empty public frame. No images is valid when the content does not need them.",
    ),
});
export type VisualPlan = z.infer<typeof VisualPlanSchema>;

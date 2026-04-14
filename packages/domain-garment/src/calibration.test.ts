import test from "node:test";
import assert from "node:assert/strict";
import { fitReviewArchetypes } from "@freestyle/domain-avatar";
import { assessGarmentPhysicalFit, starterGarmentCatalog } from "./index.js";

const fitStateRank = {
  compression: 0,
  snug: 1,
  regular: 2,
  relaxed: 3,
  oversized: 4,
} as const;

const compareFitOrder = (
  garmentId: string,
  looserArchetypeId: string,
  tighterArchetypeId: string,
) => {
  const garment = starterGarmentCatalog.find((entry) => entry.id === garmentId);
  const looser = fitReviewArchetypes.find((entry) => entry.id === looserArchetypeId);
  const tighter = fitReviewArchetypes.find((entry) => entry.id === tighterArchetypeId);

  assert.ok(garment, `missing garment ${garmentId}`);
  assert.ok(looser, `missing archetype ${looserArchetypeId}`);
  assert.ok(tighter, `missing archetype ${tighterArchetypeId}`);

  const looserAssessment = assessGarmentPhysicalFit(garment!, looser!.profile);
  const tighterAssessment = assessGarmentPhysicalFit(garment!, tighter!.profile);

  assert.ok(looserAssessment, `missing assessment for ${garmentId}/${looserArchetypeId}`);
  assert.ok(tighterAssessment, `missing assessment for ${garmentId}/${tighterArchetypeId}`);
  assert.ok(
    fitStateRank[looserAssessment!.overallState] >= fitStateRank[tighterAssessment!.overallState],
    `${garmentId}: expected ${looserArchetypeId} to be as loose or looser than ${tighterArchetypeId}`,
  );
};

test("starter fit calibration stays monotonic across representative archetypes", () => {
  compareFitOrder("starter-top-soft-casual", "female-petite-lean", "female-curvy");
  compareFitOrder("starter-bottom-soft-wool", "female-petite-lean", "female-curvy");
  compareFitOrder("starter-top-city-relaxed", "male-soft", "male-athletic-tall");
  compareFitOrder("starter-outer-tailored-layer", "female-balanced", "female-curvy");
  compareFitOrder("starter-shoe-night-runner", "female-petite-lean", "male-athletic-tall");
  compareFitOrder("starter-accessory-city-bucket-hat", "female-petite-lean", "male-athletic-tall");
  compareFitOrder("starter-hair-signature-ponytail", "female-petite-lean", "male-athletic-tall");
});

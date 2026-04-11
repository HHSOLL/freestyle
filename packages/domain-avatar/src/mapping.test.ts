import test from "node:test";
import assert from "node:assert/strict";
import {
  bodyProfileToAvatarParams,
  avatarParamsToRigTargets,
} from "./index.js";
import { normalizeBodyProfile } from "@freestyle/shared-types";

test("body profile mapping produces stable normalized avatar params", () => {
  const profile = normalizeBodyProfile({
    gender: "female",
    simple: {
      heightCm: 176,
      shoulderCm: 45,
      chestCm: 99,
      waistCm: 76,
      hipCm: 104,
      inseamCm: 83,
    },
    detailed: {
      armLengthCm: 62,
      torsoLengthCm: 64,
      thighCm: 59,
      calfCm: 38,
    },
  });

  const params = bodyProfileToAvatarParams(profile, "female-base");
  assert.ok(params.stature > 0.5);
  assert.ok(params.shoulderWidth > 0.5);
  assert.ok(params.armLength > 0.5);

  const targets = avatarParamsToRigTargets(params);
  assert.ok(targets.statureScale > 1);
  assert.ok(targets.legLengthScale > 1);
});

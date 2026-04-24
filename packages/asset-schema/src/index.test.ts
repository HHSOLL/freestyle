import assert from "node:assert/strict";
import test from "node:test";
import {
  assetCanonicalManifestRequiredApprovalStates,
  assetCertificationRequiredApprovalStates,
  assetApprovalStates,
  avatarManifestSchema,
  avatarManifestSchemaVersion,
  bodySignatureSchemaVersion,
  buildBodySignatureHash,
  defaultGoldenMatrix,
  ensureBodySignatureHash,
  fitQualityHardFailThresholds,
  phase3AssetBudgetTargets,
  garmentCategoryPolicies,
  resolveGarmentCategoryPolicy,
  fitArtifactManifestSchema,
  fitArtifactManifestSchemaVersion,
  footwearFitGateContracts,
  garmentFitPolicyProfiles,
  garmentManifestSchemaVersion,
  garmentManifestSchema,
  materialContractSchemaVersion,
  materialContractSchema,
} from "./index.js";

test("asset approval states expose the full production lifecycle", () => {
  assert.deepEqual(assetApprovalStates, [
    "DRAFT",
    "TECH_CANDIDATE",
    "VISUAL_CANDIDATE",
    "FIT_CANDIDATE",
    "CERTIFIED",
    "PUBLISHED",
    "DEPRECATED",
    "REJECTED",
  ]);
});

test("approval-state helper groups keep certification and manifest requirements explicit", () => {
  assert.deepEqual(assetCertificationRequiredApprovalStates, [
    "CERTIFIED",
    "PUBLISHED",
    "DEPRECATED",
  ]);
  assert.deepEqual(assetCanonicalManifestRequiredApprovalStates, [
    "FIT_CANDIDATE",
    "CERTIFIED",
    "PUBLISHED",
    "DEPRECATED",
  ]);
});

test("body signature hash remains stable for equivalent objects", () => {
  const left = ensureBodySignatureHash({
    version: bodySignatureSchemaVersion,
    measurements: {
      heightCm: 170,
      waistCm: 72,
      hipCm: 96,
      shoulderWidthCm: 39,
    },
    normalizedShape: {
      heightClass: "average",
      torsoClass: "average",
      hipClass: "average",
      shoulderClass: "average",
    },
  });

  const right = ensureBodySignatureHash({
    normalizedShape: {
      shoulderClass: "average",
      hipClass: "average",
      torsoClass: "average",
      heightClass: "average",
    },
    version: bodySignatureSchemaVersion,
    measurements: {
      hipCm: 96,
      shoulderWidthCm: 39,
      waistCm: 72,
      heightCm: 170,
    },
  });

  assert.equal(left.hash, right.hash);
  assert.equal(left.hash, buildBodySignatureHash(left));
});

test("fit-quality presets keep hard fail thresholds and golden matrices explicit", () => {
  assert.equal(fitQualityHardFailThresholds.visibleCriticalPenetrationMaxMm, 3);
  assert.equal(fitQualityHardFailThresholds.previewLatencyP95Ms, 120);
  assert.equal(defaultGoldenMatrix.bodyIds.length, 12);
  assert.equal(defaultGoldenMatrix.footIds.length, 6);
  assert.equal(defaultGoldenMatrix.poseIds.length, 8);
  assert.deepEqual(garmentFitPolicyProfiles.sandals.forbiddenVisibleMaskRegions, [
    "foot_left",
    "foot_right",
    "toe_left",
    "toe_right",
    "heel_left",
    "heel_right",
  ]);
});

test("garment category policies keep deterministic transfer and mask rules explicit", () => {
  const sandals = resolveGarmentCategoryPolicy("sandals");
  const looseTop = garmentCategoryPolicies.loose_top;

  assert.deepEqual(sandals.allowedMaskRegions, []);
  assert.deepEqual(sandals.forbiddenMaskRegions, [
    "foot_left",
    "foot_right",
    "toe_left",
    "toe_right",
    "heel_left",
    "heel_right",
  ]);
  assert.equal(sandals.previewPolicy.transferMode, "barycentric");
  assert.equal(sandals.previewPolicy.solverUsesDisplayMesh, false);
  assert.equal(looseTop.previewPolicy.transferMode, "cage");
  assert.equal(looseTop.highQualityPolicy.requiresFitMesh, true);
});

test("footwear fit contracts keep sandals-specific gates explicit", () => {
  const sandals = footwearFitGateContracts.sandals;

  assert.equal(sandals.thresholds.bodyMaskVisibleAreaMaxMm2, 0);
  assert.equal(sandals.thresholds.strapVisiblePenetrationMaxMm, 2);
  assert.equal(sandals.thresholds.toeAlignmentMaxMm, 4);
  assert.equal(sandals.thresholds.heelAlignmentMaxMm, 4);
  assert.equal(sandals.thresholds.soleGroundContactRequired, true);
});

test("phase 3 asset budget targets keep transfer and render budgets explicit", () => {
  assert.deepEqual(phase3AssetBudgetTargets.transferBytes, {
    firstVisibleAvatarDesktop: 3_000_000,
    firstVisibleAvatarMobileBalanced: 2_000_000,
    selectedGarmentCriticalDesktop: 1_500_000,
    selectedGarmentCriticalMobileBalanced: 900_000,
    defaultClosetScene: 3_800_000,
  });
  assert.equal(phase3AssetBudgetTargets.drawCalls.visibleDesktop, 80);
  assert.equal(phase3AssetBudgetTargets.triangles.visibleMobileBalanced, 75_000);
});

test("avatar manifest requires render fit and collision asset groups", () => {
  const parsed = avatarManifestSchema.parse({
    id: "female_base_v1",
    schemaVersion: avatarManifestSchemaVersion,
    production: {
      approvalState: "DRAFT",
      reviewNotes: [],
      certificationNotes: [],
    },
    display: {
      bodyLod0: "avatar/display/body_lod0.glb",
      bodyLod1: "avatar/display/body_lod1.glb",
      bodyLod2: "avatar/display/body_lod2.glb",
      headLod0: "avatar/display/head_lod0.glb",
      hairLod0: "avatar/display/hair_lod0.glb",
      hairLod1: "avatar/display/hair_lod1.glb",
    },
    fit: {
      fitBody: "avatar/fit/fit_body.glb",
      measurementLandmarks: "avatar/fit/measurement_landmarks.json",
      bodySignatureModel: "avatar/fit/body_signature_model.json",
    },
    collision: {
      capsules: "avatar/collision/capsules.json",
      collisionMesh: "avatar/collision/collision_mesh.glb",
      collisionSdf: "avatar/collision/collision_sdf.bin",
    },
    rig: {
      skeleton: "avatar/rig/skeleton.json",
      skinningProfile: "avatar/rig/skinning_profile.json",
      morphTargets: "avatar/rig/morph_targets.json",
    },
    materials: {
      skin: "avatar/materials/skin.material.json",
      hair: "avatar/materials/hair.material.json",
    },
    textures: {
      skinBaseColor: "avatar/textures/skin_basecolor.ktx2",
      skinNormal: "avatar/textures/skin_normal.ktx2",
      skinRoughness: "avatar/textures/skin_roughness.ktx2",
      hairBaseColor: "avatar/textures/hair_basecolor.ktx2",
      hairNormal: "avatar/textures/hair_normal.ktx2",
    },
    quality: {
      visualReport: "avatar/quality/visual_report.json",
      fitCompatibilityReport: "avatar/quality/fit_compatibility_report.json",
      budgetReport: "avatar/quality/budget_report.json",
    },
  });

  assert.equal(parsed.display.bodyLod0, "avatar/display/body_lod0.glb");
});

test("garment manifest requires fit and quality artifacts before certification", () => {
  const parsed = garmentManifestSchema.parse({
    id: "top_crop_001",
    schemaVersion: garmentManifestSchemaVersion,
    production: {
      approvalState: "FIT_CANDIDATE",
      reviewNotes: [],
      certificationNotes: [],
    },
    fitPolicyCategory: "tight_top",
    display: {
      lod0: "garment/display/lod0.glb",
      lod1: "garment/display/lod1.glb",
      lod2: "garment/display/lod2.glb",
    },
    fit: {
      fitMesh: "garment/fit/fit_mesh.glb",
      panelGroups: "garment/fit/panel_groups.json",
      seamGraph: "garment/fit/seam_graph.json",
      anchors: "garment/fit/anchors.json",
      constraints: "garment/fit/constraints.json",
      sizeMapping: "garment/fit/size_mapping.json",
      bodyMaskPolicy: "garment/fit/body_mask_policy.json",
      collisionPolicy: "garment/fit/collision_policy.json",
    },
    material: {
      visualMaterial: "garment/material/visual_material.json",
      physicalMaterial: "garment/material/physical_material.json",
    },
    textures: {
      baseColor: "garment/textures/basecolor.ktx2",
      normal: "garment/textures/normal.ktx2",
      orm: "garment/textures/orm.ktx2",
    },
    quality: {
      topologyReport: "garment/quality/topology_report.json",
      materialReport: "garment/quality/material_report.json",
      fitReport: "garment/quality/fit_report.json",
      visualReport: "garment/quality/visual_report.json",
      performanceReport: "garment/quality/performance_report.json",
      goldenFitResult: "garment/quality/golden_fit_result.json",
    },
  });

  assert.equal(parsed.fitPolicyCategory, "tight_top");
});

test("material contract keeps visual and physical properties separate", () => {
  const parsed = materialContractSchema.parse({
    schemaVersion: materialContractSchemaVersion,
    materialClass: "denim",
    visual: {
      baseColor: "garment/textures/basecolor.ktx2",
      normal: "garment/textures/normal.ktx2",
      orm: "garment/textures/orm.ktx2",
      detailNormal: "garment/textures/detail_normal.ktx2",
      clearcoat: 0.1,
    },
    physical: {
      thicknessMm: 1.8,
      stretchWarp: 0.2,
      stretchWeft: 0.18,
      bendStiffness: 0.72,
      shearStiffness: 0.61,
      damping: 0.24,
      friction: 0.33,
      densityGsm: 420,
    },
  });

  assert.equal(parsed.materialClass, "denim");
  assert.equal(parsed.physical.densityGsm, 420);
});

test("fit artifact manifest requires typed metrics and artifact bundle paths", () => {
  const parsed = fitArtifactManifestSchema.parse({
    schemaVersion: fitArtifactManifestSchemaVersion,
    production: {
      approvalState: "CERTIFIED",
      reviewNotes: [],
      certificationNotes: ["manual review complete"],
    },
    bodySignature: {
      version: bodySignatureSchemaVersion,
      measurements: {
        heightCm: 168,
        waistCm: 70,
        hipCm: 96,
      },
      normalizedShape: {
        heightClass: "average",
        torsoClass: "average",
        hipClass: "average",
        shoulderClass: "average",
      },
      hash: "bodyhash",
    },
    bodyRegionTaxonomy: ["waist", "hip", "thigh_left"],
    gates: [
      {
        gate: "visible-penetration",
        status: "pass",
        notes: [],
      },
    ],
    metrics: {
      version: "fit-metrics.v1",
      subject: {
        avatarId: "female-base",
        bodySignatureHash: "bodyhash",
        poseFamily: "standing",
        garmentId: "starter-bottom-soft-wool",
        garmentVersion: "v4",
        size: "S",
        solverVersion: "solver-v1",
      },
      global: {
        fitScore: 91,
        visualFitGrade: "A",
        pass: true,
        failReasons: [],
      },
      penetration: {
        maxDepthMm: 1.4,
        p95DepthMm: 0.6,
        vertexCount: 12,
        visibleVertexCount: 3,
        areaCm2: 0.8,
        byRegion: {
          waist: {
            maxDepthMm: 1.4,
            p95DepthMm: 0.6,
            vertexCount: 12,
            visibleVertexCount: 3,
            areaCm2: 0.8,
          },
        },
      },
      clearance: {
        meanMm: 9,
        p05Mm: 4,
        p50Mm: 8,
        p95Mm: 16,
        byRegion: {
          hip: {
            meanMm: 9,
            p05Mm: 4,
            p50Mm: 8,
            p95Mm: 16,
          },
        },
      },
      floating: {
        maxFloatingMm: 3,
        p95FloatingMm: 2,
        byBoundary: {
          hem: 2,
        },
      },
      bodyMask: {
        maskedAreaCm2: 4,
        visibleMaskedAreaCm2: 0,
        byRegion: {
          pelvis: 4,
        },
      },
      stability: {
        solverIterations: 24,
        residualError: 0.03,
        hasNaN: false,
        selfIntersectionCount: 0,
      },
      performance: {
        previewLatencyMs: 84,
        hqSolveLatencyMs: 420,
      },
    },
    artifacts: {
      drapedGlb: "artifact/draped.glb",
      fitMapJson: "artifact/fit_map.json",
      metricsJson: "artifact/metrics.json",
      previewPng: "artifact/preview.png",
      deformationCache: "artifact/deformation.bin",
    },
  });

  assert.equal(parsed.metrics.global.visualFitGrade, "A");
  assert.equal(parsed.gates[0]?.gate, "visible-penetration");
});

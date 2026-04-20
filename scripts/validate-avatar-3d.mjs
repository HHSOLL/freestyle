#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  collectAvatarMeasurementsSidecarSummaryIssues,
  parseAvatarMeasurementsSidecar,
} from "@freestyle/domain-avatar";
import {
  avatarManifestSchemaVersion,
  avatarMeasurementsSidecarSchemaVersion,
  avatarMorphMapSidecarSchemaVersion,
  avatarRenderManifest,
  avatarSkeletonSidecarSchemaVersion,
  avatarSummarySchemaVersion,
  referenceRigAliasPatterns,
} from "../packages/runtime-3d/src/avatar-manifest.ts";

const repoRoot = process.cwd();
const issues = [];
const sourceLockPath = path.join(repoRoot, "authoring", "avatar", "mpfb", "source-lock.json");
const sourceLockSchemaVersion = "mpfb-source-lock-v1";

const resolvePublicPath = (assetPath) => {
  if (!assetPath.startsWith("/")) {
    issues.push(`asset path must start with '/': ${assetPath}`);
    return null;
  }
  return path.join(repoRoot, "apps/web/public", assetPath.replace(/^\//, ""));
};

const resolveWorkspacePath = (value) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return path.isAbsolute(value) ? path.normalize(value) : path.join(repoRoot, value);
};

const normalizeName = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");

const readJsonFile = (label, absolutePath) => {
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    issues.push(`${label}: parse failed (${error instanceof Error ? error.message : "unknown"})`);
    return null;
  }
};

const sourceLock = readJsonFile("source-lock", sourceLockPath);

const isSha256 = (value) => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const isGitRevision = (value) => typeof value === "string" && /^[a-f0-9]{40}$/i.test(value);
const requiredAvatarRuntimeExtensions = ["EXT_meshopt_compression", "EXT_texture_webp", "KHR_mesh_quantization"];

const requiredAliases = Object.keys(referenceRigAliasPatterns);

const isKnownAuthoringSource = (value) => {
  return ["mpfb2", "charmorph", "runtime-fallback"].includes(value);
};

const validateAliasMap = (label, aliasMap) => {
  for (const alias of requiredAliases) {
    const values = aliasMap[alias];
    if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== "string" || value.trim().length === 0)) {
      issues.push(`${label}: aliasPatterns.${alias} must contain at least one non-empty string`);
    }
  }
};

const validateAssetPath = (label, assetPath) => {
  const absolute = resolvePublicPath(assetPath);
  if (!absolute) return;
  if (!fs.existsSync(absolute)) {
    issues.push(`${label}: missing file ${assetPath}`);
  }
};

const readAvatarGlbInspection = (label, absolutePath) => {
  let payload;
  try {
    payload = fs.readFileSync(absolutePath);
  } catch (error) {
    issues.push(`${label}: failed to read GLB (${error instanceof Error ? error.message : "unknown"})`);
    return null;
  }

  if (payload.length < 20) {
    issues.push(`${label}: GLB is too small to contain a valid header`);
    return null;
  }

  if (payload.toString("utf8", 0, 4) !== "glTF") {
    issues.push(`${label}: GLB magic must be glTF`);
    return null;
  }

  const version = payload.readUInt32LE(4);
  if (version !== 2) {
    issues.push(`${label}: GLB version must be 2`);
    return null;
  }

  const declaredLength = payload.readUInt32LE(8);
  if (declaredLength !== payload.length) {
    issues.push(`${label}: GLB header length must match file size`);
  }

  const jsonChunkLength = payload.readUInt32LE(12);
  const jsonChunkType = payload.toString("utf8", 16, 20);
  if (jsonChunkType !== "JSON") {
    issues.push(`${label}: first GLB chunk must be JSON`);
    return null;
  }

  const jsonChunkEnd = 20 + jsonChunkLength;
  if (jsonChunkEnd > payload.length) {
    issues.push(`${label}: JSON chunk exceeds file length`);
    return null;
  }

  let gltf;
  try {
    gltf = JSON.parse(payload.toString("utf8", 20, jsonChunkEnd));
  } catch (error) {
    issues.push(`${label}: GLB JSON parse failed (${error instanceof Error ? error.message : "unknown"})`);
    return null;
  }

  return {
    byteSize: payload.length,
    sha256: createHash("sha256").update(payload).digest("hex"),
    gltf,
  };
};

const validateRuntimeAvatarGlb = (variantId, entry, summary) => {
  const absoluteModelPath = resolvePublicPath(entry.modelPath);
  if (!absoluteModelPath || !fs.existsSync(absoluteModelPath)) {
    return;
  }

  const inspection = readAvatarGlbInspection(`${variantId}: runtime GLB`, absoluteModelPath);
  if (!inspection) {
    return;
  }

  const { gltf, byteSize, sha256 } = inspection;
  const outputArtifact = summary?.outputArtifact;
  if (!outputArtifact || typeof outputArtifact !== "object") {
    issues.push(`${variantId}: summary outputArtifact is required`);
  } else {
    if (outputArtifact.relativePath !== summary?.outputGlb) {
      issues.push(`${variantId}: summary outputArtifact.relativePath must match outputGlb`);
    }
    if (typeof outputArtifact.byteSize !== "number" || outputArtifact.byteSize <= 0) {
      issues.push(`${variantId}: summary outputArtifact.byteSize must be a positive number`);
    } else if (outputArtifact.byteSize !== byteSize) {
      issues.push(`${variantId}: summary outputArtifact.byteSize must match shipped GLB size`);
    }
    if (!isSha256(outputArtifact.sha256)) {
      issues.push(`${variantId}: summary outputArtifact.sha256 must be a SHA256`);
    } else if (outputArtifact.sha256 !== sha256) {
      issues.push(`${variantId}: summary outputArtifact.sha256 must match shipped GLB digest`);
    }
  }

  const scenes = Array.isArray(gltf?.scenes) ? gltf.scenes : [];
  if (scenes.length !== 1) {
    issues.push(`${variantId}: shipped GLB must contain exactly one scene`);
  }
  const defaultSceneIndex = Number.isInteger(gltf?.scene) ? gltf.scene : 0;
  const defaultScene = scenes[defaultSceneIndex];
  if (!defaultScene) {
    issues.push(`${variantId}: shipped GLB must declare a default scene`);
    return;
  }

  const nodes = Array.isArray(gltf?.nodes) ? gltf.nodes : [];
  const nodeNames = nodes.map((node) => node?.name).filter((name) => typeof name === "string" && name.trim().length > 0);
  const normalizedNodeNames = nodeNames.map((name) => normalizeName(name));
  const rootNodeNames = Array.isArray(defaultScene.nodes)
    ? defaultScene.nodes
        .map((nodeIndex) => nodes[nodeIndex]?.name)
        .filter((name) => typeof name === "string" && name.trim().length > 0)
    : [];

  if (rootNodeNames.length === 0) {
    issues.push(`${variantId}: shipped GLB default scene must reference at least one named root node`);
  }
  if (typeof summary?.rig?.name === "string" && !rootNodeNames.includes(summary.rig.name)) {
    issues.push(`${variantId}: shipped GLB root node must include summary rig name`);
  }

  const extensionsRequired = Array.isArray(gltf?.extensionsRequired) ? gltf.extensionsRequired : [];
  for (const extension of requiredAvatarRuntimeExtensions) {
    if (!extensionsRequired.includes(extension)) {
      issues.push(`${variantId}: shipped GLB must require ${extension}`);
    }
  }

  const materials = Array.isArray(gltf?.materials) ? gltf.materials : [];
  if (materials.length === 0) {
    issues.push(`${variantId}: shipped GLB must contain at least one material`);
  }

  const images = Array.isArray(gltf?.images) ? gltf.images : [];
  if (images.length === 0) {
    issues.push(`${variantId}: shipped GLB must contain at least one texture image`);
  }

  const meshNodes = nodes
    .filter((node) => Number.isInteger(node?.mesh))
    .map((node) => ({
      name: node.name,
      meshIndex: node.mesh,
      skinIndex: node.skin,
    }))
    .filter((node) => typeof node.name === "string" && node.name.trim().length > 0);
  const meshNodeNames = new Set(meshNodes.map((node) => node.name));

  const expectedBodyNodes = [summary?.fullBody, ...(Array.isArray(summary?.bodySegments) ? summary.bodySegments : [])]
    .filter((name) => typeof name === "string" && name.trim().length > 0);
  for (const expectedBodyNode of expectedBodyNodes) {
    if (!meshNodeNames.has(expectedBodyNode)) {
      issues.push(`${variantId}: shipped GLB must contain body node ${expectedBodyNode}`);
    }
  }

  for (const [zone, zoneNames] of Object.entries(entry.meshZones)) {
    const zoneMatched = meshNodes.some((node) =>
      zoneNames.some((zoneName) => normalizeName(node.name).includes(normalizeName(zoneName))),
    );
    if (!zoneMatched) {
      issues.push(`${variantId}: shipped GLB must contain a mesh node matching meshZones.${zone}`);
    }
  }

  for (const alias of requiredAliases) {
    const patterns = entry.aliasPatterns[alias] ?? [];
    const matched = patterns.some((pattern) => normalizedNodeNames.some((nodeName) => nodeName.includes(normalizeName(pattern))));
    if (!matched) {
      issues.push(`${variantId}: shipped GLB must resolve alias ${alias}`);
    }
  }

  const summaryBoneNames = Array.isArray(summary?.rig?.boneNames) ? summary.rig.boneNames : [];
  if (summaryBoneNames.length === 0) {
    issues.push(`${variantId}: summary rig.boneNames are required for GLB validation`);
    return;
  }

  const expectedMorphNames = Array.isArray(summary?.basemesh?.shapeKeys) ? summary.basemesh.shapeKeys.slice(1) : [];
  const meshes = Array.isArray(gltf?.meshes) ? gltf.meshes : [];
  const skins = Array.isArray(gltf?.skins) ? gltf.skins : [];

  for (const bodyNodeName of expectedBodyNodes) {
    const meshNode = meshNodes.find((node) => node.name === bodyNodeName);
    if (!meshNode) {
      continue;
    }

    if (!Number.isInteger(meshNode.skinIndex) || !skins[meshNode.skinIndex]) {
      issues.push(`${variantId}: body node ${bodyNodeName} must reference a valid skin`);
      continue;
    }

    const skin = skins[meshNode.skinIndex];
    const jointNames = Array.isArray(skin.joints)
      ? skin.joints.map((jointIndex) => nodes[jointIndex]?.name)
      : [];
    if (
      jointNames.length !== summaryBoneNames.length
      || jointNames.some((jointName, index) => jointName !== summaryBoneNames[index])
    ) {
      issues.push(`${variantId}: skin joints for ${bodyNodeName} must match summary rig.boneNames`);
    }

    const mesh = meshes[meshNode.meshIndex];
    const primitive = Array.isArray(mesh?.primitives) ? mesh.primitives[0] : null;
    const targetCount = Array.isArray(primitive?.targets) ? primitive.targets.length : 0;
    const weightCount = Array.isArray(mesh?.weights) ? mesh.weights.length : 0;
    const targetNames = Array.isArray(mesh?.extras?.targetNames) ? mesh.extras.targetNames : [];

    if (targetCount !== expectedMorphNames.length) {
      issues.push(`${variantId}: morph target count for ${bodyNodeName} must match summary shape keys without Basis`);
    }
    if (weightCount !== expectedMorphNames.length) {
      issues.push(`${variantId}: morph weight count for ${bodyNodeName} must match summary shape keys without Basis`);
    }
    if (
      targetNames.length !== expectedMorphNames.length
      || targetNames.some((targetName, index) => targetName !== expectedMorphNames[index])
    ) {
      issues.push(`${variantId}: morph target names for ${bodyNodeName} must match summary shape keys without Basis`);
    }
  }
};

const validateSourceProvenance = (label, entry) => {
  if (!entry.sourceProvenance) {
    issues.push(`${label}: sourceProvenance required for mpfb2 variant`);
    return;
  }

  const { sourceProvenance } = entry;

  if (sourceProvenance.sourceSystem !== "mpfb2") {
    issues.push(`${label}: sourceProvenance.sourceSystem must be mpfb2`);
  }

  if (sourceProvenance.schemaVersion !== avatarSummarySchemaVersion) {
    issues.push(`${label}: sourceProvenance.schemaVersion must be ${avatarSummarySchemaVersion}`);
  }

  for (const key of ["presetPath", "summaryPath", "skeletonPath", "measurementsPath", "morphMapPath", "outputModelPath"]) {
    if (typeof sourceProvenance[key] !== "string" || sourceProvenance[key].trim().length === 0) {
      issues.push(`${label}: sourceProvenance.${key} is required`);
    }
  }

  if (typeof sourceProvenance.outputModelPath === "string" && sourceProvenance.outputModelPath !== entry.modelPath) {
    issues.push(`${label}: sourceProvenance.outputModelPath must match modelPath`);
  }
};

const validateMpfbSummary = (variantId, entry) => {
  if (!entry.sourceProvenance || typeof entry.sourceProvenance.summaryPath !== "string") {
    return;
  }

  const summaryPath = resolveWorkspacePath(entry.sourceProvenance.summaryPath);
  if (!summaryPath) {
    issues.push(`${variantId}: sourceProvenance.summaryPath is invalid`);
    return;
  }

  if (!fs.existsSync(summaryPath)) {
    issues.push(`${variantId}: missing authoring summary ${path.relative(repoRoot, summaryPath)}`);
    return;
  }

  const summary = readJsonFile(`${variantId}: authoring summary`, summaryPath);
  if (!summary) {
    return;
  }

  const shapeKeys = summary?.basemesh?.shapeKeys;
  if (!Array.isArray(shapeKeys) || shapeKeys.length < 2) {
    issues.push(`${variantId}: expected MPFB summary to include exported body morph shape keys`);
  }

  if (summary?.schemaVersion !== avatarSummarySchemaVersion) {
    issues.push(`${variantId}: summary schemaVersion must be ${avatarSummarySchemaVersion}`);
  }

  const buildProvenance = summary?.buildProvenance;
  if (!buildProvenance || typeof buildProvenance !== "object") {
    issues.push(`${variantId}: summary buildProvenance is required`);
  } else {
    if (!sourceLock || typeof sourceLock !== "object") {
      issues.push(`${variantId}: source-lock.json must be readable`);
    } else if (sourceLock.schemaVersion !== sourceLockSchemaVersion) {
      issues.push(`${variantId}: source-lock schemaVersion must be ${sourceLockSchemaVersion}`);
    }
    if (typeof buildProvenance?.mpfb?.repoUrl !== "string" || buildProvenance.mpfb.repoUrl.trim().length === 0) {
      issues.push(`${variantId}: summary buildProvenance.mpfb.repoUrl is required`);
    }
    if (!isGitRevision(buildProvenance?.mpfb?.revision)) {
      issues.push(`${variantId}: summary buildProvenance.mpfb.revision must be a full git SHA`);
    }
    if (typeof buildProvenance?.mpfb?.sourcePath !== "string" || buildProvenance.mpfb.sourcePath.trim().length === 0) {
      issues.push(`${variantId}: summary buildProvenance.mpfb.sourcePath is required`);
    }
    if (typeof buildProvenance?.assetPack?.fileName !== "string" || buildProvenance.assetPack.fileName.trim().length === 0) {
      issues.push(`${variantId}: summary buildProvenance.assetPack.fileName is required`);
    }
    if (typeof buildProvenance?.assetPack?.path !== "string" || buildProvenance.assetPack.path.trim().length === 0) {
      issues.push(`${variantId}: summary buildProvenance.assetPack.path is required`);
    }
    if (!isSha256(buildProvenance?.assetPack?.sha256)) {
      issues.push(`${variantId}: summary buildProvenance.assetPack.sha256 must be a SHA256`);
    }
    if (typeof buildProvenance?.assetPack?.sourceRef !== "string" || buildProvenance.assetPack.sourceRef.trim().length === 0) {
      issues.push(`${variantId}: summary buildProvenance.assetPack.sourceRef is required`);
    }
    if (typeof buildProvenance?.builder?.scriptPath !== "string" || buildProvenance.builder.scriptPath.trim().length === 0) {
      issues.push(`${variantId}: summary buildProvenance.builder.scriptPath is required`);
    }
    if (typeof buildProvenance?.builder?.blenderVersion !== "string" || buildProvenance.builder.blenderVersion.trim().length === 0) {
      issues.push(`${variantId}: summary buildProvenance.builder.blenderVersion is required`);
    }
    if (sourceLock?.mpfb?.repoUrl && buildProvenance?.mpfb?.repoUrl !== sourceLock.mpfb.repoUrl) {
      issues.push(`${variantId}: summary buildProvenance.mpfb.repoUrl must match source-lock`);
    }
    if (sourceLock?.mpfb?.revision && buildProvenance?.mpfb?.revision !== sourceLock.mpfb.revision) {
      issues.push(`${variantId}: summary buildProvenance.mpfb.revision must match source-lock`);
    }
    if (sourceLock?.assetPack?.fileName && buildProvenance?.assetPack?.fileName !== sourceLock.assetPack.fileName) {
      issues.push(`${variantId}: summary buildProvenance.assetPack.fileName must match source-lock`);
    }
    if (sourceLock?.assetPack?.sha256 && buildProvenance?.assetPack?.sha256 !== sourceLock.assetPack.sha256) {
      issues.push(`${variantId}: summary buildProvenance.assetPack.sha256 must match source-lock`);
    }
  }

  const authoringProvenance = summary?.authoringProvenance;

  if (!authoringProvenance || typeof authoringProvenance !== "object") {
    issues.push(`${variantId}: summary authoringProvenance is required`);
    return;
  }

  for (const key of ["variantId", "presetPath", "outputModelPath"]) {
    if (typeof authoringProvenance[key] !== "string" || authoringProvenance[key].trim().length === 0) {
      issues.push(`${variantId}: summary authoringProvenance.${key} is required`);
    }
  }

  if (typeof authoringProvenance.variantId === "string" && authoringProvenance.variantId !== variantId) {
    issues.push(`${variantId}: summary authoringProvenance.variantId mismatch (${authoringProvenance.variantId})`);
  }

  if (authoringProvenance.sourceSystem !== "mpfb2") {
    issues.push(`${variantId}: summary authoringProvenance.sourceSystem must be mpfb2`);
  }

  if (typeof authoringProvenance.presetPath === "string" && entry.sourceProvenance?.presetPath) {
    const summaryPresetPath = resolveWorkspacePath(authoringProvenance.presetPath);
    const manifestPresetPath = resolveWorkspacePath(entry.sourceProvenance.presetPath);
    if (summaryPresetPath && manifestPresetPath && summaryPresetPath !== manifestPresetPath) {
      issues.push(`${variantId}: summary authoringProvenance.presetPath must match sourceProvenance.presetPath`);
    }
  }

  if (typeof authoringProvenance.outputModelPath === "string" && entry.sourceProvenance?.outputModelPath) {
    if (path.normalize(authoringProvenance.outputModelPath) !== path.normalize(entry.sourceProvenance.outputModelPath)) {
      issues.push(`${variantId}: summary authoringProvenance.outputModelPath must match sourceProvenance.outputModelPath`);
    }
  }

  const segmentation = summary?.segmentation ?? {};
  const requiredSegmentationZones = [
    ...Object.keys(entry.meshZones).filter((zone) => zone !== "fullBody"),
    "exposed",
  ];
  for (const zone of requiredSegmentationZones) {
    if (typeof segmentation[zone] !== "number" || segmentation[zone] <= 0) {
      issues.push(`${variantId}: segmentation.${zone} must be a positive number`);
    }
  }

  const manifestModelPath = resolvePublicPath(entry.modelPath);
  if (typeof summary?.outputGlb === "string") {
    const absoluteSummaryModel = path.resolve(summary.outputGlb);
    if (manifestModelPath && absoluteSummaryModel !== path.resolve(manifestModelPath)) {
      issues.push(`${variantId}: summary outputGlb must match manifest modelPath`);
    }
  } else {
    issues.push(`${variantId}: summary outputGlb is required`);
  }

  const summaryPresetPath = typeof summary?.preset === "string" ? summary.preset : null;
  const manifestPresetPath = entry.sourceProvenance?.presetPath ? resolveWorkspacePath(entry.sourceProvenance.presetPath) : null;
  if (summaryPresetPath && manifestPresetPath) {
    if (path.resolve(summaryPresetPath) !== path.resolve(manifestPresetPath)) {
      issues.push(`${variantId}: summary preset must match sourceProvenance.presetPath`);
    }
  } else if (!summaryPresetPath) {
    issues.push(`${variantId}: summary preset is required`);
  }

  const normalizedBodySegments = Array.isArray(summary?.bodySegments)
    ? summary.bodySegments.map((segmentName) => normalizeName(segmentName))
    : [];
  if (entry.bodyMaskStrategy !== "none") {
    for (const [zone, meshNames] of Object.entries(entry.meshZones)) {
      if (zone === "fullBody") continue;
      const matched = meshNames.some((meshName) =>
        normalizedBodySegments.some((segmentName) => segmentName.includes(normalizeName(meshName))),
      );
      if (!matched) {
        issues.push(`${variantId}: bodySegments must include a segment matching meshZones.${zone}`);
      }
    }
  }

  const sidecarSpecs = [
    {
      key: "skeletonPath",
      schemaVersion: avatarSkeletonSidecarSchemaVersion,
      validate: (sidecar) => {
        if (sidecar?.variantId !== variantId) {
          issues.push(`${variantId}: skeleton sidecar variantId mismatch`);
        }
        if (sidecar?.authoringSource !== "mpfb2") {
          issues.push(`${variantId}: skeleton sidecar authoringSource must be mpfb2`);
        }
        if (sidecar?.rigName !== summary?.rig?.name) {
          issues.push(`${variantId}: skeleton sidecar rigName must match summary rig name`);
        }
        const sidecarBoneNames = Array.isArray(sidecar?.boneNames) ? sidecar.boneNames : [];
        const summaryBoneNames = Array.isArray(summary?.rig?.boneNames) ? summary.rig.boneNames : [];
        if (
          sidecarBoneNames.length !== summaryBoneNames.length
          || sidecarBoneNames.some((boneName, index) => boneName !== summaryBoneNames[index])
        ) {
          issues.push(`${variantId}: skeleton sidecar boneNames must match summary rig.boneNames`);
        }
        if (sidecar?.boneCount !== summaryBoneNames.length) {
          issues.push(`${variantId}: skeleton sidecar boneCount must match summary rig.boneNames length`);
        }
        if (JSON.stringify(sidecar?.buildProvenance ?? {}) !== JSON.stringify(summary?.buildProvenance ?? {})) {
          issues.push(`${variantId}: skeleton sidecar buildProvenance must match summary buildProvenance`);
        }
      },
    },
    {
      key: "measurementsPath",
      schemaVersion: avatarMeasurementsSidecarSchemaVersion,
      validate: (sidecar) => {
        const parsedSidecarResult = parseAvatarMeasurementsSidecar(sidecar, {
          variantId,
          expectedSchemaVersion: avatarMeasurementsSidecarSchemaVersion,
        });
        issues.push(...parsedSidecarResult.issues);
        if (!parsedSidecarResult.sidecar) {
          return;
        }
        issues.push(
          ...collectAvatarMeasurementsSidecarSummaryIssues(parsedSidecarResult.sidecar, {
            variantId,
            expectedSchemaVersion: avatarMeasurementsSidecarSchemaVersion,
            summary,
          }),
        );
      },
    },
    {
      key: "morphMapPath",
      schemaVersion: avatarMorphMapSidecarSchemaVersion,
      validate: (sidecar) => {
        if (sidecar?.variantId !== variantId) {
          issues.push(`${variantId}: morph-map sidecar variantId mismatch`);
        }
        if (sidecar?.authoringSource !== "mpfb2") {
          issues.push(`${variantId}: morph-map sidecar authoringSource must be mpfb2`);
        }
        const summaryShapeKeys = Array.isArray(summary?.basemesh?.shapeKeys) ? summary.basemesh.shapeKeys : [];
        const sidecarShapeKeys = Array.isArray(sidecar?.shapeKeys) ? sidecar.shapeKeys.map((shapeKey) => shapeKey?.name) : [];
        if (
          sidecarShapeKeys.length !== summaryShapeKeys.length
          || sidecarShapeKeys.some((shapeKey, index) => shapeKey !== summaryShapeKeys[index])
        ) {
          issues.push(`${variantId}: morph-map sidecar shapeKeys must match summary basemesh.shapeKeys`);
        }
        if (sidecar?.shapeKeyCount !== summaryShapeKeys.length) {
          issues.push(`${variantId}: morph-map sidecar shapeKeyCount must match summary basemesh.shapeKeys length`);
        }
        if (JSON.stringify(sidecar?.buildProvenance ?? {}) !== JSON.stringify(summary?.buildProvenance ?? {})) {
          issues.push(`${variantId}: morph-map sidecar buildProvenance must match summary buildProvenance`);
        }
      },
    },
  ];

  for (const spec of sidecarSpecs) {
    const sidecarRef = entry.sourceProvenance?.[spec.key];
    const sidecarPath = resolveWorkspacePath(sidecarRef);
    if (!sidecarPath) {
      issues.push(`${variantId}: sourceProvenance.${spec.key} is invalid`);
      continue;
    }
    if (!fs.existsSync(sidecarPath)) {
      issues.push(`${variantId}: missing ${spec.key} ${path.relative(repoRoot, sidecarPath)}`);
      continue;
    }
    const sidecar = readJsonFile(`${variantId}: ${spec.key}`, sidecarPath);
    if (!sidecar) {
      continue;
    }
    if (sidecar?.schemaVersion !== spec.schemaVersion) {
      issues.push(`${variantId}: ${spec.key} schemaVersion must be ${spec.schemaVersion}`);
    }
    spec.validate(sidecar);
  }

  validateRuntimeAvatarGlb(variantId, entry, summary);
};

for (const [variantId, entry] of Object.entries(avatarRenderManifest)) {
  if (entry.id !== variantId) {
    issues.push(`${variantId}: manifest id must match object key`);
  }

  if (entry.schemaVersion !== avatarManifestSchemaVersion) {
    issues.push(`${variantId}: manifest schemaVersion must be ${avatarManifestSchemaVersion}`);
  }

  if (!isKnownAuthoringSource(entry.authoringSource)) {
    issues.push(`${variantId}: unexpected authoringSource ${entry.authoringSource}`);
  }

  if (!["named-mesh-zones", "none"].includes(entry.bodyMaskStrategy)) {
    issues.push(`${variantId}: unexpected bodyMaskStrategy ${entry.bodyMaskStrategy}`);
  }

  if (typeof entry.stageOffsetY !== "number" || Number.isNaN(entry.stageOffsetY)) {
    issues.push(`${variantId}: stageOffsetY must be a number`);
  }

  if (typeof entry.stageScale !== "number" || entry.stageScale <= 0) {
    issues.push(`${variantId}: stageScale must be a positive number`);
  }

  validateAssetPath(variantId, entry.modelPath);
  validateAliasMap(variantId, entry.aliasPatterns);

  if (entry.authoringSource === "mpfb2") {
    validateSourceProvenance(variantId, entry);
    validateMpfbSummary(variantId, entry);
  }

  for (const [zone, meshNames] of Object.entries(entry.meshZones)) {
    if (entry.bodyMaskStrategy === "none") {
      if (!Array.isArray(meshNames)) {
        issues.push(`${variantId}: meshZones.${zone} must still be an array`);
      }
      continue;
    }
    if (!Array.isArray(meshNames) || meshNames.length === 0) {
      issues.push(`${variantId}: meshZones.${zone} must list at least one mesh name`);
      continue;
    }
    if (meshNames.some((meshName) => typeof meshName !== "string" || meshName.trim().length === 0)) {
      issues.push(`${variantId}: meshZones.${zone} must contain only non-empty string names`);
    }
  }
}

if (issues.length > 0) {
  console.error(`Avatar 3D validation failed with ${issues.length} issue(s).\n`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Avatar 3D validation passed for ${Object.keys(avatarRenderManifest).length} render variants.`);

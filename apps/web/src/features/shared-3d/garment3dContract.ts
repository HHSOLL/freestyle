export const garment3dFormatValues = ['glb'] as const;
export const garment3dUnitValues = ['meter'] as const;
export const garment3dUpAxisValues = ['Y-up'] as const;
export const garment3dReferencePoseValues = ['A-pose'] as const;
export const garment3dCategoryValues = ['tops', 'outerwear', 'bottoms', 'shoes', 'accessories', 'custom'] as const;

export type Garment3dFormat = (typeof garment3dFormatValues)[number];
export type Garment3dUnit = (typeof garment3dUnitValues)[number];
export type Garment3dUpAxis = (typeof garment3dUpAxisValues)[number];
export type Garment3dReferencePose = (typeof garment3dReferencePoseValues)[number];
export type Garment3dCategory = (typeof garment3dCategoryValues)[number];

export type Garment3dBoundsCm = {
  width: number;
  height: number;
  depth: number;
};

export type Garment3dSkeletonCompatibility = {
  id: string;
  requiredBones: string[];
};

export type Garment3dMetadata = {
  category: Garment3dCategory;
  sizeTag: string;
  boundsCm: Garment3dBoundsCm;
  skeletonProfile: Garment3dSkeletonCompatibility;
  colliderProfile: string;
  unitScale: number;
  format?: Garment3dFormat;
  unit?: Garment3dUnit;
  upAxis?: Garment3dUpAxis;
  referencePose?: Garment3dReferencePose;
};

export type Garment3dCatalogEntry = {
  id: string;
  label: string;
  modelPath: string;
  metadata: Garment3dMetadata;
  notes?: string;
};

export type Garment3dSkeletonProfileDefinition = {
  id: string;
  label: string;
  requiredBones: readonly string[];
};

export type Garment3dColliderProfileDefinition = {
  id: string;
  label: string;
  supportedCategories: readonly Garment3dCategory[];
};

export type Garment3dNormalizedMetadata = Omit<
  Garment3dMetadata,
  'format' | 'unit' | 'upAxis' | 'referencePose'
> & {
  format: Garment3dFormat;
  unit: Garment3dUnit;
  upAxis: Garment3dUpAxis;
  referencePose: Garment3dReferencePose;
};

export type Garment3dNormalizedCatalogEntry = Omit<Garment3dCatalogEntry, 'metadata'> & {
  metadata: Garment3dNormalizedMetadata;
};

export type Garment3dValidationIssue = {
  path: string;
  message: string;
};

export type Garment3dValidationOptions = {
  skeletonProfiles?: Readonly<Record<string, Garment3dSkeletonProfileDefinition>>;
  colliderProfiles?: Readonly<Record<string, Garment3dColliderProfileDefinition>>;
};

export const garment3dContractDefaults = Object.freeze({
  format: 'glb',
  unit: 'meter',
  upAxis: 'Y-up',
  referencePose: 'A-pose',
} satisfies Readonly<{
  format: Garment3dFormat;
  unit: Garment3dUnit;
  upAxis: Garment3dUpAxis;
  referencePose: Garment3dReferencePose;
}>);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isFinitePositiveNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

const isOneOf = <T extends readonly string[]>(value: unknown, options: T): value is T[number] =>
  typeof value === 'string' && options.includes(value);

const normalizeBones = (bones: readonly string[]) =>
  [...bones]
    .map((bone) => bone.trim())
    .filter((bone) => bone.length > 0)
    .sort((left, right) => left.localeCompare(right));

const pushIssue = (issues: Garment3dValidationIssue[], path: string, message: string) => {
  issues.push({ path, message });
};

export function applyGarment3dContractDefaults(metadata: Garment3dMetadata): Garment3dNormalizedMetadata {
  return {
    ...metadata,
    format: metadata.format ?? garment3dContractDefaults.format,
    unit: metadata.unit ?? garment3dContractDefaults.unit,
    upAxis: metadata.upAxis ?? garment3dContractDefaults.upAxis,
    referencePose: metadata.referencePose ?? garment3dContractDefaults.referencePose,
  };
}

export function applyGarment3dEntryDefaults(entry: Garment3dCatalogEntry): Garment3dNormalizedCatalogEntry {
  return {
    ...entry,
    metadata: applyGarment3dContractDefaults(entry.metadata),
  };
}

export function validateGarment3dMetadata(
  value: unknown,
  options: Garment3dValidationOptions = {},
  path = 'metadata'
): Garment3dValidationIssue[] {
  const issues: Garment3dValidationIssue[] = [];

  if (!isRecord(value)) {
    pushIssue(issues, path, 'must be an object.');
    return issues;
  }

  if (!isOneOf(value.category, garment3dCategoryValues)) {
    pushIssue(issues, `${path}.category`, `must be one of: ${garment3dCategoryValues.join(', ')}.`);
  }

  if (!isNonEmptyString(value.sizeTag)) {
    pushIssue(issues, `${path}.sizeTag`, 'must be a non-empty string.');
  }

  if (!isRecord(value.boundsCm)) {
    pushIssue(issues, `${path}.boundsCm`, 'must be an object with width, height, and depth in centimeters.');
  } else {
    if (!isFinitePositiveNumber(value.boundsCm.width)) {
      pushIssue(issues, `${path}.boundsCm.width`, 'must be a finite number greater than 0.');
    }
    if (!isFinitePositiveNumber(value.boundsCm.height)) {
      pushIssue(issues, `${path}.boundsCm.height`, 'must be a finite number greater than 0.');
    }
    if (!isFinitePositiveNumber(value.boundsCm.depth)) {
      pushIssue(issues, `${path}.boundsCm.depth`, 'must be a finite number greater than 0.');
    }
  }

  if (!isRecord(value.skeletonProfile)) {
    pushIssue(issues, `${path}.skeletonProfile`, 'must be an object with id and requiredBones.');
  } else {
    if (!isNonEmptyString(value.skeletonProfile.id)) {
      pushIssue(issues, `${path}.skeletonProfile.id`, 'must be a non-empty string.');
    }

    const requiredBones = value.skeletonProfile.requiredBones;
    if (!Array.isArray(requiredBones) || requiredBones.length === 0) {
      pushIssue(issues, `${path}.skeletonProfile.requiredBones`, 'must be a non-empty string array.');
    } else {
      const normalizedBones = normalizeBones(
        requiredBones.filter((bone): bone is string => typeof bone === 'string')
      );

      if (normalizedBones.length !== requiredBones.length) {
        pushIssue(issues, `${path}.skeletonProfile.requiredBones`, 'must not contain empty or non-string bone names.');
      } else if (new Set(normalizedBones).size !== normalizedBones.length) {
        pushIssue(issues, `${path}.skeletonProfile.requiredBones`, 'must not contain duplicate bone names.');
      }

      if (isNonEmptyString(value.skeletonProfile.id) && options.skeletonProfiles) {
        const expectedProfile = options.skeletonProfiles[value.skeletonProfile.id];

        if (!expectedProfile) {
          pushIssue(
            issues,
            `${path}.skeletonProfile.id`,
            `must reference a registered skeleton profile. Unknown id "${value.skeletonProfile.id}".`
          );
        } else {
          const expectedBones = normalizeBones(expectedProfile.requiredBones);
          const matchesRegisteredProfile =
            expectedBones.length === normalizedBones.length &&
            expectedBones.every((bone, index) => bone === normalizedBones[index]);

          if (!matchesRegisteredProfile) {
            pushIssue(
              issues,
              `${path}.skeletonProfile.requiredBones`,
              `must exactly match the registered required bones for "${value.skeletonProfile.id}".`
            );
          }
        }
      }
    }
  }

  if (!isNonEmptyString(value.colliderProfile)) {
    pushIssue(issues, `${path}.colliderProfile`, 'must be a non-empty string.');
  } else if (options.colliderProfiles) {
    const colliderProfile = options.colliderProfiles[value.colliderProfile];
    if (!colliderProfile) {
      pushIssue(
        issues,
        `${path}.colliderProfile`,
        `must reference a registered collider profile. Unknown id "${value.colliderProfile}".`
      );
    } else if (isOneOf(value.category, garment3dCategoryValues) && !colliderProfile.supportedCategories.includes(value.category)) {
      pushIssue(
        issues,
        `${path}.colliderProfile`,
        `profile "${value.colliderProfile}" does not support category "${value.category}".`
      );
    }
  }

  if (!isFinitePositiveNumber(value.unitScale)) {
    pushIssue(issues, `${path}.unitScale`, 'must be a finite number greater than 0.');
  }

  if (value.format !== undefined && !isOneOf(value.format, garment3dFormatValues)) {
    pushIssue(issues, `${path}.format`, `must be ${garment3dContractDefaults.format}.`);
  }

  if (value.unit !== undefined && !isOneOf(value.unit, garment3dUnitValues)) {
    pushIssue(issues, `${path}.unit`, `must be ${garment3dContractDefaults.unit}.`);
  }

  if (value.upAxis !== undefined && !isOneOf(value.upAxis, garment3dUpAxisValues)) {
    pushIssue(issues, `${path}.upAxis`, `must be ${garment3dContractDefaults.upAxis}.`);
  }

  if (value.referencePose !== undefined && !isOneOf(value.referencePose, garment3dReferencePoseValues)) {
    pushIssue(issues, `${path}.referencePose`, `must be ${garment3dContractDefaults.referencePose}.`);
  }

  return issues;
}

export function validateGarment3dCatalogEntry(
  value: unknown,
  options: Garment3dValidationOptions = {},
  path = 'catalogEntry'
): Garment3dValidationIssue[] {
  const issues: Garment3dValidationIssue[] = [];

  if (!isRecord(value)) {
    pushIssue(issues, path, 'must be an object.');
    return issues;
  }

  if (!isNonEmptyString(value.id)) {
    pushIssue(issues, `${path}.id`, 'must be a non-empty string.');
  }

  if (!isNonEmptyString(value.label)) {
    pushIssue(issues, `${path}.label`, 'must be a non-empty string.');
  }

  if (!isNonEmptyString(value.modelPath)) {
    pushIssue(issues, `${path}.modelPath`, 'must be a non-empty string.');
  } else if (!value.modelPath.toLowerCase().endsWith('.glb')) {
    pushIssue(issues, `${path}.modelPath`, 'must point to a .glb asset.');
  }

  if (!('metadata' in value)) {
    pushIssue(issues, `${path}.metadata`, 'is required.');
  } else {
    issues.push(...validateGarment3dMetadata(value.metadata, options, `${path}.metadata`));
  }

  return issues;
}

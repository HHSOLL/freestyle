import {
  applyGarment3dEntryDefaults,
  validateGarment3dCatalogEntry,
  type Garment3dCatalogEntry,
  type Garment3dCategory,
  type Garment3dNormalizedCatalogEntry,
} from './garment3dContract';
import { garment3dCatalog, garment3dColliderProfiles, garment3dSkeletonProfiles, getGarment3dCatalogEntry } from './garment3dCatalog';

export type Garment3dRuntimeBlockCode =
  | 'GARMENT_3D_NOT_REGISTERED'
  | 'GARMENT_3D_INVALID_METADATA'
  | 'GARMENT_3D_CATEGORY_MISMATCH'
  | 'GARMENT_3D_SKELETON_PROFILE_MISMATCH'
  | 'GARMENT_3D_COLLIDER_PROFILE_MISMATCH';

export type Garment3dRuntimeGuardFailure = {
  ok: false;
  code: Garment3dRuntimeBlockCode;
  reason: string;
};

export type Garment3dRuntimeGuardSuccess = {
  ok: true;
  asset: Garment3dNormalizedCatalogEntry;
};

export type Garment3dRuntimeGuardResult = Garment3dRuntimeGuardFailure | Garment3dRuntimeGuardSuccess;

export type Garment3dRuntimeGuardOptions = {
  expectedCategory?: Garment3dCategory;
  requiredSkeletonProfileId?: string;
  requiredColliderProfileId?: string;
};

const registryValidationOptions = {
  skeletonProfiles: garment3dSkeletonProfiles,
  colliderProfiles: garment3dColliderProfiles,
} as const;

const isCatalogEntry = (value: unknown): value is Garment3dCatalogEntry =>
  typeof value === 'object' && value !== null && 'id' in value && 'metadata' in value;

const fail = (code: Garment3dRuntimeBlockCode, reason: string): Garment3dRuntimeGuardFailure => ({
  ok: false,
  code,
  reason,
});

const resolveCatalogEntry = (value: string | Garment3dCatalogEntry): Garment3dCatalogEntry | null => {
  if (typeof value === 'string') {
    return getGarment3dCatalogEntry(value);
  }

  if (isCatalogEntry(value)) {
    return value;
  }

  return null;
};

export function guardGarment3dUsage(
  value: string | Garment3dCatalogEntry,
  options: Garment3dRuntimeGuardOptions = {}
): Garment3dRuntimeGuardResult {
  const entry = resolveCatalogEntry(value);

  if (!entry) {
    const assetId = typeof value === 'string' ? value : 'unknown';
    return fail('GARMENT_3D_NOT_REGISTERED', `Garment 3D asset "${assetId}" is blocked because it is not registered in garment3dCatalog.`);
  }

  const issues = validateGarment3dCatalogEntry(entry, registryValidationOptions);
  if (issues.length > 0) {
    const firstIssue = issues[0];
    return fail(
      'GARMENT_3D_INVALID_METADATA',
      `Garment 3D asset "${entry.id}" is blocked because ${firstIssue.path} ${firstIssue.message}`
    );
  }

  const normalizedEntry = applyGarment3dEntryDefaults(entry);
  const { metadata } = normalizedEntry;

  if (options.expectedCategory && metadata.category !== options.expectedCategory) {
    return fail(
      'GARMENT_3D_CATEGORY_MISMATCH',
      `Garment 3D asset "${entry.id}" is blocked because category "${metadata.category}" does not match expected "${options.expectedCategory}".`
    );
  }

  if (options.requiredSkeletonProfileId && metadata.skeletonProfile.id !== options.requiredSkeletonProfileId) {
    return fail(
      'GARMENT_3D_SKELETON_PROFILE_MISMATCH',
      `Garment 3D asset "${entry.id}" is blocked because skeleton profile "${metadata.skeletonProfile.id}" does not match required "${options.requiredSkeletonProfileId}".`
    );
  }

  if (options.requiredColliderProfileId && metadata.colliderProfile !== options.requiredColliderProfileId) {
    return fail(
      'GARMENT_3D_COLLIDER_PROFILE_MISMATCH',
      `Garment 3D asset "${entry.id}" is blocked because collider profile "${metadata.colliderProfile}" does not match required "${options.requiredColliderProfileId}".`
    );
  }

  return {
    ok: true,
    asset: normalizedEntry,
  };
}

export const getGarment3dUsageBlockReason = (
  value: string | Garment3dCatalogEntry,
  options?: Garment3dRuntimeGuardOptions
) => {
  const result = guardGarment3dUsage(value, options);
  return result.ok ? null : result.reason;
};

export const listRegisteredGarment3dIds = () => garment3dCatalog.map((entry) => entry.id);

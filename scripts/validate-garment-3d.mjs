#!/usr/bin/env node

import { garment3dCatalog, garment3dColliderProfiles, garment3dSkeletonProfiles } from '../apps/web/src/features/shared-3d/garment3dCatalog.ts';
import { validateGarment3dCatalogEntry } from '../apps/web/src/features/shared-3d/garment3dContract.ts';

const registryValidationOptions = {
  skeletonProfiles: garment3dSkeletonProfiles,
  colliderProfiles: garment3dColliderProfiles,
};

const issues = [];
const seenIds = new Set();

for (const [index, entry] of garment3dCatalog.entries()) {
  const entryPath = `garment3dCatalog[${index}]`;
  issues.push(...validateGarment3dCatalogEntry(entry, registryValidationOptions, entryPath));

  if (seenIds.has(entry.id)) {
    issues.push({
      path: `${entryPath}.id`,
      message: `must be unique. Duplicate id "${entry.id}".`,
    });
  } else {
    seenIds.add(entry.id);
  }

}

if (issues.length > 0) {
  console.error(`Garment 3D catalog validation failed with ${issues.length} issue(s).\n`);
  for (const issue of issues) {
    console.error(`- ${issue.path}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(
  `Garment 3D catalog validation passed for ${garment3dCatalog.length} entr${garment3dCatalog.length === 1 ? 'y' : 'ies'}.`
);

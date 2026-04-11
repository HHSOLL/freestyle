import crypto from "node:crypto";
import {
  createOutfit,
  deleteOutfitByIdForUser,
  getOutfitByIdForUser,
  getOutfitBySlug,
  listOutfits,
  listOutfitsForUser,
  type OutfitListItem,
  type OutfitRow,
} from "@freestyle/db";
import type {
  CanvasLookInput,
  CanvasLookRecord,
  CanvasLookSummary,
} from "@freestyle/shared";

const createShareSlug = () => crypto.randomBytes(6).toString("base64url");

export const mapOutfitSummary = (outfit: OutfitListItem): CanvasLookSummary => ({
  id: outfit.id,
  shareSlug: outfit.share_slug,
  title: outfit.title,
  previewImage: outfit.preview_image,
  createdAt: outfit.created_at,
});

export const mapOutfitRecord = (outfit: OutfitRow): CanvasLookRecord => ({
  id: outfit.id,
  shareSlug: outfit.share_slug,
  title: outfit.title,
  description: outfit.description,
  previewImage: outfit.preview_image,
  data: outfit.data,
  isPublic: outfit.is_public,
  createdAt: outfit.created_at,
  updatedAt: outfit.updated_at,
});

export const createCanvasLook = async (userId: string, input: CanvasLookInput) => {
  const saved = await createOutfit({
    userId,
    shareSlug: createShareSlug(),
    title: input.title,
    description: input.description ?? null,
    previewImage: input.previewImage,
    data: input.data,
    isPublic: input.isPublic ?? true,
  });

  return saved;
};

export const listCanvasLooksForUser = async (userId: string) => {
  const outfits = await listOutfitsForUser(userId);
  return outfits.map(mapOutfitSummary);
};

export const getCanvasLookForUser = async (userId: string, id: string) => {
  const outfit = await getOutfitByIdForUser(id, userId);
  return outfit ? mapOutfitRecord(outfit) : null;
};

export const deleteCanvasLookForUser = async (userId: string, id: string) => {
  await deleteOutfitByIdForUser(id, userId);
};

export const listDiscoverLooks = async () => {
  const outfits = await listOutfits();
  return outfits.map(mapOutfitSummary);
};

export const getDiscoverLook = async (slug: string) => {
  const outfit = await getOutfitBySlug(slug);
  return outfit ? mapOutfitRecord(outfit) : null;
};

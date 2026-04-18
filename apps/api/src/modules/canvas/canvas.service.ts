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
import {
  canvasLookDataSchema,
  canvasLookInputSchema,
  canvasLookRecordSchema,
  canvasLookSummarySchema,
} from "@freestyle/contracts";
import type {
  CanvasLookInput,
  CanvasLookRecord,
  CanvasLookSummary,
} from "@freestyle/contracts";

const createShareSlug = () => crypto.randomBytes(6).toString("base64url");

const normalizeCanvasLookData = (data: OutfitRow["data"]) => {
  if (data === null) {
    return null;
  }

  const parsed = canvasLookDataSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
};

export const mapOutfitSummary = (outfit: OutfitListItem): CanvasLookSummary =>
  canvasLookSummarySchema.parse({
    id: outfit.id,
    shareSlug: outfit.share_slug,
    title: outfit.title,
    previewImage: outfit.preview_image,
    createdAt: outfit.created_at,
  });

export const mapOutfitRecord = (outfit: OutfitRow): CanvasLookRecord =>
  canvasLookRecordSchema.parse({
    id: outfit.id,
    shareSlug: outfit.share_slug,
    title: outfit.title,
    description: outfit.description,
    previewImage: outfit.preview_image,
    data: normalizeCanvasLookData(outfit.data),
    isPublic: outfit.is_public,
    createdAt: outfit.created_at,
    updatedAt: outfit.updated_at,
  });

export const createCanvasLook = async (userId: string, input: CanvasLookInput) => {
  const parsed = canvasLookInputSchema.parse(input);
  const saved = await createOutfit({
    userId,
    shareSlug: createShareSlug(),
    title: parsed.title,
    description: parsed.description ?? null,
    previewImage: parsed.previewImage,
    data: parsed.data,
    isPublic: parsed.isPublic ?? true,
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

export const listCommunityLooks = async () => {
  const outfits = await listOutfits();
  return outfits.map(mapOutfitSummary);
};

export const getCommunityLook = async (slug: string) => {
  const outfit = await getOutfitBySlug(slug);
  return outfit ? mapOutfitRecord(outfit) : null;
};

export const listDiscoverLooks = listCommunityLooks;
export const getDiscoverLook = getCommunityLook;

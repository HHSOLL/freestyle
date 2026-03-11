import { listAssetsForUser } from "@freestyle/db";

export const listUserAssets = async (input: {
  userId: string;
  status?: "pending" | "ready" | "failed";
  category?: string;
  page?: number;
  pageSize?: number;
}) => {
  return listAssetsForUser({
    userId: input.userId,
    status: input.status,
    category: input.category,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 20,
  });
};

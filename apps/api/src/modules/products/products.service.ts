import { createProduct, getProductBySourceForUser } from "@freestyle/db";

export const createImportedProduct = async (input: {
  userId: string;
  sourceType: "product_url" | "cart_url" | "upload_image";
  sourceUrl: string;
  merchant?: string;
  merchantProductId?: string;
  title?: string;
  brand?: string;
}) => {
  const existingProduct = await getProductBySourceForUser({
    userId: input.userId,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
  });

  if (existingProduct) {
    return existingProduct;
  }

  return createProduct(input);
};

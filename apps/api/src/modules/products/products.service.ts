import { createProduct } from "@freestyle/db";

export const createImportedProduct = async (input: {
  userId: string;
  sourceType: "product_url" | "cart_url" | "upload_image";
  sourceUrl: string;
  merchant?: string;
  merchantProductId?: string;
  title?: string;
  brand?: string;
}) => {
  return createProduct(input);
};

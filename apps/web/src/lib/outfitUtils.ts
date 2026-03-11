import crypto from "node:crypto";

export const createShareSlug = () =>
  crypto.randomBytes(6).toString("base64url");

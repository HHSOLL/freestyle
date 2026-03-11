import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StoredObject = {
  key: string;
  url: string;
};

export interface StorageAdapter {
  uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<StoredObject>;
  uploadFromUrl(key: string, sourceUrl: string, contentTypeHint?: string): Promise<StoredObject>;
}

const getEnv = (key: string, fallback?: string) => {
  const value = process.env[key]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`${key} is required.`);
};

const fetchBuffer = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch source image: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
};

class SupabaseStorageAdapter implements StorageAdapter {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor() {
    this.client = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    this.bucket = getEnv("SUPABASE_STORAGE_BUCKET", "freestyle-assets");
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<StoredObject> {
    const { error } = await this.client.storage.from(this.bucket).upload(key, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(key);
    return { key, url: data.publicUrl };
  }

  async uploadFromUrl(key: string, sourceUrl: string, contentTypeHint?: string): Promise<StoredObject> {
    const fetched = await fetchBuffer(sourceUrl);
    return this.uploadBuffer(key, fetched.buffer, contentTypeHint || fetched.contentType);
  }
}

class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    this.client = new S3Client({
      region: getEnv("S3_REGION", "auto"),
      endpoint: getEnv("S3_ENDPOINT"),
      forcePathStyle: getEnv("S3_FORCE_PATH_STYLE", "true") === "true",
      credentials: {
        accessKeyId: getEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: getEnv("S3_SECRET_ACCESS_KEY"),
      },
    });
    this.bucket = getEnv("S3_BUCKET");
    this.publicBaseUrl = getEnv("S3_PUBLIC_BASE_URL").replace(/\/$/, "");
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return {
      key,
      url: `${this.publicBaseUrl}/${key}`,
    };
  }

  async uploadFromUrl(key: string, sourceUrl: string, contentTypeHint?: string): Promise<StoredObject> {
    const fetched = await fetchBuffer(sourceUrl);
    return this.uploadBuffer(key, fetched.buffer, contentTypeHint || fetched.contentType);
  }
}

let adapter: StorageAdapter | null = null;

export const getStorageAdapter = (): StorageAdapter => {
  if (adapter) return adapter;

  const provider = getEnv("STORAGE_PROVIDER", "supabase").toLowerCase();
  if (provider === "s3") {
    adapter = new S3StorageAdapter();
    return adapter;
  }

  adapter = new SupabaseStorageAdapter();
  return adapter;
};

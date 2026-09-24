import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/**
 * Generates parameters for a signed, direct-to-Cloudinary upload from the browser.
 * The API server never proxies the file bytes -- the client uploads straight to
 * Cloudinary using this signature, then reports back the resulting secure_url.
 */
export function createUploadSignature(subfolder: string): UploadSignature {
  const folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/${subfolder}`;
  const timestamp = Math.round(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    env.CLOUDINARY_API_SECRET,
  );

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
  };
}

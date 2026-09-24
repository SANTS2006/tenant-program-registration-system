import { env } from "../config/env.js";

/**
 * True only for HTTPS delivery URLs of this app's own Cloudinary account.
 * File URLs arrive from public registration submissions, and the server fetches
 * them (ID card photos, file downloads), so anything else must be refused to
 * avoid fetching arbitrary or internal addresses on a registrant's behalf.
 */
export function isOwnCloudinaryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      Boolean(env.CLOUDINARY_CLOUD_NAME) &&
      url.pathname.startsWith(`/${env.CLOUDINARY_CLOUD_NAME}/`)
    );
  } catch {
    return false;
  }
}

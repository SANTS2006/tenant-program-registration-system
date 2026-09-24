import { apiFetch } from "@/lib/api";
import { getProgramUploadSignature, uploadToCloudinary } from "../programs/api";

export interface IdCardConfig {
  visibleFields: string[];
  primaryColor: string;
  secondaryColor: string;
  showQrCode: boolean;
  backgroundImageUrl?: string;
  photoFieldKey?: string;
}

export interface IdCardConfigResponse {
  idCardEnabled: boolean;
  config: IdCardConfig;
}

export function getIdCardConfig(programId: string) {
  return apiFetch<IdCardConfigResponse>(`/programs/${programId}/id-card/config`);
}

export function updateIdCardConfig(programId: string, config: IdCardConfig) {
  return apiFetch<IdCardConfig>(`/programs/${programId}/id-card/config`, {
    method: "PATCH",
    body: config,
  });
}

export async function uploadIdCardBackground(programId: string, file: File): Promise<string> {
  const signature = await getProgramUploadSignature(programId);
  const { secureUrl } = await uploadToCloudinary(file, signature);
  return secureUrl;
}

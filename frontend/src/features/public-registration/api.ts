import { apiFetch } from "@/lib/api";
import type { FormWithContent, PaginatedResult, PublicProgram } from "@/types/api";
import type { UploadedFileInfo } from "./DynamicForm";

export function listPublicPrograms(page = 1) {
  return apiFetch<PaginatedResult<PublicProgram>>(`/public/programs?page=${page}&pageSize=12`);
}

export function getPublicProgram(slug: string) {
  return apiFetch<PublicProgram>(`/public/programs/${slug}`);
}

export function getPublicForm(slug: string) {
  return apiFetch<FormWithContent>(`/public/programs/${slug}/form`);
}

export interface SubmitRegistrationResult {
  registrationNumber: string;
  status: string;
  confirmationMessage: string | null;
  idCardEnabled: boolean;
}

export function submitRegistration(slug: string, responses: Record<string, unknown>, files: UploadedFileInfo[]) {
  return apiFetch<SubmitRegistrationResult>(`/public/programs/${slug}/registrations`, {
    method: "POST",
    body: { responses, files },
  });
}

export interface VerificationResult {
  registrationNumber: string;
  programName: string;
  applicantName: string | null;
  status: string;
  valid: boolean;
}

export function verifyRegistration(slug: string, registrationNumber: string) {
  return apiFetch<VerificationResult>(
    `/public/verify/${encodeURIComponent(slug)}/${encodeURIComponent(registrationNumber)}`,
  );
}

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export async function uploadPublicFile(slug: string, fieldKey: string, file: File): Promise<UploadedFileInfo> {
  const signature = await apiFetch<UploadSignature>(`/public/uploads/signature?slug=${encodeURIComponent(slug)}`, {
    method: "POST",
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("File upload failed");
  const json = await response.json();

  return {
    fieldKey,
    url: json.secure_url,
    publicId: json.public_id,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string; details?: unknown };
}

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return false;
        const body = (await res.json()) as Envelope<{ accessToken: string }>;
        if (body.data?.accessToken) {
          setAccessToken(body.data.accessToken);
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry, headers, ...rest } = options;

  const doFetch = async (): Promise<Response> =>
    fetch(`/api${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await doFetch();

  if (response.status === 401 && !skipAuthRetry && path !== "/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await doFetch();
    }
  }

  const contentType = response.headers.get("content-type");
  const payload: Envelope<T> = contentType?.includes("application/json")
    ? await response.json()
    : { success: response.ok };

  if (!response.ok || !payload.success) {
    throw new ApiError(
      payload.error?.code ?? "UNKNOWN_ERROR",
      payload.error?.message ?? "Something went wrong",
      response.status,
      payload.error?.details,
    );
  }

  return payload.data as T;
}

/** Prefers the exact UTF-8 name (RFC 5987 `filename*`) over the ASCII `filename` fallback. */
function filenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const extended = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      /* malformed encoding: fall through to the plain name */
    }
  }
  return disposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1] ?? null;
}

/**
 * Downloads a binary response (file export, PDF, ...) from an authenticated endpoint.
 * Plain browser navigation can't carry the Authorization header, so this fetches the
 * bytes with fetch() and triggers a save via a throwaway object URL instead.
 */
export async function downloadAuthenticatedFile(path: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  if (!response.ok) {
    let message = "Failed to download file";
    try {
      const body = (await response.json()) as Envelope<unknown>;
      message = body.error?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError("DOWNLOAD_FAILED", message, response.status);
  }

  const filename = filenameFromDisposition(response.headers.get("content-disposition")) ?? fallbackFilename;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

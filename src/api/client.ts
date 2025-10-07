export const API_BASE_URL = (import.meta.env.VITE_SOCIAL_API_URL || "/api/social") as string;

const ALLOW_MOCK_FALLBACK = (() => {
  const explicit = import.meta.env.VITE_ALLOW_MOCK_FALLBACK;
  if (explicit !== undefined) {
    return explicit === "true";
  }
  // When no backend URL is configured we automatically fall back to the mock dataset
  // to keep the experience usable out of the box.
  const hasCustomApi = Boolean(import.meta.env.VITE_SOCIAL_API_URL);
  return !hasCustomApi;
})();

export class SocialApiError extends Error {
  status?: number;

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message);
    this.name = "SocialApiError";
    if (options?.status !== undefined) {
      this.status = options.status;
    }
    if (options?.cause !== undefined) {
      // @ts-expect-error cause is available in modern runtimes
      this.cause = options.cause;
    }
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const message = text || `Request failed with status ${response.status}`;
      throw new SocialApiError(message, { status: response.status });
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SocialApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Failed to reach social API";
    throw new SocialApiError(message, { cause: error });
  }
}

export function shouldUseMock(error: unknown): boolean {
  if (!ALLOW_MOCK_FALLBACK) return false;
  if (error instanceof SocialApiError) {
    if (error.status === undefined) return true;
    if (error.status >= 500) return true;
    if (error.status === 503) return true;
  }
  return false;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof SocialApiError && error.status === 404;
}

export function toUserFacingError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof SocialApiError) {
    if (ALLOW_MOCK_FALLBACK && shouldUseMock(error)) {
      return new Error(
        `${fallbackMessage} (service indisponible). Configurez VITE_SOCIAL_API_URL pour interroger votre backend.`,
      );
    }
    const baseMessage = error.message || fallbackMessage;
    if (!ALLOW_MOCK_FALLBACK) {
      return new Error(
        `${baseMessage}. Configurez VITE_SOCIAL_API_URL vers votre API live ou définissez VITE_ALLOW_MOCK_FALLBACK=true pour réactiver les données de démonstration.`,
      );
    }
    return new Error(baseMessage);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallbackMessage);
}


import { type Platform, normalizePlatform, platforms } from "@/lib/platforms";

const rawEnv = import.meta.env as Record<string, string | undefined>;

export const API_BASE_URL = (rawEnv.VITE_SOCIAL_API_URL || "/api/social") as string;

const PLATFORM_BASE_URLS = platforms.reduce((acc, platform) => {
  const envKey = `VITE_SOCIAL_API_URL_${platform.toUpperCase()}`;
  const value = rawEnv[envKey];
  if (typeof value === "string" && value.trim()) {
    acc.set(platform, value.trim());
  }
  return acc;
}, new Map<Platform, string>());

function isRelativeBase(url: string | undefined): boolean {
  return typeof url === "string" && url.startsWith("/");
}

const IS_RELATIVE_API_BASE = isRelativeBase(API_BASE_URL);

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

const ALLOW_MOCK_FALLBACK = (() => {
  const explicit = normalizeBoolean(import.meta.env.VITE_ALLOW_MOCK_FALLBACK);
  if (explicit !== undefined) {
    return explicit;
  }
  // When no backend URL is configured we automatically fall back to the mock dataset
  // to keep the experience usable out of the box. As soon as a custom backend is set
  // we assume the developer wants to validate it locally, so we disable the fallback
  // unless it is explicitly re-enabled through VITE_ALLOW_MOCK_FALLBACK.
  const hasCustomApi = Boolean(rawEnv.VITE_SOCIAL_API_URL) || PLATFORM_BASE_URLS.size > 0;
  return !hasCustomApi;
})();

function extractPlatformFromPath(path: string): Platform | null {
  const platformFromSegment = path.match(/^\/platforms\/([^/?#]+)/);
  if (platformFromSegment) {
    return normalizePlatform(platformFromSegment[1]);
  }

  const queryIndex = path.indexOf("?");
  if (queryIndex === -1) {
    return null;
  }

  const params = new URLSearchParams(path.slice(queryIndex + 1));
  const platformParam = params.get("platform");
  return normalizePlatform(platformParam);
}

function resolveBaseUrl(path: string): string {
  const platform = extractPlatformFromPath(path);
  if (platform) {
    const platformBase = PLATFORM_BASE_URLS.get(platform);
    if (platformBase) {
      return platformBase;
    }
  }
  return API_BASE_URL;
}

function joinBaseWithPath(baseUrl: string, path: string): string {
  if (!baseUrl) return path;
  if (!path) return baseUrl;
  if (baseUrl.endsWith("/") && path.startsWith("/")) {
    return `${baseUrl.slice(0, -1)}${path}`;
  }
  return `${baseUrl}${path}`;
}

export class SocialApiError extends Error {
  status?: number;
  baseUrl?: string;

  constructor(message: string, options?: { status?: number; cause?: unknown; baseUrl?: string }) {
    super(message);
    this.name = "SocialApiError";
    if (options?.status !== undefined) {
      this.status = options.status;
    }
    if (options?.cause !== undefined) {
      // @ts-expect-error cause is available in modern runtimes
      this.cause = options.cause;
    }
    if (options?.baseUrl) {
      this.baseUrl = options.baseUrl;
    }
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = resolveBaseUrl(path);
  const url = joinBaseWithPath(baseUrl, path);

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
      throw new SocialApiError(message, { status: response.status, baseUrl });
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SocialApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Failed to reach social API";
    throw new SocialApiError(message, { cause: error, baseUrl });
  }
}

export function shouldUseMock(error: unknown, path?: string): boolean {
  if (!ALLOW_MOCK_FALLBACK) return false;
  const baseUrl =
    error instanceof SocialApiError && typeof error.baseUrl === "string"
      ? error.baseUrl
      : path
        ? resolveBaseUrl(path)
        : API_BASE_URL;
  const isRelative = isRelativeBase(baseUrl);
  if (error instanceof SocialApiError) {
    if (error.status === undefined) return true;
    if (error.status >= 500) return true;
    if (error.status === 503) return true;
    if (error.status === 404 && isRelative) return true;
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


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

export async function request<T>(
  path: string,
  init?: RequestInit,
  options?: {
    baseUrl?: string | null;
  },
): Promise<T> {
  const baseUrl =
    options && Object.prototype.hasOwnProperty.call(options, "baseUrl")
      ? options.baseUrl ?? ""
      : resolveBaseUrl(path);
  const url = joinBaseWithPath(baseUrl, path);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text().catch(() => "");

    if (!response.ok) {
      const message = bodyText || `Request failed with status ${response.status}`;
      throw new SocialApiError(message, { status: response.status, baseUrl });
    }

    const trimmedBody = bodyText.trim();
    const expectsJson = /json/i.test(contentType);
    if (!expectsJson && trimmedBody) {
      const snippet = trimmedBody.replace(/\s+/g, " ").slice(0, 160);
      const message =
        contentType && !expectsJson
          ? `Réponse non JSON (${contentType}) : ${snippet}`
          : `Réponse non JSON reçue : ${snippet}`;
      throw new SocialApiError(message, { status: response.status, baseUrl });
    }

    if (!trimmedBody) {
      throw new SocialApiError("Réponse vide reçue depuis l'API", { status: response.status, baseUrl });
    }

    try {
      return JSON.parse(trimmedBody) as T;
    } catch (parseError) {
      const snippet = trimmedBody.replace(/\s+/g, " ").slice(0, 160);
      const message = `Réponse JSON invalide : ${snippet || "(vide)"}`;
      throw new SocialApiError(message, { status: response.status, cause: parseError, baseUrl });
    }
  } catch (error) {
    if (error instanceof SocialApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Failed to reach social API";
    throw new SocialApiError(message, { cause: error, baseUrl });
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof SocialApiError && error.status === 404;
}

export function toUserFacingError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof SocialApiError) {
    const baseMessage = error.message || fallbackMessage;
    return new Error(`${baseMessage}. Vérifiez la configuration de vos API (VITE_SOCIAL_API_URL et cibles par réseau).`);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallbackMessage);
}


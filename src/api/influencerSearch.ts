import { Platform, normalizePlatform, platforms as allPlatforms } from "@/lib/platforms";
import { request, toUserFacingError } from "./client";

const rawEnv = import.meta.env as Record<string, string | undefined>;
const SEARCH_ENDPOINT = (rawEnv.VITE_SEARCH_API_URL || "/api/search") as string;

export interface InfluencerSearchResult {
  id: string;
  platform: Platform;
  name: string;
  handle: string | null;
  avatar: string | null;
  profileUrl: string | null;
  followers: number | null;
  verified?: boolean;
  note?: string;
}

export interface InfluencerSearchIssue {
  platform: Platform | "unknown";
  message: string;
}

export interface InfluencerSearchResponse {
  results: InfluencerSearchResult[];
  issues: InfluencerSearchIssue[];
}

interface SearchParams {
  platforms: Platform[];
  query: string;
  limit?: number;
}

interface ApiSearchResult {
  id?: string;
  platform?: string;
  name?: string;
  handle?: string | null;
  avatar?: string | null;
  profileUrl?: string | null;
  followers?: number | string | null;
  verified?: boolean;
  note?: string;
}

interface ApiSearchIssue {
  platform?: string | null;
  message?: string | null;
}

interface ApiResponse {
  results?: ApiSearchResult[];
  errors?: ApiSearchIssue[];
}

export const DEFAULT_SEARCH_PLATFORMS: Platform[] = ["youtube", "x", "facebook"];

function uniquePlatforms(input: Platform[]): Platform[] {
  const deduped = new Set<Platform>();
  input.forEach((platform) => {
    if (allPlatforms.includes(platform)) {
      deduped.add(platform);
    }
  });
  return deduped.size ? Array.from(deduped) : Array.from(DEFAULT_SEARCH_PLATFORMS);
}

function buildSearchUrl({ query, platforms, limit }: { query: string; platforms: Platform[]; limit: number }): string {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (platforms.length) {
    params.set("platforms", platforms.join(","));
  }
  const base = (SEARCH_ENDPOINT || "/api/search").trim();
  if (!base) {
    return `/api/search?${params.toString()}`;
  }
  if (base.includes("?")) {
    const separator = base.endsWith("?") || base.endsWith("&") ? "" : "&";
    return `${base}${separator}${params.toString()}`;
  }
  return `${base}?${params.toString()}`;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 0) return null;
  return Math.round(numeric);
}

function normalizeResult(item: ApiSearchResult): InfluencerSearchResult | null {
  const platform = normalizePlatform(item.platform ?? null);
  if (!platform) return null;
  const id = item.id?.toString() || `${platform}:${(item.handle || item.name || "").toString()}`;
  const followers = toNumber(item.followers);
  const handle = typeof item.handle === "string" && item.handle.trim() ? item.handle.trim() : null;
  const name = item.name?.toString().trim() || handle || platform.toUpperCase();
  return {
    id,
    platform,
    name,
    handle,
    avatar: item.avatar ?? null,
    profileUrl: item.profileUrl ?? null,
    followers,
    verified: typeof item.verified === "boolean" ? item.verified : undefined,
    note: item.note ?? undefined,
  };
}

function normalizeIssues(rawIssues: ApiSearchIssue[] | undefined): InfluencerSearchIssue[] {
  if (!Array.isArray(rawIssues)) return [];
  return rawIssues
    .map((issue) => {
      const message = issue?.message?.toString().trim();
      if (!message) return null;
      const platform = normalizePlatform(issue?.platform ?? null);
      return {
        platform: platform ?? "unknown",
        message,
      } as InfluencerSearchIssue;
    })
    .filter((issue): issue is InfluencerSearchIssue => issue !== null);
}

export async function searchInfluencers({
  platforms,
  query,
  limit = 8,
}: SearchParams): Promise<InfluencerSearchResponse> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return { results: [], issues: [] };
  }

  const selectedPlatforms = uniquePlatforms(platforms);
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 25);
  const requestPath = buildSearchUrl({ query: normalizedQuery, platforms: selectedPlatforms, limit: boundedLimit });

  try {
    const response = await request<ApiResponse>(requestPath, undefined, { baseUrl: "" });
    const results = Array.isArray(response?.results)
      ? response.results
          .map(normalizeResult)
          .filter((item): item is InfluencerSearchResult => item !== null)
      : [];
    const issues = normalizeIssues(response?.errors);
    return { results, issues };
  } catch (error) {
    throw toUserFacingError(error, "Impossible de récupérer les profils");
  }
}

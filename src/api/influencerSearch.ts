import { Platform } from "@/lib/platforms";

export interface InfluencerSearchResult {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  followers: number;
  engagementRate: number;
  location?: string;
  topics?: string[];
  verified?: boolean;
}

interface SearchParams {
  platform?: Platform;
  query: string;
  limit?: number;
}

const API_BASE_URL = (import.meta.env.VITE_SOCIAL_API_URL || "/api/social") as string;

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const message = text || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function searchInfluencers({ platform, query, limit = 8 }: SearchParams): Promise<InfluencerSearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const params = new URLSearchParams({
    q: normalizedQuery,
    limit: String(limit),
  });
  if (platform) {
    params.set("platform", platform);
  }

  const result = await request<{ results: InfluencerSearchResult[] }>(`/search/influencers?${params.toString()}`);
  return result.results ?? [];
}

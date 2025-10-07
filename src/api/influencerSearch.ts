import { Platform, normalizePlatform } from "@/lib/platforms";
import { request, shouldUseMock, toUserFacingError } from "./client";
import { mockSearchInfluencers } from "./mockSocialData";

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

export async function searchInfluencers({
  platform,
  query,
  limit = 8,
}: SearchParams): Promise<InfluencerSearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const params = new URLSearchParams({
    q: normalizedQuery,
    limit: String(limit),
  });
  if (platform) {
    params.set("platform", platform);
  }

  try {
    const result = await request<{ results: InfluencerSearchResult[] }>(`/search/influencers?${params.toString()}`);
    return (
      result.results
        ?.map((item) => {
          const normalizedPlatform = normalizePlatform(item.platform as string);
          if (!normalizedPlatform) return null;
          return { ...item, platform: normalizedPlatform };
        })
        .filter((item): item is InfluencerSearchResult => item !== null) ?? []
    );
  } catch (error) {
    if (shouldUseMock(error)) {
      return mockSearchInfluencers({ platform, query: normalizedQuery, limit });
    }
    throw toUserFacingError(error, "Impossible de récupérer les influenceurs");
  }
}


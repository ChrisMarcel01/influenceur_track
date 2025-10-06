import { Platform } from "@/lib/platforms";
import { request, shouldUseMock, isNotFound, toUserFacingError } from "./client";
import {
  mockFetchInfluencerProfile,
  mockFetchPlatformPosts,
  mockFetchFollowersHistory,
  mockFetchEngagementBreakdown,
  mockFetchPlatformMetrics,
} from "./mockSocialData";

export interface PlatformAccount {
  handle: string;
  displayName?: string;
  externalId?: string;
}

export interface PostSummary {
  id: string;
  platform: Platform;
  title: string;
  likes: number;
  comments: number;
  date: string;
  url?: string;
}

export interface PlatformMetrics {
  followers: number;
  weeklyDelta: number;
  avgEngagement: number;
  posts7d: number;
}

export interface FollowersPoint {
  period: string;
  followers: number;
}

export interface InfluencerProfileResponse {
  displayName: string;
  accounts: Partial<Record<Platform, PlatformAccount>>;
  summary: {
    growthSeries: number[];
    engagementByFormat: Record<string, number>;
  };
  platforms: Record<
    Platform,
    {
      metrics: PlatformMetrics;
      followersSeries?: FollowersPoint[];
      engagementByFormat?: Record<string, number>;
      posts?: PostSummary[];
    }
  >;
  posts?: PostSummary[];
}

function fallbackProfile(platform: Platform, handle: string): InfluencerProfileResponse {
  const profile = mockFetchInfluencerProfile({ platform, handle });
  if (profile) return profile;
  throw new Error(
    `Aucun profil de démonstration pour ${handle} sur ${platform}. Configurez VITE_SOCIAL_API_URL pour interroger votre backend.`,
  );
}

export async function fetchInfluencerProfile({
  platform,
  handle,
}: {
  platform: Platform;
  handle: string;
}): Promise<InfluencerProfileResponse> {
  const params = new URLSearchParams({
    platform,
    handle,
  });

  try {
    return await request<InfluencerProfileResponse>(`/influencers/profile?${params.toString()}`);
  } catch (error) {
    if (shouldUseMock(error)) {
      return fallbackProfile(platform, handle);
    }
    if (isNotFound(error)) {
      throw new Error(`Aucun profil trouvé pour ${handle} sur ${platform}`);
    }
    throw toUserFacingError(error, "Impossible de récupérer le profil");
  }
}

export async function fetchPlatformPosts({
  platform,
  handle,
  limit = 50,
}: {
  platform: Platform;
  handle: string;
  limit?: number;
}): Promise<PostSummary[]> {
  const params = new URLSearchParams({ handle, limit: String(limit) });

  try {
    return await request<PostSummary[]>(`/platforms/${platform.toLowerCase()}/posts?${params.toString()}`);
  } catch (error) {
    if (shouldUseMock(error)) {
      return mockFetchPlatformPosts({ platform, handle, limit });
    }
    throw toUserFacingError(error, "Impossible de récupérer les posts");
  }
}

export async function fetchFollowersHistory({
  platform,
  handle,
  weeks = 12,
}: {
  platform: Platform;
  handle: string;
  weeks?: number;
}): Promise<FollowersPoint[]> {
  const params = new URLSearchParams({ handle, weeks: String(weeks) });

  try {
    return await request<FollowersPoint[]>(`/platforms/${platform.toLowerCase()}/followers?${params.toString()}`);
  } catch (error) {
    if (shouldUseMock(error)) {
      return mockFetchFollowersHistory({ platform, handle, weeks });
    }
    throw toUserFacingError(error, "Impossible de récupérer l'historique des abonnés");
  }
}

export async function fetchEngagementBreakdown({
  platform,
  handle,
}: {
  platform: Platform;
  handle: string;
}): Promise<Record<string, number>> {
  const params = new URLSearchParams({ handle });

  try {
    return await request<Record<string, number>>(`/platforms/${platform.toLowerCase()}/engagement?${params.toString()}`);
  } catch (error) {
    if (shouldUseMock(error)) {
      return mockFetchEngagementBreakdown({ platform, handle });
    }
    throw toUserFacingError(error, "Impossible de récupérer la ventilation de l'engagement");
  }
}

export async function fetchPlatformMetrics({
  platform,
  handle,
}: {
  platform: Platform;
  handle: string;
}): Promise<PlatformMetrics> {
  const params = new URLSearchParams({ handle });

  try {
    return await request<PlatformMetrics>(`/platforms/${platform.toLowerCase()}/metrics?${params.toString()}`);
  } catch (error) {
    if (shouldUseMock(error)) {
      const metrics = mockFetchPlatformMetrics({ platform, handle });
      if (metrics) {
        return metrics;
      }
    }
    throw toUserFacingError(error, "Impossible de récupérer les métriques");
  }
}


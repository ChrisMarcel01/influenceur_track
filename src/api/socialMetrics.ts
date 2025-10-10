import { Platform, normalizePlatform } from "@/lib/platforms";
import { request, isNotFound, toUserFacingError } from "./client";

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

function normalizeProfileResponse(profile: InfluencerProfileResponse): InfluencerProfileResponse {
  const normalizedAccounts: Partial<Record<Platform, PlatformAccount>> = {};
  for (const [platformKey, account] of Object.entries(profile.accounts ?? {})) {
    const normalized = normalizePlatform(platformKey);
    if (!normalized || !account) continue;
    normalizedAccounts[normalized] = account;
  }

  const normalizedPlatforms: InfluencerProfileResponse["platforms"] = {} as InfluencerProfileResponse["platforms"];
  for (const [platformKey, data] of Object.entries(profile.platforms ?? {})) {
    const normalized = normalizePlatform(platformKey);
    if (!normalized || !data) continue;
    normalizedPlatforms[normalized] = {
      ...data,
      posts: data.posts?.map((post) => ({ ...post, platform: normalizePlatform(post.platform) ?? normalized })) ?? data.posts,
    };
  }

  const normalizedPosts = profile.posts
    ? profile.posts
        .map((post) => {
          const normalized = normalizePlatform(post.platform) ?? null;
          if (!normalized) return null;
          return { ...post, platform: normalized };
        })
        .filter((post): post is PostSummary => post !== null)
    : undefined;

  return {
    ...profile,
    accounts: normalizedAccounts,
    platforms: normalizedPlatforms,
    posts: normalizedPosts,
  };
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
  const path = `/influencers/profile?${params.toString()}`;

  try {
    const response = await request<InfluencerProfileResponse>(path);
    return normalizeProfileResponse(response);
  } catch (error) {
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
  const path = `/platforms/${platform.toLowerCase()}/posts?${params.toString()}`;

  try {
    return await request<PostSummary[]>(path);
  } catch (error) {
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
  const path = `/platforms/${platform.toLowerCase()}/followers?${params.toString()}`;

  try {
    return await request<FollowersPoint[]>(path);
  } catch (error) {
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
  const path = `/platforms/${platform.toLowerCase()}/engagement?${params.toString()}`;

  try {
    return await request<Record<string, number>>(path);
  } catch (error) {
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
  const path = `/platforms/${platform.toLowerCase()}/metrics?${params.toString()}`;

  try {
    return await request<PlatformMetrics>(path);
  } catch (error) {
    throw toUserFacingError(error, "Impossible de récupérer les métriques");
  }
}


import { Platform } from "@/lib/platforms";

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

const API_BASE_URL = (import.meta.env.VITE_SOCIAL_API_URL || "/api/social") as string;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
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
    throw new Error(message);
  }

  return response.json() as Promise<T>;
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

  return request<InfluencerProfileResponse>(`/influencers/profile?${params.toString()}`);
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
  return request<PostSummary[]>(`/platforms/${platform.toLowerCase()}/posts?${params.toString()}`);
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
  return request<FollowersPoint[]>(`/platforms/${platform.toLowerCase()}/followers?${params.toString()}`);
}

export async function fetchEngagementBreakdown({
  platform,
  handle,
}: {
  platform: Platform;
  handle: string;
}): Promise<Record<string, number>> {
  const params = new URLSearchParams({ handle });
  return request<Record<string, number>>(`/platforms/${platform.toLowerCase()}/engagement?${params.toString()}`);
}

export async function fetchPlatformMetrics({
  platform,
  handle,
}: {
  platform: Platform;
  handle: string;
}): Promise<PlatformMetrics> {
  const params = new URLSearchParams({ handle });
  return request<PlatformMetrics>(`/platforms/${platform.toLowerCase()}/metrics?${params.toString()}`);
}

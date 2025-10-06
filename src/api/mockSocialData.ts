import mockData from "@/data/mockSocialData.json";
import { Platform, isPlatform, normalizePlatform } from "@/lib/platforms";
import type { InfluencerSearchResult } from "./influencerSearch";
import type {
  FollowersPoint,
  InfluencerProfileResponse,
  PlatformMetrics,
  PostSummary,
  PlatformAccount,
} from "./socialMetrics";

interface MockInfluencerRecord {
  id: string;
  displayName: string;
  location?: string;
  topics?: string[];
  verified?: boolean;
  profile: InfluencerProfileResponse;
}

interface SearchIndexEntry extends InfluencerSearchResult {
  normalizedHandle: string;
}

function sanitizeHandle(handle: string | undefined): string {
  return (handle ?? "").replace(/^@+/, "").toLowerCase();
}

function ensureArrayCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeAccounts(accounts: Record<string, PlatformAccount> | undefined) {
  const normalized: Partial<Record<Platform, PlatformAccount>> = {};
  if (!accounts) return normalized;
  for (const [platformKey, account] of Object.entries(accounts)) {
    const normalizedPlatform = normalizePlatform(platformKey);
    if (!normalizedPlatform || !account) continue;
    normalized[normalizedPlatform] = account as PlatformAccount;
  }
  return normalized;
}

function normalizePosts(posts: unknown, fallbackPlatform?: Platform): PostSummary[] | undefined {
  if (!Array.isArray(posts)) return undefined;
  const normalized = posts
    .map((post) => {
      if (typeof post !== "object" || post === null) return null;
      const raw = post as Record<string, unknown>;
      const platform = normalizePlatform((raw.platform as string | undefined) ?? fallbackPlatform);
      if (!platform) return null;
      return {
        ...(raw as unknown as PostSummary),
        platform,
      } as PostSummary;
    })
    .filter((value): value is PostSummary => value !== null);
  return normalized.length ? normalized : undefined;
}

function normalizePlatforms(platformsInput: Record<string, unknown> | undefined) {
  const normalized: InfluencerProfileResponse["platforms"] = {} as InfluencerProfileResponse["platforms"];
  if (!platformsInput) return normalized;
  for (const [platformKey, value] of Object.entries(platformsInput)) {
    const normalizedPlatform = normalizePlatform(platformKey);
    if (!normalizedPlatform) continue;
    const platformData = value as InfluencerProfileResponse["platforms"][Platform];
    if (!platformData) continue;
    const posts = normalizePosts(platformData.posts, normalizedPlatform);
    normalized[normalizedPlatform] = {
      ...platformData,
      posts,
    };
  }
  return normalized;
}

const influencers: MockInfluencerRecord[] = mockData.influencers.map((item) => ({
  id: item.id,
  displayName: item.displayName,
  location: item.location,
  topics: item.topics,
  verified: item.verified,
  profile: {
    displayName: item.displayName,
    accounts: normalizeAccounts(item.accounts as Record<string, PlatformAccount> | undefined),
    summary: item.summary,
    platforms: normalizePlatforms(item.platforms as Record<string, unknown> | undefined),
    posts: normalizePosts(item.posts, undefined),
  },
}));

const profileIndex = new Map<string, MockInfluencerRecord>();
const searchIndex: SearchIndexEntry[] = [];

influencers.forEach((record) => {
  const accounts = record.profile.accounts ?? {};
  for (const [platformKey, account] of Object.entries(accounts)) {
    if (!isPlatform(platformKey) || !account?.handle) continue;
    const normalizedHandle = sanitizeHandle(account.handle);
    const indexKey = `${platformKey}:${normalizedHandle}`;
    profileIndex.set(indexKey, record);

    const metrics = record.profile.platforms?.[platformKey as Platform]?.metrics;
    const followers = metrics?.followers ?? 0;
    const engagementRate = metrics?.avgEngagement ?? 0;

    searchIndex.push({
      id: `${platformKey}:${normalizedHandle}`,
      platform: platformKey as Platform,
      handle: account.handle.startsWith("@") ? account.handle : `@${account.handle}`,
      displayName: record.displayName,
      followers,
      engagementRate: Math.round(engagementRate * 10) / 10,
      location: record.location,
      topics: record.topics,
      verified: record.verified,
      normalizedHandle,
    });
  }
});

export function mockSearchInfluencers({
  platform,
  query,
  limit,
}: {
  platform?: Platform;
  query: string;
  limit: number;
}): InfluencerSearchResult[] {
  const normalizedQuery = query.toLowerCase();
  const results = searchIndex
    .filter((entry) => {
      if (platform && entry.platform !== platform) return false;
      if (!normalizedQuery) return true;
      const nameMatch = entry.displayName.toLowerCase().includes(normalizedQuery);
      const handleMatch = entry.normalizedHandle.includes(normalizedQuery.replace(/^@+/, ""));
      const locationMatch = entry.location?.toLowerCase().includes(normalizedQuery);
      const topicMatch = entry.topics?.some((topic) => topic.toLowerCase().includes(normalizedQuery));
      return nameMatch || handleMatch || locationMatch || topicMatch;
    })
    .sort((a, b) => b.followers - a.followers)
    .slice(0, limit)
    .map(({ normalizedHandle: _ignored, ...rest }) => rest);

  return ensureArrayCopy(results);
}

function getProfileRecord(platform: Platform, handle: string): MockInfluencerRecord | undefined {
  const normalizedHandle = sanitizeHandle(handle);
  const key = `${platform}:${normalizedHandle}`;
  return profileIndex.get(key);
}

export function mockFetchInfluencerProfile({
  platform,
  handle,
}: {
  platform: Platform;
  handle: string;
}): InfluencerProfileResponse | null {
  const record = getProfileRecord(platform, handle);
  if (!record) return null;
  return ensureArrayCopy(record.profile);
}

export function mockFetchPlatformPosts({
  platform,
  handle,
  limit,
}: {
  platform: Platform;
  handle: string;
  limit?: number;
}): PostSummary[] {
  const record = getProfileRecord(platform, handle);
  if (!record) return [];
  const posts = record.profile.platforms?.[platform]?.posts ?? [];
  const slice = typeof limit === "number" ? posts.slice(0, limit) : posts;
  return ensureArrayCopy(slice);
}

export function mockFetchFollowersHistory({
  platform,
  handle,
  weeks,
}: {
  platform: Platform;
  handle: string;
  weeks?: number;
}): FollowersPoint[] {
  const record = getProfileRecord(platform, handle);
  if (!record) return [];
  const points = record.profile.platforms?.[platform]?.followersSeries ?? [];
  const slice = typeof weeks === "number" ? points.slice(-weeks) : points;
  return ensureArrayCopy(slice);
}

export function mockFetchEngagementBreakdown({
  platform,
  handle,
}: {
  platform: Platform;
  handle: string;
}): Record<string, number> {
  const record = getProfileRecord(platform, handle);
  if (!record) return {};
  const breakdown = record.profile.platforms?.[platform]?.engagementByFormat ?? {};
  return ensureArrayCopy(breakdown);
}

export function mockFetchPlatformMetrics({
  platform,
  handle,
}: {
  platform: Platform;
  handle: string;
}): PlatformMetrics | null {
  const record = getProfileRecord(platform, handle);
  if (!record) return null;
  const metrics = record.profile.platforms?.[platform]?.metrics;
  return metrics ? ensureArrayCopy(metrics) : null;
}


import { createServer } from "node:http";
import { URL } from "node:url";
import data from "../src/data/mockSocialData.json" assert { type: "json" };

const port = Number(process.env.PORT || 3030);
const host = process.env.HOST || "0.0.0.0";

function sanitizeHandle(handle) {
  return (handle ?? "").replace(/^@+/, "").toLowerCase();
}

const platformLabels = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
  youtube: "YouTube",
};

const platformIds = Object.keys(platformLabels);

function normalizePlatformKey(platform) {
  if (!platform) return null;
  const lower = String(platform).trim().toLowerCase();
  if (lower === "twitter") return "x";
  if (lower === "ig") return "instagram";
  if (lower === "fb") return "facebook";
  if (lower === "yt") return "youtube";
  if (platformIds.includes(lower)) return lower;
  const match = platformIds.find((id) => platformLabels[id].toLowerCase() === lower);
  return match || null;
}

function cloneValue(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeAccounts(accounts) {
  const normalized = {};
  if (!accounts) return normalized;
  for (const [platformKey, account] of Object.entries(accounts)) {
    const normalizedPlatform = normalizePlatformKey(platformKey);
    if (!normalizedPlatform || !account) continue;
    normalized[normalizedPlatform] = cloneValue(account);
  }
  return normalized;
}

function normalizePosts(posts, fallbackPlatform) {
  if (!Array.isArray(posts)) return undefined;
  const normalized = posts
    .map((post) => {
      if (!post) return null;
      const platform = normalizePlatformKey(post.platform || fallbackPlatform);
      if (!platform) return null;
      return { ...cloneValue(post), platform };
    })
    .filter((post) => post !== null);
  return normalized.length ? normalized : undefined;
}

function normalizePlatforms(platformsInput) {
  const normalized = {};
  if (!platformsInput) return normalized;
  for (const [platformKey, platformData] of Object.entries(platformsInput)) {
    const normalizedPlatform = normalizePlatformKey(platformKey);
    if (!normalizedPlatform || !platformData) continue;
    const clone = cloneValue(platformData) || {};
    if (Array.isArray(clone.posts)) {
      const posts = normalizePosts(clone.posts, normalizedPlatform);
      clone.posts = posts ?? [];
    }
    normalized[normalizedPlatform] = clone;
  }
  return normalized;
}

function normalizeInfluencer(influencer) {
  return {
    id: influencer.id,
    displayName: influencer.displayName,
    location: influencer.location,
    topics: influencer.topics,
    verified: influencer.verified,
    profile: {
      displayName: influencer.displayName,
      accounts: normalizeAccounts(influencer.accounts),
      summary: cloneValue(influencer.summary) || { growthSeries: [], engagementByFormat: {} },
      platforms: normalizePlatforms(influencer.platforms),
      posts: normalizePosts(influencer.posts),
    },
  };
}

const profileIndex = new Map();
const searchIndex = [];

for (const influencer of data.influencers) {
  const record = normalizeInfluencer(influencer);
  const accounts = record.profile.accounts || {};
  for (const [platformId, account] of Object.entries(accounts)) {
    if (!account?.handle) continue;
    const normalizedHandle = sanitizeHandle(account.handle);
    const key = `${platformId}:${normalizedHandle}`;
    profileIndex.set(key, record);

    const metrics = record.profile.platforms?.[platformId]?.metrics;
    const engagementRate = metrics?.avgEngagement ?? 0;
    searchIndex.push({
      id: key,
      platform: platformId,
      handle: account.handle.startsWith("@") ? account.handle : `@${account.handle}`,
      displayName: record.displayName,
      followers: metrics?.followers ?? 0,
      engagementRate: Math.round(Number(engagementRate) * 10) / 10,
      location: record.location,
      topics: record.topics,
      verified: record.verified,
      normalizedHandle,
    });
  }
}

function json(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function notFound(res, message = "Not found") {
  json(res, 404, { error: message });
}

function toFollowersPoints(series = []) {
  return series.map((point) => ({ period: point.period, followers: point.followers }));
}

const server = createServer((req, res) => {
  if (!req.url) {
    notFound(res);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || `localhost:${port}`}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/search/influencers") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const platformParam = normalizePlatformKey(url.searchParams.get("platform"));
    const limit = Number(url.searchParams.get("limit") || 8);

    const results = searchIndex
      .filter((entry) => {
        if (platformParam && entry.platform !== platformParam) return false;
        if (!q) return true;
        const nameMatch = entry.displayName.toLowerCase().includes(q);
        const handleMatch = entry.normalizedHandle.includes(q.replace(/^@+/, ""));
        const locationMatch = entry.location?.toLowerCase().includes(q);
        const topicMatch = entry.topics?.some((topic) => topic.toLowerCase().includes(q));
        return nameMatch || handleMatch || locationMatch || topicMatch;
      })
      .sort((a, b) => b.followers - a.followers)
      .slice(0, limit)
      .map(({ normalizedHandle, ...rest }) => rest);

    json(res, 200, { results });
    return;
  }

  if (req.method === "GET" && pathname === "/influencers/profile") {
    const platformParam = normalizePlatformKey(url.searchParams.get("platform"));
    const handle = url.searchParams.get("handle");
    if (!platformParam || !handle) {
      json(res, 400, { error: "platform and handle are required" });
      return;
    }
    const key = `${platformParam}:${sanitizeHandle(handle)}`;
    const influencer = profileIndex.get(key);
    if (!influencer) {
      notFound(res, `No mock profile for ${handle} on ${platformParam}`);
      return;
    }

    json(res, 200, cloneValue(influencer.profile));
    return;
  }

  const platformMatch = pathname.match(/^\/platforms\/([^/]+)\/(posts|followers|engagement|metrics)$/);
  if (req.method === "GET" && platformMatch) {
    const [, platform, type] = platformMatch;
    const normalizedPlatform = normalizePlatformKey(platform);
    const handle = url.searchParams.get("handle");
    if (!normalizedPlatform || !handle) {
      json(res, 400, { error: "handle is required" });
      return;
    }
    const key = `${normalizedPlatform}:${sanitizeHandle(handle)}`;
    const influencer = profileIndex.get(key);
    if (!influencer) {
      notFound(res, `No mock profile for ${handle} on ${normalizedPlatform}`);
      return;
    }

    const platformData = influencer.profile.platforms?.[normalizedPlatform];
    if (!platformData) {
      notFound(res, `No platform data for ${normalizedPlatform}`);
      return;
    }

    if (type === "posts") {
      const limit = Number(url.searchParams.get("limit") || 50);
      const posts = Array.isArray(platformData.posts) ? platformData.posts.slice(0, limit) : [];
      json(res, 200, posts);
      return;
    }

    if (type === "followers") {
      const weeks = Number(url.searchParams.get("weeks") || 0);
      const series = Array.isArray(platformData.followersSeries) ? [...platformData.followersSeries] : [];
      const points = weeks > 0 ? series.slice(-weeks) : series;
      json(res, 200, toFollowersPoints(points));
      return;
    }

    if (type === "engagement") {
      json(res, 200, platformData.engagementByFormat || {});
      return;
    }

    if (type === "metrics") {
      json(res, 200, platformData.metrics || {});
      return;
    }
  }

  notFound(res);
});

server.listen(port, host, () => {
  console.log(`Mock social API running on http://${host}:${port}`);
});


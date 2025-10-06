import { createServer } from "node:http";
import { URL } from "node:url";
import data from "../src/data/mockSocialData.json" assert { type: "json" };

const port = Number(process.env.PORT || 3030);
const host = process.env.HOST || "0.0.0.0";

function sanitizeHandle(handle) {
  return (handle ?? "").replace(/^@+/, "").toLowerCase();
}

const profileIndex = new Map();
const searchIndex = [];

for (const influencer of data.influencers) {
  const accounts = influencer.accounts || {};
  for (const [platform, account] of Object.entries(accounts)) {
    if (!account?.handle) continue;
    const normalizedHandle = sanitizeHandle(account.handle);
    const key = `${platform}:${normalizedHandle}`;
    profileIndex.set(key, influencer);

    const metrics = influencer.platforms?.[platform]?.metrics;
    searchIndex.push({
      id: key,
      platform,
      handle: account.handle.startsWith("@") ? account.handle : `@${account.handle}`,
      displayName: influencer.displayName,
      followers: metrics?.followers ?? 0,
      engagementRate: metrics?.avgEngagement ?? 0,
      location: influencer.location,
      topics: influencer.topics,
      verified: influencer.verified,
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
    const platform = url.searchParams.get("platform") || undefined;
    const limit = Number(url.searchParams.get("limit") || 8);

    const results = searchIndex
      .filter((entry) => {
        if (platform && entry.platform !== platform) return false;
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
    const platform = url.searchParams.get("platform");
    const handle = url.searchParams.get("handle");
    if (!platform || !handle) {
      json(res, 400, { error: "platform and handle are required" });
      return;
    }
    const key = `${platform}:${sanitizeHandle(handle)}`;
    const influencer = profileIndex.get(key);
    if (!influencer) {
      notFound(res, `No mock profile for ${handle} on ${platform}`);
      return;
    }

    const profile = {
      displayName: influencer.displayName,
      accounts: influencer.accounts,
      summary: influencer.summary,
      platforms: influencer.platforms,
      posts: influencer.posts,
    };

    json(res, 200, profile);
    return;
  }

  const platformMatch = pathname.match(/^\/platforms\/([^/]+)\/(posts|followers|engagement|metrics)$/);
  if (req.method === "GET" && platformMatch) {
    const [, platform, type] = platformMatch;
    const handle = url.searchParams.get("handle");
    if (!handle) {
      json(res, 400, { error: "handle is required" });
      return;
    }
    const key = `${platform}:${sanitizeHandle(handle)}`;
    const influencer = profileIndex.get(key);
    if (!influencer) {
      notFound(res, `No mock profile for ${handle} on ${platform}`);
      return;
    }

    const platformData = influencer.platforms?.[platform];
    if (!platformData) {
      notFound(res, `No platform data for ${platform}`);
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


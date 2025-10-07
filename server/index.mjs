import { createReadStream, existsSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const mockData = JSON.parse(readFileSync(new URL("../src/data/mockSocialData.json", import.meta.url), "utf8"));

const ENV_FILES = [
  ".env.server.local",
  ".env.server",
  ".env.production.local",
  ".env.production",
  ".env.local",
  ".env",
];

function loadEnvFiles() {
  for (const filename of ENV_FILES) {
    const filePath = path.resolve(process.cwd(), filename);
    if (!existsSync(filePath)) continue;
    try {
      const content = readFileSync(filePath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        if (!key) continue;
        if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;
        const rawValue = trimmed.slice(eqIndex + 1).trim();
        const unquoted = rawValue.replace(/^['"]|['"]$/g, "");
        process.env[key] = unquoted;
      }
    } catch (error) {
      console.warn(`[server] Unable to read env file ${filename}`, error);
    }
  }
}

loadEnvFiles();

const port = Number(process.env.PORT || process.env.SERVER_PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const socialProxyTarget = process.env.SOCIAL_PROXY_TARGET || process.env.SOCIAL_API_TARGET || "";

const distDir = path.resolve(process.cwd(), "dist");
const fallbackHtmlPath = path.join(distDir, "index.html");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

const platformLabels = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
  youtube: "YouTube",
};

const platformIds = Object.keys(platformLabels);

function log(message, extra) {
  const base = `[server] ${message}`;
  if (extra) {
    console.log(base, extra);
  } else {
    console.log(base);
  }
}

function sanitizeHandle(handle = "") {
  return handle.trim().replace(/^@+/, "").toLowerCase();
}

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
      const normalizedPost = {
        ...cloneValue(post),
        platform,
      };
      if (normalizedPost.handle && typeof normalizedPost.handle === "string") {
        normalizedPost.handle = normalizedPost.handle.startsWith("@")
          ? normalizedPost.handle
          : `@${sanitizeHandle(normalizedPost.handle)}`;
      }
      return normalizedPost;
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

const profileIndex = new Map();
const searchIndex = [];

for (const influencer of mockData.influencers || []) {
  const record = {
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

  const accounts = record.profile.accounts || {};
  for (const [platformId, account] of Object.entries(accounts)) {
    if (!account?.handle) continue;
    const normalizedHandle = sanitizeHandle(account.handle);
    const key = `${platformId}:${normalizedHandle}`;
    profileIndex.set(key, record);

    const metrics = record.profile.platforms?.[platformId]?.metrics;
    const followers = metrics?.followers ?? 0;
    const engagementRate = metrics?.avgEngagement ?? 0;

    searchIndex.push({
      id: key,
      platform: platformId,
      handle: account.handle.startsWith("@") ? account.handle : `@${account.handle}`,
      displayName: record.displayName,
      followers,
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
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function notFound(res, message = "Not found") {
  json(res, 404, { error: message });
}

function toFollowersPoints(series = []) {
  return series.map((point) => ({ period: point.period, followers: point.followers }));
}

function mockSearch({ platform, query, limit }) {
  const normalizedQuery = (query || "").toLowerCase();
  return searchIndex
    .filter((entry) => {
      if (platform && entry.platform !== platform) return false;
      if (!normalizedQuery) return true;
      const nameMatch = entry.displayName?.toLowerCase().includes(normalizedQuery);
      const handleMatch = entry.normalizedHandle.includes(normalizedQuery.replace(/^@+/, ""));
      const locationMatch = entry.location?.toLowerCase().includes(normalizedQuery);
      const topicMatch = entry.topics?.some((topic) => topic.toLowerCase().includes(normalizedQuery));
      return nameMatch || handleMatch || locationMatch || topicMatch;
    })
    .sort((a, b) => b.followers - a.followers)
    .slice(0, limit)
    .map(({ normalizedHandle, ...rest }) => rest);
}

function getProfileRecord(platform, handle) {
  const key = `${platform}:${sanitizeHandle(handle)}`;
  return profileIndex.get(key);
}

function buildMockProfile(platform, handle) {
  const record = getProfileRecord(platform, handle);
  if (!record) return null;
  return cloneValue(record.profile);
}

function buildMockPosts(platform, handle, limit) {
  const record = getProfileRecord(platform, handle);
  if (!record) return [];
  const posts = record.profile.platforms?.[platform]?.posts ?? [];
  const slice = typeof limit === "number" ? posts.slice(0, limit) : posts;
  return cloneValue(slice);
}

function buildMockFollowers(platform, handle, weeks) {
  const record = getProfileRecord(platform, handle);
  if (!record) return [];
  const points = record.profile.platforms?.[platform]?.followersSeries ?? [];
  const slice = typeof weeks === "number" ? points.slice(-weeks) : points;
  return cloneValue(slice);
}

function buildMockEngagement(platform, handle) {
  const record = getProfileRecord(platform, handle);
  if (!record) return {};
  const engagement = record.profile.platforms?.[platform]?.engagementByFormat ?? {};
  return cloneValue(engagement);
}

function buildMockMetrics(platform, handle) {
  const record = getProfileRecord(platform, handle);
  if (!record) return null;
  const metrics = record.profile.platforms?.[platform]?.metrics;
  return metrics ? cloneValue(metrics) : null;
}

async function proxyApiRequest(req, res, url) {
  if (!socialProxyTarget) {
    return false;
  }
  const base = socialProxyTarget.endsWith("/") ? socialProxyTarget.slice(0, -1) : socialProxyTarget;
  const relativePath = url.pathname.replace(/^\/api\/social/, "");
  const upstreamUrl = new URL(relativePath || "/", base);
  upstreamUrl.search = url.searchParams.toString();

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        "Content-Type": req.headers["content-type"] || "application/json",
      },
    });

    const text = await upstreamResponse.text();
    res.writeHead(upstreamResponse.status, {
      "Content-Type": upstreamResponse.headers.get("content-type") || "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(text);
    return true;
  } catch (error) {
    json(res, 502, { error: error?.message || "Upstream request failed" });
    return true;
  }
}

async function handleApi(req, res, url) {
  if (await proxyApiRequest(req, res, url)) {
    return;
  }

  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  if (url.pathname === "/api/social/search/influencers") {
    const q = url.searchParams.get("q") || "";
    const platformParam = normalizePlatformKey(url.searchParams.get("platform"));
    const limit = Number(url.searchParams.get("limit") || 8);
    const results = mockSearch({ platform: platformParam, query: q, limit });
    json(res, 200, { results });
    return;
  }

  if (url.pathname === "/api/social/influencers/profile") {
    const platformParam = normalizePlatformKey(url.searchParams.get("platform"));
    const handle = url.searchParams.get("handle");
    if (!platformParam || !handle) {
      json(res, 400, { error: "platform and handle are required" });
      return;
    }
    const profile = buildMockProfile(platformParam, handle);
    if (!profile) {
      notFound(res, `No mock profile for ${handle} on ${platformParam}`);
      return;
    }
    json(res, 200, profile);
    return;
  }

  const platformMatch = url.pathname.match(/^\/api\/social\/platforms\/([^/]+)\/(posts|followers|engagement|metrics)$/);
  if (platformMatch) {
    const [, rawPlatform, type] = platformMatch;
    const normalizedPlatform = normalizePlatformKey(rawPlatform);
    const handle = url.searchParams.get("handle");
    if (!normalizedPlatform || !handle) {
      json(res, 400, { error: "handle is required" });
      return;
    }

    if (type === "posts") {
      const limit = Number(url.searchParams.get("limit") || 50);
      json(res, 200, buildMockPosts(normalizedPlatform, handle, limit));
      return;
    }

    if (type === "followers") {
      const weeks = Number(url.searchParams.get("weeks") || 12);
      json(res, 200, toFollowersPoints(buildMockFollowers(normalizedPlatform, handle, weeks)));
      return;
    }

    if (type === "engagement") {
      json(res, 200, buildMockEngagement(normalizedPlatform, handle));
      return;
    }

    if (type === "metrics") {
      const metrics = buildMockMetrics(normalizedPlatform, handle);
      if (!metrics) {
        notFound(res, `Metrics unavailable for ${handle} on ${normalizedPlatform}`);
        return;
      }
      json(res, 200, metrics);
      return;
    }
  }

  notFound(res);
}

async function serveStatic(req, res, url) {
  try {
    let pathname = url.pathname;
    if (!pathname || pathname === "/") {
      pathname = "/index.html";
    }
    const decodedPath = decodeURIComponent(pathname);
    const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.(?:\/|\\|$))+/, "");
    let filePath = path.join(distDir, normalizedPath);

    let fileStat;
    try {
      fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = path.join(filePath, "index.html");
        fileStat = await stat(filePath);
      }
    } catch (error) {
      filePath = fallbackHtmlPath;
      fileStat = await stat(filePath);
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": fileStat.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    createReadStream(filePath).pipe(res);
  } catch (error) {
    if (fallbackHtmlPath) {
      try {
        const html = await readFile(fallbackHtmlPath, "utf8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      } catch (innerError) {
        log("Failed to serve fallback HTML", innerError);
      }
    }
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400).end("Bad Request");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);

    if (url.pathname.startsWith("/api/social")) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    log("Unhandled error", error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

server.listen(port, host, () => {
  log(`Server listening on http://${host}:${port}`);
  if (socialProxyTarget) {
    log(`Proxying social API requests to ${socialProxyTarget}`);
  } else {
    log("Serving mock social API from embedded dataset");
  }
});

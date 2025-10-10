import { createReadStream, existsSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

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
const defaultProxyTarget = process.env.SOCIAL_PROXY_TARGET || process.env.SOCIAL_API_TARGET || "";

const instagramSessionId =
  process.env.INSTAGRAM_SESSIONID || process.env.INSTAGRAM_SESSION_ID || process.env.IG_SESSIONID || "";
const instagramCookie = process.env.INSTAGRAM_COOKIE || "";
const instagramUserAgent =
  process.env.INSTAGRAM_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const instagramAppId = process.env.INSTAGRAM_APP_ID || "936619743392459";
const instagramCacheMs = Math.max(0, Number(process.env.INSTAGRAM_CACHE_SECONDS || 300)) * 1000;

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

const platformProxyTargets = new Map();
for (const platformId of platformIds) {
  const envKey = `SOCIAL_PROXY_TARGET_${platformId.toUpperCase()}`;
  const altKey = `SOCIAL_API_TARGET_${platformId.toUpperCase()}`;
  const value = process.env[envKey] || process.env[altKey];
  if (typeof value === "string" && value.trim()) {
    platformProxyTargets.set(platformId, value.trim());
  }
}

const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || "";
const xBearerToken =
  process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || process.env.TWITTER_API_TOKEN || "";
const facebookAppId = process.env.FB_APP_ID || process.env.FACEBOOK_APP_ID || "";
const facebookAppSecret = process.env.FB_APP_SECRET || process.env.FACEBOOK_APP_SECRET || "";
const facebookAccessToken = process.env.FACEBOOK_ACCESS_TOKEN || "";

const DEFAULT_FEDERATED_PLATFORMS = ["youtube", "x", "facebook"];

function buildInstagramCookieHeader() {
  const cookies = [];
  if (instagramCookie) {
    cookies.push(instagramCookie.trim());
  }
  if (instagramSessionId) {
    const hasAssignment = /sessionid\s*=/.test(instagramSessionId);
    cookies.push(hasAssignment ? instagramSessionId.trim() : `sessionid=${instagramSessionId.trim()}`);
  }
  return cookies.length ? cookies.join("; ") : "";
}

const instagramBaseHeaders = {
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
  "User-Agent": instagramUserAgent,
  Referer: "https://www.instagram.com/",
  "X-Requested-With": "XMLHttpRequest",
  "X-IG-App-ID": instagramAppId,
};

const instagramCookieHeader = buildInstagramCookieHeader();

const instagramProfileCache = new Map();
const instagramSearchCache = new Map();

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

function getInstagramHeaders() {
  const headers = { ...instagramBaseHeaders };
  if (instagramCookieHeader) {
    headers.Cookie = instagramCookieHeader;
  }
  return headers;
}

function getCachedValue(cache, key) {
  if (!instagramCacheMs) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > instagramCacheMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedValue(cache, key, value) {
  if (!instagramCacheMs) return;
  cache.set(key, { timestamp: Date.now(), value });
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

function handleInstagramError(res, error) {
  const status = typeof error?.status === "number" ? error.status : 502;
  const message = error?.message || "Instagram request failed";
  json(res, status, { error: message });
}

function resolveFacebookToken() {
  if (facebookAccessToken) {
    return facebookAccessToken;
  }
  if (facebookAppId && facebookAppSecret) {
    return `${facebookAppId}|${facebookAppSecret}`;
  }
  return "";
}

function normalizePlatformsQuery(input) {
  if (!input) return [];
  return input
    .split(/[,\s]+/)
    .map((value) => normalizePlatformKey(value))
    .filter((value) => value !== null);
}

function normalizeLimit(value, fallback = 10) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.min(Math.round(numeric), 25);
  }
  return fallback;
}

function parseFollowers(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.round(numeric);
}

function ensureHandle(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed.replace(/^@+/, "")}`;
}

function buildResult({
  platform,
  id,
  name,
  handle,
  avatar,
  profileUrl,
  followers,
  verified,
  note,
}) {
  return {
    platform,
    id: id || `${platform}:${Date.now()}`,
    name: name || handle || platformLabels[platform] || "Profil",
    handle: ensureHandle(handle),
    avatar: avatar || null,
    profileUrl: profileUrl || null,
    followers: followers !== undefined ? parseFollowers(followers) : null,
    verified: typeof verified === "boolean" ? verified : undefined,
    note: note || undefined,
  };
}

async function fetchJsonResponse(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let jsonData = null;
  if (text) {
    try {
      jsonData = JSON.parse(text);
    } catch (error) {
      const snippet = text.replace(/\s+/g, " ").slice(0, 160);
      const message = `Réponse JSON invalide (${url}): ${snippet}`;
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }
  }
  if (!response.ok) {
    const message = jsonData?.error?.message || jsonData?.error || text || `Requête échouée (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }
  return jsonData;
}

async function searchYouTubeChannels(query, limit) {
  if (!youtubeApiKey) {
    throw new Error("Ajoutez YOUTUBE_API_KEY dans votre .env pour activer la recherche YouTube.");
  }
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "id");
  searchUrl.searchParams.set("type", "channel");
  searchUrl.searchParams.set("maxResults", String(Math.min(limit, 20)));
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", youtubeApiKey);

  const searchData = await fetchJsonResponse(searchUrl);
  const channelIds = Array.isArray(searchData?.items)
    ? searchData.items
        .map((item) => item?.id?.channelId)
        .filter((value) => typeof value === "string" && value.trim())
    : [];
  if (!channelIds.length) {
    return [];
  }

  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  detailsUrl.searchParams.set("part", "snippet,statistics");
  detailsUrl.searchParams.set("id", channelIds.join(","));
  detailsUrl.searchParams.set("maxResults", String(Math.min(limit, 20)));
  detailsUrl.searchParams.set("key", youtubeApiKey);

  const detailsData = await fetchJsonResponse(detailsUrl);
  const items = Array.isArray(detailsData?.items) ? detailsData.items : [];
  return items.slice(0, limit).map((channel) => {
    const snippet = channel?.snippet || {};
    const statistics = channel?.statistics || {};
    const thumbnails = snippet?.thumbnails || {};
    const avatar = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || null;
    const customUrl = snippet?.customUrl || snippet?.vanityUrl;
    const handle = customUrl ? ensureHandle(customUrl) : null;
    const normalizedCustomUrl = typeof customUrl === "string" ? customUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "") : "";
    const profileUrl = normalizedCustomUrl
      ? `https://www.youtube.com/${normalizedCustomUrl.replace(/^\//, "")}`
      : channel?.id
        ? `https://www.youtube.com/channel/${channel.id}`
        : null;
    return buildResult({
      platform: "youtube",
      id: channel?.id,
      name: snippet?.title,
      handle,
      avatar,
      profileUrl,
      followers: statistics?.subscriberCount,
      verified: undefined,
    });
  });
}

async function searchXUsers(query, limit) {
  if (!xBearerToken) {
    throw new Error("Ajoutez X_BEARER_TOKEN (ou TWITTER_BEARER_TOKEN) dans votre .env pour activer la recherche X/Twitter.");
  }
  const url = new URL("https://api.twitter.com/1.1/users/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(limit, 20)));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${xBearerToken}`,
    },
  });
  const text = await response.text();
  let data = [];
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      const snippet = text.replace(/\s+/g, " ").slice(0, 160);
      throw new Error(`Réponse X invalide : ${snippet}`);
    }
  }
  if (!response.ok) {
    const message = Array.isArray(data?.errors) && data.errors.length ? data.errors[0]?.message : null;
    throw new Error(message || `X a renvoyé le statut ${response.status}`);
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data.slice(0, limit).map((user) => {
    const screenName = user?.screen_name;
    const handle = ensureHandle(screenName);
    const avatarUrl = typeof user?.profile_image_url_https === "string"
      ? user.profile_image_url_https.replace(/_normal(\.\w+)$/, "$1")
      : user?.profile_image_url_https || null;
    return buildResult({
      platform: "x",
      id: user?.id_str || String(user?.id || screenName || ""),
      name: user?.name,
      handle,
      avatar: avatarUrl,
      profileUrl: screenName ? `https://x.com/${screenName}` : null,
      followers: user?.followers_count,
      verified: Boolean(user?.verified),
    });
  });
}

async function searchFacebookPages(query, limit) {
  const token = resolveFacebookToken();
  if (!token) {
    throw new Error(
      "Ajoutez FB_APP_ID et FB_APP_SECRET ou bien FACEBOOK_ACCESS_TOKEN pour activer la recherche Facebook Pages.",
    );
  }
  const url = new URL("https://graph.facebook.com/v19.0/pages/search");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(limit, 25)));
  url.searchParams.set("access_token", token);
  url.searchParams.set("fields", "id,name,username,link,fan_count,followers_count,picture{url},verification_status,is_verified");

  const data = await fetchJsonResponse(url);
  const items = Array.isArray(data?.data) ? data.data : [];
  return items.slice(0, limit).map((page) => {
    const username = page?.username;
    const handle = ensureHandle(username);
    const followers = page?.followers_count ?? page?.fan_count;
    const pictureUrl = page?.picture?.data?.url || null;
    const verified =
      typeof page?.is_verified === "boolean"
        ? page.is_verified
        : typeof page?.verification_status === "string"
          ? /verified/i.test(page.verification_status)
          : undefined;
    return buildResult({
      platform: "facebook",
      id: page?.id,
      name: page?.name,
      handle,
      avatar: pictureUrl,
      profileUrl: page?.link || (page?.id ? `https://facebook.com/${page.id}` : null),
      followers,
      verified,
    });
  });
}

async function lookupInstagramByHandle(query) {
  if (!query.startsWith("@")) {
    throw new Error("Instagram nécessite un @handle exact (ex : @createur). Tapez le pseudo complet.");
  }
  const handle = sanitizeHandle(query);
  if (!handle) {
    throw new Error("Handle Instagram invalide.");
  }
  try {
    const snapshot = await fetchInstagramSnapshot(handle);
    const profile = snapshot?.profile || {};
    const accounts = profile?.accounts || {};
    const instagramAccount = accounts?.instagram || {};
    const followers = snapshot?.metrics?.followers ?? null;
    return [
      buildResult({
        platform: "instagram",
        id: instagramAccount?.externalId || `instagram:${handle}`,
        name: profile?.displayName || instagramAccount?.displayName || `@${handle}`,
        handle: instagramAccount?.handle || `@${handle}`,
        avatar: instagramAccount?.avatarUrl || null,
        profileUrl: `https://www.instagram.com/${handle}/`,
        followers,
        verified: instagramAccount?.verified,
      }),
    ];
  } catch (error) {
    if (typeof error?.status === "number" && error.status === 404) {
      throw new Error(`Aucun profil Instagram trouvé pour @${handle}.`);
    }
    throw new Error(error?.message || "Impossible d'interroger Instagram.");
  }
}

async function lookupTikTokByHandle(query) {
  if (!query.startsWith("@")) {
    throw new Error("TikTok nécessite un @handle exact (ex : @createur). Tapez le pseudo complet.");
  }
  const handle = sanitizeHandle(query);
  if (!handle) {
    throw new Error("Handle TikTok invalide.");
  }
  return [
    buildResult({
      platform: "tiktok",
      id: `tiktok:${handle}`,
      name: `@${handle}`,
      handle: `@${handle}`,
      avatar: null,
      profileUrl: `https://www.tiktok.com/@${handle}`,
      followers: null,
      note:
        "Connectez l'API officielle TikTok (Display API) ou un service tiers pour enrichir ce résultat après authentification.",
    }),
  ];
}

const federatedAdapters = {
  youtube: searchYouTubeChannels,
  x: searchXUsers,
  facebook: searchFacebookPages,
  instagram: lookupInstagramByHandle,
  tiktok: lookupTikTokByHandle,
};

function normalizeAdapterError(platform, error) {
  if (!error) return `Recherche ${platformLabels[platform] || platform} indisponible.`;
  if (typeof error === "string") return error;
  if (typeof error.message === "string" && error.message.trim()) return error.message.trim();
  return `Recherche ${platformLabels[platform] || platform} indisponible.`;
}

function respondConfigurationMissing(res, platform) {
  const label = platform ? platformLabels[platform] || platform : "Ce réseau";
  const envHint = platform ? `SOCIAL_PROXY_TARGET_${platform.toUpperCase()}` : "SOCIAL_PROXY_TARGET";
  json(res, 501, {
    error: `${label} n'est pas configuré pour cet environnement. Définissez ${envHint} (ou SOCIAL_PROXY_TARGET) afin de relayer vos APIs réelles.`,
  });
}

async function executePlatformSearch(platform, query, limit) {
  const adapter = federatedAdapters[platform];
  if (!adapter) {
    return {
      platform,
      results: [],
      error: {
        platform,
        message: `Aucun adaptateur disponible pour ${platformLabels[platform] || platform}.`,
      },
    };
  }
  try {
    const results = await adapter(query, limit);
    return { platform, results: Array.isArray(results) ? results : [] };
  } catch (error) {
    return {
      platform,
      results: [],
      error: {
        platform,
        message: normalizeAdapterError(platform, error),
      },
    };
  }
}

async function handleFederatedSearch(req, res, url) {
  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const rawQuery = url.searchParams.get("q") || "";
  const query = rawQuery.trim();
  if (!query) {
    json(res, 400, { error: "Paramètre 'q' requis" });
    return;
  }

  const limit = normalizeLimit(url.searchParams.get("limit"));
  const requestedPlatforms = normalizePlatformsQuery(url.searchParams.get("platforms"));
  const normalizedPlatforms = requestedPlatforms.length ? requestedPlatforms : DEFAULT_FEDERATED_PLATFORMS;
  const uniquePlatforms = Array.from(new Set(normalizedPlatforms.filter((platform) => platformIds.includes(platform))));
  if (!uniquePlatforms.length) {
    uniquePlatforms.push(...DEFAULT_FEDERATED_PLATFORMS);
  }

  const outcomes = await Promise.all(uniquePlatforms.map((platform) => executePlatformSearch(platform, query, limit)));

  const results = [];
  const errors = [];
  for (const outcome of outcomes) {
    if (Array.isArray(outcome.results) && outcome.results.length) {
      results.push(...outcome.results);
    }
    if (outcome.error) {
      errors.push({
        platform: outcome.error.platform,
        message: outcome.error.message,
      });
    }
  }

  json(res, 200, {
    q: query,
    platforms: uniquePlatforms,
    limit,
    results,
    errors: errors.length ? errors : undefined,
  });
}

function determineInstagramFormat(node) {
  if (!node) return "Post";
  const productType = node.product_type || "";
  const typename = node.__typename || "";
  if (productType.toLowerCase() === "clips") return "Reel";
  if (/igtv/i.test(productType) || /igtv/i.test(typename)) return "IGTV";
  if (/video/i.test(productType) || /video/i.test(typename)) return "Vidéo";
  if (/sidecar/i.test(typename)) return "Carrousel";
  if (/graphimage/i.test(typename)) return "Photo";
  return "Post";
}

function mapInstagramPost(node, username) {
  if (!node) return null;
  const takenAt = Number(node.taken_at_timestamp) * 1000;
  if (!Number.isFinite(takenAt) || takenAt <= 0) return null;
  const dateIso = new Date(takenAt).toISOString();
  const likeCount = node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? 0;
  const commentCount = node.edge_media_to_comment?.count ?? 0;
  const captionEdge = node.edge_media_to_caption?.edges?.[0]?.node?.text ?? "";
  const trimmedCaption = captionEdge.trim();
  const title = trimmedCaption ? trimmedCaption.slice(0, 140) : `Publication du ${new Date(takenAt).toLocaleDateString("fr-FR")}`;
  const shortcode = node.shortcode || node.code || "";
  const id = node.id || (shortcode ? `instagram:${shortcode}` : `instagram:${username}:${takenAt}`);
  const url = shortcode ? `https://www.instagram.com/p/${shortcode}/` : undefined;
  const format = determineInstagramFormat(node);
  return {
    summary: {
      id,
      platform: "instagram",
      title,
      likes: likeCount,
      comments: commentCount,
      date: dateIso,
      url,
    },
    format,
  };
}

async function fetchInstagramJson(url) {
  const response = await fetch(url, {
    headers: getInstagramHeaders(),
  });
  if (response.status === 429) {
    throw new Error("Instagram rate limit reached");
  }
  if (response.status === 404) {
    const error = new Error("Instagram profile not found");
    error.status = 404;
    throw error;
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const error = new Error(errorText || `Instagram responded with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function fetchInstagramSearchResults(query, limit) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const cacheKey = `${normalizedQuery.toLowerCase()}::${limit}`;
  const cached = getCachedValue(instagramSearchCache, cacheKey);
  if (cached) {
    return cached;
  }

  const searchUrl = new URL("https://www.instagram.com/web/search/topsearch/");
  searchUrl.searchParams.set("context", "blended");
  searchUrl.searchParams.set("query", normalizedQuery);
  searchUrl.searchParams.set("count", String(Math.min(Math.max(limit, 1), 30)));

  const data = await fetchInstagramJson(searchUrl);
  const users = Array.isArray(data?.users) ? data.users : [];

  const results = users
    .map((entry) => {
      const user = entry?.user;
      if (!user?.username) return null;
      const handle = `@${user.username}`;
      const followerCount = user.follower_count ?? user.search_follower_count ?? 0;
      return {
        id: `instagram:${user.pk || user.pk_id || user.username}`,
        platform: "instagram",
        handle,
        displayName: user.full_name || user.username,
        followers: followerCount,
        engagementRate: 0,
        location: user.city_name || user.city || undefined,
        topics: undefined,
        verified: Boolean(user.is_verified),
      };
    })
    .filter((result) => result !== null)
    .slice(0, limit);

  setCachedValue(instagramSearchCache, cacheKey, results);
  return results;
}

async function fetchInstagramSnapshot(handle) {
  const normalizedHandle = sanitizeHandle(handle);
  if (!normalizedHandle) {
    const error = new Error("Instagram handle is required");
    error.status = 400;
    throw error;
  }

  const cached = getCachedValue(instagramProfileCache, normalizedHandle);
  if (cached) {
    return cached;
  }

  const profileUrl = new URL("https://www.instagram.com/api/v1/users/web_profile_info/");
  profileUrl.searchParams.set("username", normalizedHandle);
  const data = await fetchInstagramJson(profileUrl);
  const user = data?.data?.user;
  if (!user) {
    const error = new Error("Profil Instagram introuvable");
    error.status = 404;
    throw error;
  }

  const username = user.username || normalizedHandle;
  const mappedPosts = Array.isArray(user.edge_owner_to_timeline_media?.edges)
    ? user.edge_owner_to_timeline_media.edges
        .map((edge) => mapInstagramPost(edge?.node, username))
        .filter((value) => value !== null)
    : [];

  const posts = mappedPosts.map((item) => item.summary);
  const totalInteractions = mappedPosts.reduce((sum, item) => sum + item.summary.likes + item.summary.comments, 0);
  const followers = user.edge_followed_by?.count ?? 0;
  const avgInteractions = posts.length ? totalInteractions / posts.length : 0;
  const avgEngagement = followers > 0 ? Math.round((avgInteractions / followers) * 1000) / 10 : 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const posts7d = posts.filter((post) => new Date(post.date).getTime() >= sevenDaysAgo).length;

  const engagementByFormat = mappedPosts.reduce((acc, item) => {
    const key = item.format || "Post";
    const score = item.summary.likes + item.summary.comments;
    acc[key] = (acc[key] || 0) + score;
    return acc;
  }, {});

  const growthSeries = Array.from({ length: 12 }, () => followers);
  const followersSeries = Array.from({ length: 12 }, (_, index) => {
    const weeksAgo = 11 - index;
    const date = new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
    return {
      period: date.toISOString().slice(0, 10),
      followers,
    };
  });

  const metrics = {
    followers,
    weeklyDelta: 0,
    avgEngagement,
    posts7d,
  };

  const profile = {
    displayName: user.full_name || username,
    accounts: {
      instagram: {
        handle: `@${username}`,
        displayName: user.full_name || username,
        externalId: String(user.id || user.pk || username),
      },
    },
    summary: {
      growthSeries,
      engagementByFormat,
    },
    platforms: {
      instagram: {
        metrics,
        followersSeries,
        engagementByFormat,
        posts,
      },
    },
    posts,
  };

  const snapshot = {
    profile,
    metrics,
    posts,
    followersSeries,
    engagementByFormat,
  };

  setCachedValue(instagramProfileCache, normalizedHandle, snapshot);
  return snapshot;
}

function normalizeProxyBase(value, req) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, "");
  }
  if (trimmed.startsWith("//")) {
    return `http:${trimmed}`.replace(/\/$/, "");
  }
  if (trimmed.startsWith("/")) {
    const origin = req.headers.host ? `http://${req.headers.host}` : `http://${host}:${port}`;
    return `${origin.replace(/\/$/, "")}${trimmed}`.replace(/\/$/, "");
  }
  return `http://${trimmed.replace(/\/$/, "")}`;
}

function joinProxyPath(base, relativePath) {
  if (!relativePath.startsWith("/")) {
    return base.endsWith("/") ? `${base}${relativePath}` : `${base}/${relativePath}`;
  }
  if (base.endsWith("/")) {
    return `${base.slice(0, -1)}${relativePath}`;
  }
  return `${base}${relativePath}`;
}

function detectPlatformFromUrl(url) {
  const platformPathMatch = url.pathname.match(/^\/api\/social\/platforms\/([^/]+)/);
  if (platformPathMatch) {
    return normalizePlatformKey(platformPathMatch[1]);
  }
  if (url.pathname === "/api/social/influencers/profile" || url.pathname === "/api/social/search/influencers") {
    return normalizePlatformKey(url.searchParams.get("platform"));
  }
  return null;
}

function resolveProxyTarget(req, url) {
  const platform = detectPlatformFromUrl(url);
  if (platform) {
    const specific = platformProxyTargets.get(platform);
    if (specific) {
      const normalized = normalizeProxyBase(specific, req);
      if (normalized) {
        return { base: normalized, platform };
      }
    }
  }
  if (defaultProxyTarget) {
    const normalized = normalizeProxyBase(defaultProxyTarget, req);
    if (normalized) {
      return { base: normalized, platform: platform || null };
    }
  }
  return null;
}

async function proxyApiRequest(req, res, url) {
  const target = resolveProxyTarget(req, url);
  if (!target) {
    return false;
  }

  const relativePath = url.pathname.replace(/^\/api\/social/, "") || "/";
  let upstreamUrl;
  try {
    upstreamUrl = new URL(joinProxyPath(target.base, relativePath));
  } catch (error) {
    json(res, 500, { error: "Invalid SOCIAL_PROXY_TARGET configuration" });
    return true;
  }
  const searchString = url.searchParams.toString();
  if (searchString) {
    upstreamUrl.search = searchString;
  }

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
    if (!platformParam) {
      json(res, 400, { error: "Paramètre 'platform' requis" });
      return;
    }
    if (platformParam !== "instagram") {
      respondConfigurationMissing(res, platformParam);
      return;
    }
    try {
      const instagramResults = await fetchInstagramSearchResults(q, limit);
      json(res, 200, { results: instagramResults });
    } catch (error) {
      handleInstagramError(res, error);
    }
    return;
  }

  if (url.pathname === "/api/social/influencers/profile") {
    const platformParam = normalizePlatformKey(url.searchParams.get("platform"));
    const handle = url.searchParams.get("handle");
    if (!platformParam || !handle) {
      json(res, 400, { error: "platform and handle are required" });
      return;
    }
    if (platformParam === "instagram") {
      try {
        const snapshot = await fetchInstagramSnapshot(handle);
        json(res, 200, snapshot.profile);
        return;
      } catch (error) {
        if (typeof error?.status === "number" && error.status === 404) {
          notFound(res, `Aucun profil Instagram pour ${handle}`);
          return;
        }
        handleInstagramError(res, error);
        return;
      }
    }
    respondConfigurationMissing(res, platformParam);
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
      if (normalizedPlatform === "instagram") {
        try {
          const snapshot = await fetchInstagramSnapshot(handle);
          json(res, 200, snapshot.posts.slice(0, limit));
          return;
        } catch (error) {
          handleInstagramError(res, error);
          return;
        }
      }
      respondConfigurationMissing(res, normalizedPlatform);
      return;
    }

    if (type === "followers") {
      const weeks = Number(url.searchParams.get("weeks") || 12);
      if (normalizedPlatform === "instagram") {
        try {
          const snapshot = await fetchInstagramSnapshot(handle);
          json(res, 200, snapshot.followersSeries.slice(-weeks));
          return;
        } catch (error) {
          handleInstagramError(res, error);
          return;
        }
      }
      respondConfigurationMissing(res, normalizedPlatform);
      return;
    }

    if (type === "engagement") {
      if (normalizedPlatform === "instagram") {
        try {
          const snapshot = await fetchInstagramSnapshot(handle);
          json(res, 200, snapshot.engagementByFormat);
          return;
        } catch (error) {
          handleInstagramError(res, error);
          return;
        }
      }
      respondConfigurationMissing(res, normalizedPlatform);
      return;
    }

    if (type === "metrics") {
      if (normalizedPlatform === "instagram") {
        try {
          const snapshot = await fetchInstagramSnapshot(handle);
          json(res, 200, snapshot.metrics);
          return;
        } catch (error) {
          if (typeof error?.status === "number" && error.status === 404) {
            notFound(res, `Metrics unavailable for ${handle} on instagram`);
            return;
          }
          handleInstagramError(res, error);
          return;
        }
      }
      respondConfigurationMissing(res, normalizedPlatform);
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

    if (url.pathname === "/api/search") {
      await handleFederatedSearch(req, res, url);
      return;
    }

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

const hasProxyTargets = Boolean(defaultProxyTarget) || platformProxyTargets.size > 0;

server.listen(port, host, () => {
  log(`Server listening on http://${host}:${port}`);
  if (hasProxyTargets) {
    if (defaultProxyTarget) {
      log(`Proxying social API requests to ${defaultProxyTarget}`);
    }
    for (const [platformId, target] of platformProxyTargets) {
      log(`Proxying ${platformLabels[platformId]} requests to ${target}`);
    }
  } else {
    log(
      "Instagram live activé. Définissez SOCIAL_PROXY_TARGET (ou SOCIAL_PROXY_TARGET_<RÉSEAU>) pour relayer les autres plateformes.",
    );
  }
});

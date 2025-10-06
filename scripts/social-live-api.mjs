import { createServer } from "node:http";
import { URL } from "node:url";

const port = Number(process.env.PORT || 3031);
const host = process.env.HOST || "0.0.0.0";

function sanitizeHandle(handle = "") {
  return handle.trim().replace(/^@+/, "");
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function ensureEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const message = text || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function calcAverageEngagement(posts, followers) {
  if (!Array.isArray(posts) || posts.length === 0) return 0;
  if (!followers || followers <= 0) return 0;
  const totalEngagement = posts.reduce((sum, post) => {
    const likes = Number(post.likes || 0);
    const comments = Number(post.comments || 0);
    return sum + likes + comments;
  }, 0);
  if (totalEngagement === 0) return 0;
  const avg = totalEngagement / posts.length;
  return Number(((avg / followers) * 100).toFixed(2));
}

function calcPosts7d(posts) {
  if (!Array.isArray(posts) || posts.length === 0) return 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return posts.filter((post) => new Date(post.date).getTime() >= sevenDaysAgo).length;
}

function buildFollowersSeries(followers) {
  const safeFollowers = Math.max(0, Number.isFinite(followers) ? Number(followers) : 0);
  const points = [];
  for (let i = 11; i >= 0; i -= 1) {
    points.push({ period: `W-${i === 0 ? "0" : i}`, followers: safeFollowers });
  }
  return points;
}

function buildGrowthSeriesFromFollowers(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return Array.from({ length: 12 }, () => 0);
  }
  const series = points.map((point) => Number(point.followers || 0));
  const growth = [];
  for (let i = 1; i < series.length; i += 1) {
    growth.push(series[i] - series[i - 1]);
  }
  while (growth.length < 12) {
    growth.unshift(growth[0] ?? 0);
  }
  return growth.slice(-12);
}

function summarizeFormats(posts, defaultFormat) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return defaultFormat ? { [defaultFormat]: 1 } : {};
  }
  const counts = new Map();
  posts.forEach((post) => {
    const format = post.format || defaultFormat || "Content";
    counts.set(format, (counts.get(format) || 0) + 1);
  });
  return Object.fromEntries(counts.entries());
}

function normalizePost(post) {
  return {
    id: String(post.id || post.url || Math.random().toString(36).slice(2)),
    platform: post.platform,
    title: post.title || post.text || "",
    likes: Number(post.likes || 0),
    comments: Number(post.comments || 0),
    date: toIsoDate(post.date),
    url: post.url,
  };
}

function makeProfileResponse(platform, data) {
  const posts = (data.posts || []).map((post) => normalizePost({ ...post, platform }));
  const followers = Number(data.followers || data.metrics?.followers || 0);
  const followersSeries = data.followersSeries || buildFollowersSeries(followers);
  const metrics = {
    followers,
    weeklyDelta: Number(data.metrics?.weeklyDelta ?? 0),
    avgEngagement: Number(data.metrics?.avgEngagement ?? calcAverageEngagement(posts, followers)),
    posts7d: Number(data.metrics?.posts7d ?? calcPosts7d(posts)),
  };
  const engagementByFormat = data.engagementByFormat || summarizeFormats(posts);
  const summaryGrowthSeries = data.summary?.growthSeries || buildGrowthSeriesFromFollowers(followersSeries);
  const summaryEngagement = data.summary?.engagementByFormat || engagementByFormat;

  return {
    displayName: data.displayName || data.name || data.handle,
    accounts: {
      [platform]: {
        handle: data.handle.startsWith("@") ? data.handle : `@${data.handle}`,
        displayName: data.displayName || data.name,
      },
    },
    summary: {
      growthSeries: summaryGrowthSeries,
      engagementByFormat: summaryEngagement,
    },
    platforms: {
      [platform]: {
        metrics,
        followersSeries,
        engagementByFormat,
        posts,
      },
    },
    posts,
  };
}

async function fetchInstagramProfile(handle) {
  const sessionId = ensureEnv("INSTAGRAM_SESSION_ID");
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    Accept: "application/json, text/javascript, */*; q=0.01",
    Cookie: `sessionid=${sessionId};`,
    "X-IG-App-ID": "936619743392459",
    Referer: `https://www.instagram.com/${handle}/`,
  };
  const data = await fetchJson(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
    { headers }
  );
  const user = data?.data?.user || data?.user;
  if (!user) {
    throw new Error(`Instagram profile not found for ${handle}`);
  }
  const edges = user.edge_owner_to_timeline_media?.edges || [];
  const posts = edges.map((edge) => {
    const node = edge.node || {};
    const typename = node.__typename || "POST";
    let format = "Post";
    if (typename === "GraphVideo") format = "Vidéo";
    else if (typename === "GraphImage") format = "Photo";
    else if (typename === "GraphSidecar") format = "Carousel";
    return {
      id: node.id || node.shortcode,
      platform: "instagram",
      title: node.title || node.accessibility_caption || node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
      likes: node.edge_liked_by?.count ?? node.like_count ?? 0,
      comments: node.edge_media_to_comment?.count ?? node.comment_count ?? 0,
      date: new Date((node.taken_at_timestamp || node.date || 0) * 1000).toISOString(),
      url: node.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : undefined,
      format,
    };
  });
  const followers = user.edge_followed_by?.count ?? user.followers_count ?? 0;
  const metrics = {
    followers,
    weeklyDelta: 0,
    avgEngagement: calcAverageEngagement(posts, followers),
    posts7d: calcPosts7d(posts),
  };
  const engagementByFormat = summarizeFormats(posts, "Post");

  return {
    id: user.id,
    handle,
    displayName: user.full_name || user.username,
    followers,
    metrics,
    posts,
    followersSeries: buildFollowersSeries(followers),
    engagementByFormat,
  };
}

async function fetchTikTokProfile(handle) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    Referer: `https://www.tiktok.com/@${handle}`,
    Accept: "application/json, text/plain, */*",
  };
  const profileData = await fetchJson(
    `https://www.tiktok.com/api/user/detail/?aid=1988&uniqueId=${encodeURIComponent(handle)}`,
    { headers }
  );
  const userInfo = profileData?.userInfo;
  const user = userInfo?.user;
  const stats = userInfo?.stats;
  if (!user || !stats) {
    throw new Error(`TikTok profile not found for ${handle}`);
  }
  let posts = [];
  try {
    if (user.secUid) {
      const postsData = await fetchJson(
        `https://www.tiktok.com/api/post/item_list/?aid=1988&count=20&cursor=0&secUid=${encodeURIComponent(user.secUid)}`,
        { headers }
      );
      const items = postsData?.itemList || postsData?.items || [];
      posts = items.map((item) => ({
        id: item.id || item.item_id,
        platform: "tiktok",
        title: item.desc || item.title || "",
        likes: item.stats?.diggCount ?? item.stats?.digg_count ?? 0,
        comments: item.stats?.commentCount ?? item.stats?.comment_count ?? 0,
        date: new Date((item.createTime || item.create_time || 0) * 1000).toISOString(),
        url: item.id ? `https://www.tiktok.com/@${handle}/video/${item.id}` : undefined,
        format: "Vidéo",
      }));
    }
  } catch (error) {
    console.warn(`Failed to fetch TikTok posts for ${handle}:`, error.message || error);
  }
  const followers = stats.followerCount ?? stats.follower_count ?? 0;
  const metrics = {
    followers,
    weeklyDelta: 0,
    avgEngagement: calcAverageEngagement(posts, followers),
    posts7d: calcPosts7d(posts),
  };
  return {
    id: user.id,
    handle,
    displayName: user.nickname || user.uniqueId,
    followers,
    metrics,
    posts,
    followersSeries: buildFollowersSeries(followers),
    engagementByFormat: summarizeFormats(posts, "Vidéo"),
  };
}

async function fetchFacebookProfile(handle) {
  const token = ensureEnv("FACEBOOK_ACCESS_TOKEN");
  const base = "https://graph.facebook.com/v18.0";
  const fields = [
    "id",
    "name",
    "followers_count",
    "fan_count",
    "link",
    "verification_status",
    "about",
    "category",
  ].join(",");
  const profile = await fetchJson(
    `${base}/${encodeURIComponent(handle)}?fields=${fields}&access_token=${encodeURIComponent(token)}`
  );
  const pageId = profile.id || handle;
  let posts = [];
  try {
    const postsFields = [
      "id",
      "message",
      "created_time",
      "permalink_url",
      "likes.summary(true)",
      "comments.summary(true)",
      "attachments{media_type}",
    ].join(",");
    const postsData = await fetchJson(
      `${base}/${encodeURIComponent(pageId)}/posts?fields=${postsFields}&limit=10&access_token=${encodeURIComponent(token)}`
    );
    const items = postsData?.data || [];
    posts = items.map((item) => ({
      id: item.id,
      platform: "facebook",
      title: item.message || "",
      likes: item.likes?.summary?.total_count ?? 0,
      comments: item.comments?.summary?.total_count ?? 0,
      date: toIsoDate(item.created_time),
      url: item.permalink_url,
      format: item.attachments?.data?.[0]?.media_type || "Post",
    }));
  } catch (error) {
    console.warn(`Failed to fetch Facebook posts for ${handle}:`, error.message || error);
  }
  const followers = profile.followers_count ?? profile.fan_count ?? 0;
  const metrics = {
    followers,
    weeklyDelta: 0,
    avgEngagement: calcAverageEngagement(posts, followers),
    posts7d: calcPosts7d(posts),
  };
  return {
    id: pageId,
    handle,
    displayName: profile.name || handle,
    followers,
    metrics,
    posts,
    followersSeries: buildFollowersSeries(followers),
    engagementByFormat: summarizeFormats(posts, "Post"),
  };
}

async function fetchTwitterProfile(handle) {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    const data = await fetchJson(
      `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${encodeURIComponent(handle)}`
    );
    const user = Array.isArray(data) ? data[0] : data;
    if (!user) {
      throw new Error(`X profile not found for ${handle}`);
    }
    const followers = Number(user.followers_count || user.formatted_followers_count || 0);
    return {
      id: user.id || user.screen_name || handle,
      handle,
      displayName: user.name || user.screen_name,
      followers,
      metrics: {
        followers,
        weeklyDelta: 0,
        avgEngagement: 0,
        posts7d: 0,
      },
      posts: [],
      followersSeries: buildFollowersSeries(followers),
      engagementByFormat: { Tweet: 1 },
    };
  }

  const userData = await fetchJson(
    `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=profile_image_url,public_metrics,verified,description,location`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const user = userData?.data;
  if (!user) {
    throw new Error(`X profile not found for ${handle}`);
  }
  const followers = user.public_metrics?.followers_count ?? 0;
  let posts = [];
  try {
    const tweetsData = await fetchJson(
      `https://api.twitter.com/2/users/${user.id}/tweets?max_results=20&tweet.fields=created_at,public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const tweets = tweetsData?.data || [];
    posts = tweets.map((tweet) => ({
      id: tweet.id,
      platform: "x",
      title: tweet.text || "",
      likes: tweet.public_metrics?.like_count ?? 0,
      comments: tweet.public_metrics?.reply_count ?? 0,
      date: toIsoDate(tweet.created_at),
      url: `https://twitter.com/${handle}/status/${tweet.id}`,
      format: "Tweet",
    }));
  } catch (error) {
    console.warn(`Failed to fetch X posts for ${handle}:`, error.message || error);
  }
  const metrics = {
    followers,
    weeklyDelta: 0,
    avgEngagement: calcAverageEngagement(posts, followers),
    posts7d: calcPosts7d(posts),
  };
  return {
    id: user.id,
    handle,
    displayName: user.name || user.username,
    followers,
    metrics,
    posts,
    followersSeries: buildFollowersSeries(followers),
    engagementByFormat: summarizeFormats(posts, "Tweet"),
  };
}

async function fetchYouTubeProfile(handle) {
  const apiKey = ensureEnv("YOUTUBE_API_KEY");
  const normalized = handle.startsWith("@") ? handle.slice(1) : handle;
  let channelId = null;
  let channelSnippet = null;
  try {
    const direct = await fetchJson(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${encodeURIComponent(normalized)}&key=${apiKey}`
    );
    if (Array.isArray(direct?.items) && direct.items.length > 0) {
      const item = direct.items[0];
      channelId = item.id;
      channelSnippet = item;
    }
  } catch (error) {
    // ignore and fallback to search
  }
  if (!channelId) {
    const search = await fetchJson(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=5&key=${apiKey}`
    );
    const items = search?.items || [];
    const match = items.find((item) => {
      const title = item.snippet?.channelTitle || "";
      return title.toLowerCase() === normalized.toLowerCase() || title.toLowerCase() === handle.toLowerCase();
    }) || items[0];
    if (!match) {
      throw new Error(`YouTube channel not found for ${handle}`);
    }
    channelId = match.snippet?.channelId || match.id?.channelId;
  }
  if (!channelId) {
    throw new Error(`YouTube channel not found for ${handle}`);
  }
  const channelData = channelSnippet || (await fetchJson(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}&key=${apiKey}`
  )).items?.[0];
  if (!channelData) {
    throw new Error(`YouTube channel not found for ${handle}`);
  }
  const snippet = channelData.snippet || {};
  const stats = channelData.statistics || {};
  const followers = Number(stats.subscriberCount || 0);
  let posts = [];
  try {
    const videos = await fetchJson(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${encodeURIComponent(channelId)}&order=date&maxResults=10&key=${apiKey}`
    );
    const videoItems = videos?.items || [];
    const videoIds = videoItems.map((item) => item.id?.videoId).filter(Boolean);
    let videoStats = {};
    if (videoIds.length > 0) {
      const statsResponse = await fetchJson(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.map((id) => encodeURIComponent(id)).join(",")}&key=${apiKey}`
      );
      statsResponse?.items?.forEach((item) => {
        videoStats[item.id] = item.statistics || {};
      });
    }
    posts = videoItems.map((item) => {
      const videoId = item.id?.videoId;
      const statistics = videoStats[videoId] || {};
      return {
        id: videoId,
        platform: "youtube",
        title: item.snippet?.title || "",
        likes: Number(statistics.likeCount || 0),
        comments: Number(statistics.commentCount || 0),
        date: toIsoDate(item.snippet?.publishedAt),
        url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
        format: "Vidéo",
      };
    });
  } catch (error) {
    console.warn(`Failed to fetch YouTube videos for ${handle}:`, error.message || error);
  }
  const metrics = {
    followers,
    weeklyDelta: 0,
    avgEngagement: calcAverageEngagement(posts, followers),
    posts7d: calcPosts7d(posts),
  };
  return {
    id: channelId,
    handle,
    displayName: snippet.title || handle,
    followers,
    metrics,
    posts,
    followersSeries: buildFollowersSeries(followers),
    engagementByFormat: summarizeFormats(posts, "Vidéo"),
  };
}

const providers = {
  instagram: fetchInstagramProfile,
  tiktok: fetchTikTokProfile,
  facebook: fetchFacebookProfile,
  x: fetchTwitterProfile,
  youtube: fetchYouTubeProfile,
};

async function handleSearch(req, res, url) {
  const query = sanitizeHandle(url.searchParams.get("q") || "");
  const platform = url.searchParams.get("platform") || undefined;
  const limit = Number(url.searchParams.get("limit") || 8);
  const results = [];
  const platformsToQuery = platform ? [platform] : Object.keys(providers);
  if (!query) {
    sendJson(res, 200, { results });
    return;
  }
  await Promise.all(
    platformsToQuery.slice(0, limit).map(async (platformKey) => {
      const provider = providers[platformKey];
      if (!provider) return;
      try {
        const profile = await provider(query);
        results.push({
          id: `${platformKey}:${profile.id || profile.handle}`,
          platform: platformKey,
          handle: profile.handle.startsWith("@") ? profile.handle : `@${profile.handle}`,
          displayName: profile.displayName || profile.handle,
          followers: profile.followers ?? profile.metrics?.followers ?? 0,
          engagementRate: profile.metrics?.avgEngagement ?? 0,
        });
      } catch (error) {
        // ignore individual failures to allow multi-platform search
      }
    })
  );
  sendJson(res, 200, { results });
}

async function handleProfile(req, res, url) {
  const platform = url.searchParams.get("platform");
  const handle = sanitizeHandle(url.searchParams.get("handle") || "");
  if (!platform || !handle) {
    sendError(res, 400, "platform and handle are required");
    return;
  }
  const provider = providers[platform];
  if (!provider) {
    sendError(res, 400, `Unsupported platform ${platform}`);
    return;
  }
  try {
    const profile = await provider(handle);
    const response = makeProfileResponse(platform, profile);
    sendJson(res, 200, response);
  } catch (error) {
    console.error(`Profile fetch error for ${platform}:${handle}`, error.message || error);
    const status = error.status || 500;
    sendError(res, status, error.message || "Unable to fetch profile");
  }
}

async function handlePlatformResource(req, res, url, platform, resource) {
  const handle = sanitizeHandle(url.searchParams.get("handle") || "");
  if (!handle) {
    sendError(res, 400, "handle is required");
    return;
  }
  const provider = providers[platform];
  if (!provider) {
    sendError(res, 400, `Unsupported platform ${platform}`);
    return;
  }
  try {
    const profile = await provider(handle);
    if (resource === "posts") {
      const limit = Number(url.searchParams.get("limit") || 50);
      sendJson(res, 200, (profile.posts || []).slice(0, limit).map((post) => normalizePost({ ...post, platform })));
      return;
    }
    if (resource === "followers") {
      const weeks = Number(url.searchParams.get("weeks") || 12);
      const series = profile.followersSeries || buildFollowersSeries(profile.followers);
      sendJson(res, 200, series.slice(-weeks));
      return;
    }
    if (resource === "engagement") {
      sendJson(res, 200, profile.engagementByFormat || summarizeFormats(profile.posts));
      return;
    }
    if (resource === "metrics") {
      sendJson(res, 200, profile.metrics || {});
      return;
    }
    sendError(res, 404, "Unsupported resource");
  } catch (error) {
    const status = error.status || 500;
    sendError(res, status, error.message || "Unable to fetch resource");
  }
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendError(res, 404, "Not found");
    return;
  }
  const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (req.method === "GET" && pathname === "/search/influencers") {
    handleSearch(req, res, url);
    return;
  }

  if (req.method === "GET" && pathname === "/influencers/profile") {
    handleProfile(req, res, url);
    return;
  }

  const match = pathname.match(/^\/platforms\/([^/]+)\/(posts|followers|engagement|metrics)$/);
  if (req.method === "GET" && match) {
    const [, platform, resource] = match;
    handlePlatformResource(req, res, url, platform, resource);
    return;
  }

  sendError(res, 404, "Not found");
});

server.listen(port, host, () => {
  console.log(`Live social API server listening on http://${host}:${port}`);
});

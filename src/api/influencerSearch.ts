import { Platform } from "@/lib/platforms";

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

const catalog: InfluencerSearchResult[] = [
  {
    id: "instagram-amelia-style",
    platform: "Instagram",
    handle: "@amelia_style",
    displayName: "Amelia Style",
    followers: 928000,
    engagementRate: 4.6,
    location: "Paris, FR",
    topics: ["Mode", "Lifestyle"],
    verified: true,
  },
  {
    id: "instagram-green-soul",
    platform: "Instagram",
    handle: "@green.soul",
    displayName: "Green Soul",
    followers: 482000,
    engagementRate: 5.1,
    location: "Lyon, FR",
    topics: ["Eco", "Food"],
  },
  {
    id: "instagram-travelwithlea",
    platform: "Instagram",
    handle: "@travelwithlea",
    displayName: "Travel with Léa",
    followers: 611000,
    engagementRate: 3.8,
    location: "Marseille, FR",
    topics: ["Voyage", "Photo"],
  },
  {
    id: "tiktok-victor-tech",
    platform: "TikTok",
    handle: "@victor_tech",
    displayName: "Victor Tech",
    followers: 1210000,
    engagementRate: 7.2,
    location: "Toulouse, FR",
    topics: ["Tech", "Gadgets"],
  },
  {
    id: "tiktok-lolymath",
    platform: "TikTok",
    handle: "@lolymath",
    displayName: "LolyMath",
    followers: 389000,
    engagementRate: 8.4,
    location: "Paris, FR",
    topics: ["Éducation", "STEM"],
  },
  {
    id: "tiktok-chef-max",
    platform: "TikTok",
    handle: "@chef.max",
    displayName: "Chef Max",
    followers: 972000,
    engagementRate: 6.5,
    location: "Lille, FR",
    topics: ["Cuisine", "Live"],
  },
  {
    id: "youtube-sasha-vlog",
    platform: "YouTube",
    handle: "@sashaVlog",
    displayName: "Sasha Vlog",
    followers: 742000,
    engagementRate: 5.9,
    location: "Bordeaux, FR",
    topics: ["Vlog", "Documentaire"],
  },
  {
    id: "youtube-lecode",
    platform: "YouTube",
    handle: "@leCode",
    displayName: "Le Code",
    followers: 525000,
    engagementRate: 4.2,
    location: "Nantes, FR",
    topics: ["Tech", "Tutoriel"],
  },
  {
    id: "youtube-fitwithines",
    platform: "YouTube",
    handle: "@fitwithInès",
    displayName: "Fit with Inès",
    followers: 803000,
    engagementRate: 6.1,
    location: "Nice, FR",
    topics: ["Fitness", "Nutrition"],
  },
  {
    id: "x-camille-data",
    platform: "X",
    handle: "@camille_data",
    displayName: "Camille Data",
    followers: 184000,
    engagementRate: 3.4,
    location: "Paris, FR",
    topics: ["Data", "IA"],
  },
  {
    id: "x-parisfoodies",
    platform: "X",
    handle: "@ParisFoodies",
    displayName: "Paris Foodies",
    followers: 257000,
    engagementRate: 2.9,
    location: "Paris, FR",
    topics: ["Food", "Lifestyle"],
  },
  {
    id: "x-pulsefuture",
    platform: "X",
    handle: "@PulseFuture",
    displayName: "Pulse Future",
    followers: 431000,
    engagementRate: 3.7,
    location: "Lyon, FR",
    topics: ["Innovation", "Startups"],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

function scoreEntry(entry: InfluencerSearchResult, query: string) {
  const handle = normalize(entry.handle);
  const display = entry.displayName.toLowerCase();
  const q = normalize(query);
  let score = 0;
  if (!q) return score;
  if (handle === q || display === q) score += 50;
  if (handle.startsWith(q)) score += 25;
  if (display.startsWith(q)) score += 20;
  if (handle.includes(q)) score += 15;
  if (display.includes(q)) score += 10;
  if (entry.topics?.some(topic => topic.toLowerCase().includes(q))) score += 5;
  score += Math.min(entry.followers / 100000, 10);
  score += entry.engagementRate;
  return score;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function searchInfluencers({ platform, query, limit = 8 }: SearchParams): Promise<InfluencerSearchResult[]> {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  // simulate latency as an actual API would do
  await delay(280 + Math.random() * 240);

  const matches = catalog.filter(entry => {
    if (platform && entry.platform !== platform) return false;
    const handle = normalize(entry.handle);
    const display = entry.displayName.toLowerCase();
    if (handle.includes(normalizedQuery)) return true;
    if (display.includes(normalizedQuery)) return true;
    return entry.topics?.some(topic => topic.toLowerCase().includes(normalizedQuery));
  });

  const sorted = matches
    .map(entry => ({ entry, score: scoreEntry(entry, query) }))
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry);

  return sorted.slice(0, limit);
}

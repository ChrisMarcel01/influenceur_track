export const platformOptions = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
  { id: "youtube", label: "YouTube" },
] as const;

export type Platform = (typeof platformOptions)[number]["id"];

export const platforms = platformOptions.map((option) => option.id) as readonly Platform[];

const labelMap: Record<Platform, string> = platformOptions.reduce(
  (acc, option) => ({ ...acc, [option.id]: option.label }),
  {} as Record<Platform, string>,
);

export function isPlatform(value: string): value is Platform {
  return normalizePlatform(value) !== null;
}

export function normalizePlatform(value: string | null | undefined): Platform | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  return (platforms as readonly Platform[]).find((platform) => platform === lower) ?? null;
}

export function getPlatformLabel(platform: Platform): string {
  return labelMap[platform];
}

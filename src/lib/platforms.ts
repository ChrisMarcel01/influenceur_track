export const platforms = ["Instagram", "TikTok", "YouTube", "X"] as const;

export type Platform = typeof platforms[number];

export function isPlatform(value: string): value is Platform {
  return (platforms as readonly string[]).includes(value);
}

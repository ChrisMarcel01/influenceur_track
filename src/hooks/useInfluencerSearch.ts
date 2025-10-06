import { useEffect, useMemo, useState } from "react";
import { Platform } from "@/lib/platforms";
import { InfluencerSearchResult, searchInfluencers } from "@/api/influencerSearch";

interface UseInfluencerSearchParams {
  platform?: Platform;
  query: string;
  minLength?: number;
  limit?: number;
  debounceMs?: number;
}

interface UseInfluencerSearchResult {
  results: InfluencerSearchResult[];
  isLoading: boolean;
  error: string | null;
  hasQuery: boolean;
}

export function useInfluencerSearch({
  platform,
  query,
  minLength = 2,
  limit = 8,
  debounceMs = 250,
}: UseInfluencerSearchParams): UseInfluencerSearchResult {
  const [results, setResults] = useState<InfluencerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedQuery = useMemo(() => query.trim().replace(/^@/, ""), [query]);
  const hasQuery = normalizedQuery.length >= minLength;

  useEffect(() => {
    if (!hasQuery) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    const timeout = setTimeout(() => {
      searchInfluencers({ platform, query, limit })
        .then((items) => {
          if (cancelled) return;
          setResults(items);
          setError(null);
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setResults([]);
          setError(err.message || "Unable to fetch influencers");
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [platform, query, limit, debounceMs, hasQuery]);

  return { results, isLoading, error, hasQuery };
}

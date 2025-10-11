import { useEffect, useMemo, useState } from "react";
import { Platform } from "@/lib/platforms";
import { InfluencerSearchResult, InfluencerSearchIssue, searchInfluencers } from "@/api/influencerSearch";

interface UseInfluencerSearchParams {
  platforms: Platform[];
  query: string;
  minLength?: number;
  limit?: number;
  debounceMs?: number;
}

interface UseInfluencerSearchResult {
  results: InfluencerSearchResult[];
  issues: InfluencerSearchIssue[];
  isLoading: boolean;
  error: string | null;
  hasQuery: boolean;
}

export function useInfluencerSearch({
  platforms,
  query,
  minLength = 2,
  limit = 8,
  debounceMs = 250,
}: UseInfluencerSearchParams): UseInfluencerSearchResult {
  const [results, setResults] = useState<InfluencerSearchResult[]>([]);
  const [issues, setIssues] = useState<InfluencerSearchIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedQuery = useMemo(() => query.trim().replace(/^@/, ""), [query]);
  const hasQuery = normalizedQuery.length >= minLength;

  useEffect(() => {
    if (!hasQuery) {
      setResults([]);
      setIssues([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    const timeout = setTimeout(() => {
      searchInfluencers({ platforms, query: normalizedQuery, limit })
        .then(({ results: items, issues: backendIssues }) => {
          if (cancelled) return;
          setResults(items);
          setIssues(backendIssues);
          setError(null);
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setResults([]);
          setIssues([]);
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
  }, [platforms, normalizedQuery, limit, debounceMs, hasQuery]);

  return { results, issues, isLoading, error, hasQuery };
}

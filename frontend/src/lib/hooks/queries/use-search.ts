import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SearchResult {
  id: string;
  type: "problem" | "job" | "mentor" | "student" | "company";
  title: string;
  description?: string;
  url: string;
}

export function useGlobalSearch(query: string, type?: string, limit?: number) {
  return useQuery({
    queryKey: ["global-search", query, type, limit],
    queryFn: () => api.get<{ data: SearchResult[] }>("/search", { params: { q: query, type, limit: limit || 10 } }).then((r) => r.data.data),
    enabled: query.length >= 2,
  });
}

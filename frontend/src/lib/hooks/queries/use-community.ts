import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ForumPost } from "@/lib/types";

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
}

export interface CodingClub {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
}

export function useForumPosts(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["forum-posts", params],
    queryFn: () => api.get<{ data: ForumPost[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/community/forum/posts", { params }).then((r) => r.data),
  });
}

export function useCreateForumPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body: string; tags: string[] }) => api.post("/community/forum/posts", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum-posts"] }),
  });
}

export function useLikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => api.post(`/community/posts/${postId}/like`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum-posts"] }),
  });
}

export function useStudyGroups() {
  return useQuery({
    queryKey: ["study-groups"],
    queryFn: () => api.get<{ data: StudyGroup[] }>("/community/study-groups").then((r) => r.data.data),
  });
}

export function useJoinStudyGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.post(`/community/study-groups/${groupId}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-groups"] }),
  });
}

export function useCodingClubs() {
  return useQuery({
    queryKey: ["coding-clubs"],
    queryFn: () => api.get<{ data: CodingClub[] }>("/community/coding-clubs").then((r) => r.data.data),
  });
}

export function useJoinCodingClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clubId: string) => api.post(`/community/coding-clubs/${clubId}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coding-clubs"] }),
  });
}

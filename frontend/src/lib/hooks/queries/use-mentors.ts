import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface MentorProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  title: string;
  company: string;
  expertise: string[];
  bio: string;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  availability: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface Booking {
  id: string;
  mentorId: string;
  mentorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amount: number;
  review?: { rating: number; comment: string };
}

export function useMentorSearch(params?: { page?: number; limit?: number; expertise?: string }) {
  return useQuery({
    queryKey: ["mentors", params],
    queryFn: () => api.get<{ data: MentorProfile[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/mentors/search", { params }).then((r) => r.data),
  });
}

export function useMentor(id: string) {
  return useQuery({
    queryKey: ["mentor", id],
    queryFn: () => api.get<MentorProfile>(`/mentors/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useMentorAvailability(id: string) {
  return useQuery({
    queryKey: ["mentor-availability", id],
    queryFn: () => api.get<{ data: AvailabilitySlot[] }>(`/mentors/${id}/availability`).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useBookMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mentorId, slotId }: { mentorId: string; slotId: string }) =>
      api.post(`/mentors/${mentorId}/book`, { slotId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-bookings"] }),
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => api.get<{ data: Booking[] }>("/bookings/me").then((r) => r.data.data),
  });
}

export function usePayBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => api.post(`/bookings/${bookingId}/pay`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-bookings"] }),
  });
}

export function useReviewBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, rating, comment }: { bookingId: string; rating: number; comment: string }) =>
      api.post(`/bookings/${bookingId}/review`, { rating, comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-bookings"] }),
  });
}

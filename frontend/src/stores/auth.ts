"use client";

import { create } from "zustand";
import { api, setAccessToken } from "@/lib/api";
import type { User, AuthState, RegisterInput } from "@/lib/types";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
  },

  register: async (input: RegisterInput) => {
    await api.post("/auth/register", input);
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      set({ user: null, accessToken: null, isAuthenticated: false });
    }
  },

  setUser: (user: User) => set({ user, isAuthenticated: true, isLoading: false }),
  setAccessToken: (token: string | null) => {
    setAccessToken(token);
    set({ accessToken: token, isAuthenticated: !!token });
  },
}));

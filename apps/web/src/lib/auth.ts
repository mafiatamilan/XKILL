import { api } from "./api"

export interface User {
  id: string
  email: string
  name: string
  role: string
  college_id: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface TwoFactorRequired {
  needs_2fa: true
  temp_token: string
}

export type LoginResponse = AuthResponse | TwoFactorRequired

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  })
}

export async function logout(): Promise<void> {
  await api("/auth/logout", { method: "POST" })
}

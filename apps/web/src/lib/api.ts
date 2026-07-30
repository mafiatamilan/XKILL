const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem("access_token")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new ApiError(res.status, text)
  }
  if (res.status === 204) return undefined as Promise<T>
  return res.json() as Promise<T>
}

export async function verifyEmail(token: string): Promise<void> {
  await api("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api("/auth/password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function confirmPasswordReset(
  token: string,
  password: string,
): Promise<void> {
  await api("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  })
}

export interface Setup2FAResponse {
  secret: string
  qr_code_url: string
}

export async function setup2FA(): Promise<Setup2FAResponse> {
  return api<Setup2FAResponse>("/auth/2fa/setup")
}

export async function verify2FA(code: string): Promise<void> {
  await api("/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  })
}

export async function disable2FA(): Promise<void> {
  await api("/auth/2fa/disable", { method: "POST" })
}

export async function verify2FAChallenge(
  tempToken: string,
  code: string,
): Promise<{ user: import("./auth").User; access_token: string; refresh_token: string }> {
  return api("/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ temp_token: tempToken, code }),
  })
}

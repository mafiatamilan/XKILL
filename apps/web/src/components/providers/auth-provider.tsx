"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { User, LoginResponse } from "@/lib/auth"
import { login as apiLogin, logout as apiLogout } from "@/lib/auth"
import { setup2FA as apiSetup2FA, verify2FA as apiVerify2FA, verify2FAChallenge } from "@/lib/api"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (...roles: string[]) => boolean
  setup2FA: () => Promise<{ secret: string; qr_code_url: string }>
  verify2FA: (code: string) => Promise<void>
  tempToken: string | null
  verify2FAChallenge: (code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  hasRole: () => false,
  setup2FA: async () => ({ secret: "", qr_code_url: "" }),
  verify2FA: async () => {},
  tempToken: null,
  verify2FAChallenge: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tempToken, setTempToken] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem("user")
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res: LoginResponse = await apiLogin(email, password)
    if ("needs_2fa" in res && res.needs_2fa) {
      setTempToken(res.temp_token)
      throw new Error("2FA_REQUIRED")
    }
    localStorage.setItem("access_token", res.access_token)
    localStorage.setItem("refresh_token", res.refresh_token)
    localStorage.setItem("user", JSON.stringify(res.user))
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
    } finally {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("user")
      setUser(null)
      setTempToken(null)
    }
  }, [])

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false
      return roles.includes(user.role)
    },
    [user],
  )

  const setup2FA = useCallback(async () => {
    return apiSetup2FA()
  }, [])

  const verify2FA = useCallback(async (code: string) => {
    await apiVerify2FA(code)
  }, [])

  const handleVerify2FAChallenge = useCallback(async (code: string) => {
    if (!tempToken) throw new Error("No temporary token available")
    const res = await verify2FAChallenge(tempToken, code)
    localStorage.setItem("access_token", res.access_token)
    localStorage.setItem("refresh_token", res.refresh_token)
    localStorage.setItem("user", JSON.stringify(res.user))
    setUser(res.user)
    setTempToken(null)
  }, [tempToken])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
        setup2FA,
        verify2FA,
        tempToken,
        verify2FAChallenge: handleVerify2FAChallenge,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

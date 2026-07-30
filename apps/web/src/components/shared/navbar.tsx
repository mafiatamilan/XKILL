"use client"

import Link from "next/link"
import { cn } from "@xkill/design-system"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/components/providers/auth-provider"

interface NavLink {
  href: string
  label: string
}

const publicLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
]

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()

  const portalHref = user ? `/${user.role}` : "/"

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      )}
    >
      <nav
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <Link
          href={portalHref}
          className="text-lg font-bold text-brand-600 dark:text-brand-400"
        >
          xkill
        </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                href={portalHref}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <span className="text-sm text-muted-foreground">
                {user?.name}
              </span>
              <button
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {publicLinks.slice(1).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}

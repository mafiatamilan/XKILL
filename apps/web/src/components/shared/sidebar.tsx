"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@xkill/design-system"

interface SidebarProps {
  links: { href: string; label: string }[]
}

export function Sidebar({ links }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden w-64 shrink-0 border-r bg-muted/30 md:block"
      aria-label="Portal navigation"
    >
      <nav className="flex flex-col gap-1 p-4">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

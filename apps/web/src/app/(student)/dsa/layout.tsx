import { Navbar } from "@/components/shared/navbar"

const dsaLinks = [
  { href: "/student/dsa", label: "Problems" },
  { href: "/student/dsa/submissions", label: "Submissions" },
  { href: "/student/dsa/contests", label: "Contests" },
  { href: "/student/dsa/playlists", label: "Playlists" },
]

export default function DSALayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Navbar />
      <div className="flex">
        <aside
          className="hidden w-56 shrink-0 border-r bg-muted/30 md:block"
          aria-label="DSA navigation"
        >
          <nav className="flex flex-col gap-1 p-4">
            {dsaLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

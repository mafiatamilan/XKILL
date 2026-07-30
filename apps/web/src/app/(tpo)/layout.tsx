import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"

const tpoLinks = [
  { href: "/tpo/dashboard", label: "Dashboard" },
  { href: "/tpo/drives", label: "Drives" },
  { href: "/tpo/companies", label: "Companies" },
  { href: "/tpo/announcements", label: "Announcements" },
]

export default function TPOLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex">
        <Sidebar links={tpoLinks} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

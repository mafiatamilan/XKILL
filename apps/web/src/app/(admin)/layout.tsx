import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/colleges", label: "Colleges" },
  { href: "/admin/recruiters", label: "Recruiters" },
  { href: "/admin/feature-flags", label: "Feature Flags" },
  { href: "/admin/audit-log", label: "Audit Log" },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex">
        <Sidebar links={adminLinks} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

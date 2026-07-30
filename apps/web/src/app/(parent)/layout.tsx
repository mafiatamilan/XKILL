import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"

const parentLinks = [
  { href: "/parent", label: "Dashboard" },
  { href: "/parent/progress", label: "Progress" },
  { href: "/parent/attendance", label: "Attendance" },
  { href: "/parent/marks", label: "Marks" },
]

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex">
        <Sidebar links={parentLinks} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

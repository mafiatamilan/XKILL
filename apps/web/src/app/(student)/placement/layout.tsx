import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"

const placementLinks = [
  { href: "/student/placement", label: "Drives" },
  { href: "/student/placement/applications", label: "My Applications" },
  { href: "/student/placement/stats", label: "Stats" },
]

export default function PlacementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex">
        <Sidebar links={placementLinks} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

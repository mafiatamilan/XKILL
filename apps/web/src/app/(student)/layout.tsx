import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"

const studentLinks = [
  { href: "/student", label: "Dashboard" },
  { href: "/student/profile", label: "Profile" },
  { href: "/student/academics", label: "Academics" },
  { href: "/student/dsa", label: "DSA Platform" },
  { href: "/student/placement", label: "Placement" },
  { href: "/student/battles", label: "Battles" },
  { href: "/student/leaderboard", label: "Leaderboard" },
  { href: "/student/achievements", label: "Achievements" },
  { href: "/student/certificates", label: "Certificates" },
  { href: "/student/community", label: "Community" },
]

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex">
        <Sidebar links={studentLinks} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

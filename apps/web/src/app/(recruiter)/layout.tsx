import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"

const recruiterLinks = [
  { href: "/recruiter/dashboard", label: "Dashboard" },
  { href: "/recruiter/company", label: "Company Profile" },
  { href: "/recruiter/jobs", label: "My Jobs" },
  { href: "/recruiter/jobs/create", label: "Post Job" },
]

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex">
        <Sidebar links={recruiterLinks} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

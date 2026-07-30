import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"

const facultyLinks = [
  { href: "/faculty", label: "Dashboard" },
  { href: "/faculty/subjects", label: "Subjects" },
  { href: "/faculty/attendance", label: "Attendance" },
  { href: "/faculty/assignments", label: "Assignments" },
  { href: "/faculty/exams", label: "Exams" },
  { href: "/faculty/gradebook", label: "Gradebook" },
  { href: "/faculty/analytics", label: "Analytics" },
  { href: "/faculty/lab", label: "Lab" },
]

export default function FacultyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex">
        <Sidebar links={facultyLinks} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

import Link from "next/link"

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Welcome to <span className="text-brand-600">xkill</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Multi-college placement, learning, and competitive-coding platform.
          Prepare for placements, master DSA, and connect with recruiters.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign In
          </Link>
        </div>
      </section>

      <section className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "DSA Platform",
            desc: "Practice 500+ problems with a powerful judge engine. Compete in contests and track your progress.",
          },
          {
            title: "Placement Prep",
            desc: "10-week roadmap, AI mock interviews, resume builder with ATS scoring, and company-specific prep paths.",
          },
          {
            title: "College Lab",
            desc: "Programming lab management with auto-evaluation, OBE framework, and NBA/NAAC-ready reports.",
          },
        ].map((feature) => (
          <article
            key={feature.title}
            className="rounded-lg border p-6 transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

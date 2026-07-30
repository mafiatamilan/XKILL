import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
      >
        Go home
      </Link>
    </div>
  )
}

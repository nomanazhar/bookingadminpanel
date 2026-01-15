import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-foreground">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold font-heading">Page not found</h1>
        <p className="text-muted-foreground">
          The page you are looking for does not exist or was moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Go back home
      </Link>
    </div>
  )
}


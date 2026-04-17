import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-background text-on-surface">
      <nav className="fixed top-0 w-full z-50 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto font-bold tracking-tight">
          <Link href="/" className="text-xl font-bold tracking-tighter text-on-surface">
            MindClash
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/sign-in" className="text-on-surface-variant hover:text-on-surface">
              Login
            </Link>
            <Link
              href="/sign-up"
              className="bg-linear-to-br from-primary to-[#4d8eff] text-on-primary-container px-5 py-2 rounded-lg font-bold"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-28 px-8 pb-16">
        <div className="max-w-7xl mx-auto grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.95]">
              Claim Your <span className="text-primary">MindClash</span> Identity
            </h1>
            <p className="text-lg text-on-surface-variant max-w-xl">
              Join the arena to compete in ranked duels, practice with curated puzzles, and track your growth.
            </p>
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
              <div className="text-xs uppercase tracking-widest text-primary font-black mb-2">Start Strong</div>
              <div className="text-sm text-on-surface-variant">
                New users begin at base rating and climb through pure performance.
              </div>
            </div>
          </div>

          <div className="glass-panel w-full max-w-md md:ml-auto rounded-xl p-6 border border-outline-variant/40">
            <h2 className="text-2xl font-black mb-2">Sign Up</h2>
            <p className="text-sm text-on-surface-variant mb-6">Create your MindClash account.</p>
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              forceRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  card: "bg-transparent shadow-none border-0 p-0",
                  rootBox: "w-full",
                  formButtonPrimary:
                    "bg-linear-to-br from-primary to-[#4d8eff] text-on-primary-container font-bold rounded-lg py-2",
                  footerActionLink: "text-primary hover:underline",
                },
              }}
            />
            <div className="mt-4 text-xs text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline">
                Sign In
              </Link>
            </div>
            <div className="mt-2 text-xs">
              <Link href="/" className="text-primary hover:underline">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

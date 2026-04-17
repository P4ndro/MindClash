import Link from "next/link";

export default function MockSignUpPage() {
  return (
    <main className="min-h-screen bg-background text-on-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container rounded-xl p-6 border border-outline-variant/40">
        <h1 className="text-2xl font-black mb-2">Mock Sign Up</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          Temporary registration screen for UI integration.
        </p>
        <form className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-on-surface-variant">Username</label>
            <input
              type="text"
              placeholder="mindclasher"
              className="w-full mt-1 rounded-lg bg-surface-container-high border border-outline-variant/40 px-3 py-2 outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-on-surface-variant">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full mt-1 rounded-lg bg-surface-container-high border border-outline-variant/40 px-3 py-2 outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-on-surface-variant">Password</label>
            <input
              type="password"
              placeholder="********"
              className="w-full mt-1 rounded-lg bg-surface-container-high border border-outline-variant/40 px-3 py-2 outline-none"
            />
          </div>
          <button
            type="button"
            className="w-full bg-linear-to-br from-primary to-[#4d8eff] text-on-primary-container font-bold rounded-lg py-2"
          >
            Create Account
          </button>
        </form>
        <div className="mt-4 text-xs text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Mock Sign In
          </Link>
        </div>
        <div className="mt-2 text-xs">
          <Link href="/" className="text-primary hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

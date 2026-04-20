import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-on-surface selection:bg-primary/20 selection:text-on-primary-container">
      <nav className="fixed top-0 w-full z-50 bg-surface-container-low/80 backdrop-blur-xl shadow-2xl shadow-black/20 border-b border-outline-variant/20">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto font-['Inter'] font-bold tracking-tight">
          <div className="text-xl font-bold tracking-tighter text-on-surface">MindClash</div>
          <div className="hidden md:flex gap-8 items-center">
            <a className="text-primary border-b-2 border-primary pb-1" href="#">
              1v1 Arena
            </a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
              Training
            </a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
              Classroom
            </a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
              Pricing
            </a>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/sign-in" className="text-on-surface-variant hover:text-on-surface transition-colors px-4 py-2">
              Login
            </Link>
            <Link
              href="/sign-up"
              className="signature-gradient text-on-primary-container px-6 py-2 rounded-lg font-bold active:scale-95 duration-200"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24">
        <section className="relative min-h-[900px] flex items-center px-8 overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-40">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] signature-gradient blur-[120px] rounded-full opacity-10" />
            <img
              alt="Chess pieces and scientific symbols"
              className="w-full h-full object-cover mix-blend-overlay"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvn2tYL_Q461MpZGog6ukfHmc8wN8YEHSizAvKbzDvxGbekYn0btUtyk6rU7VIuR8m07KMfzc1GF1oJP_1ULCp3B0WCb2X3md7wPth1VXx5-eJgj_WmeaisrdB2lilzyCavdeO44wHLCwf6MTJjUCDK2O7Ig4yFjJ5mjZzRyNIiNs5sxqjkXD8HUahVOmhY68oB6Btr9KAS6m30HFZOQG00PQxcdpPp9pY_rnuj8Do_UXy5vetiXvWePIoWiJqaLhbfWEX1ez8t0Tq"
            />
          </div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-[1.2fr_0.8fr] gap-12 items-center relative z-10">
            <div className="space-y-8">
              <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.95] text-on-surface">
                Master Your <span className="text-primary">Mind.</span>
                <br />
                Conquer the Arena.
              </h1>
              <p className="text-xl text-on-surface-variant max-w-xl font-medium leading-relaxed">
                The world&apos;s premier platform for competitive academic duels. 1v1 matches, subject-specific
                puzzles, and global group wars.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link
                  href="/sign-up"
                  className="signature-gradient text-on-primary-container px-8 py-4 rounded-lg font-black text-lg shadow-xl shadow-primary/10 hover:brightness-110 transition-all active:scale-95"
                >
                  Start Your Ascent
                </Link>
                <button className="px-8 py-4 border-2 border-outline-variant text-on-surface rounded-lg font-bold hover:bg-surface-container-high transition-all">
                  View Leaderboard
                </button>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative glass-panel rounded-xl p-8 border border-outline-variant/20 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xs font-black tracking-widest text-primary uppercase">Current Live Duel</span>
                  <span className="flex items-center gap-2 text-xs text-secondary">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-lg bg-surface-container-highest mb-3 flex items-center justify-center border border-primary/30">
                      <span className="material-symbols-outlined text-4xl text-primary">person</span>
                    </div>
                    <div className="text-sm font-bold">Grandmaster_X</div>
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Elo 2840</div>
                  </div>
                  <div className="text-2xl font-black italic text-outline-variant">VS</div>
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-lg bg-surface-container-highest mb-3 flex items-center justify-center border border-secondary/30">
                      <span className="material-symbols-outlined text-4xl text-secondary">person_4</span>
                    </div>
                    <div className="text-sm font-bold">Scholar_99</div>
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Elo 2795</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low py-12 px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-8">
            {[
              ["142K+", "Active Duelists"],
              ["8.4M", "Puzzles Solved"],
              ["120+", "Global Universities"],
              ["$250K", "Tournament Prizes"],
            ].map(([value, label]) => (
              <div className="flex flex-col" key={label}>
                <span className="text-4xl font-black text-on-surface">{value}</span>
                <span className="text-xs uppercase tracking-widest text-primary font-bold">{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function LeaderboardPage() {
  return (
    <main className="bg-surface text-on-surface min-h-screen font-body selection:bg-primary/30">
      <nav className="flex justify-between items-center w-full px-6 py-3 max-w-full mx-auto fixed top-0 z-50 bg-[#051426] shadow-[0_0_32px_rgba(5,20,38,0.06)]">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[#adc6ff] to-[#4d8eff]"
          >
            MindClash
          </Link>
          <div className="hidden md:flex items-center gap-6 font-['Inter'] font-medium text-sm tracking-tight">
            <Link className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="/dashboard">
              Dashboard
            </Link>
            <Link className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="/arena">
              Arena
            </Link>
            <a className="text-[#adc6ff] font-bold border-b-2 border-[#adc6ff] pb-1" href="#">
              Leaderboard
            </a>
            <a className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="#">
              Social
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-[#94a3b8] hover:text-[#adc6ff] transition-all">notifications</button>
          <button className="material-symbols-outlined text-[#94a3b8] hover:text-[#adc6ff] transition-all">inbox</button>
          <UserButton />
        </div>
      </nav>

      <section className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center">
        <div className="w-full max-w-6xl flex justify-between items-center mb-12">
          <div className="flex items-center gap-4 text-left">
            <div className="relative">
              <div className="w-16 h-16 bg-surface-container border-2 border-primary overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Player avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRqSHMlcWWhOjNrvJmk8hg1LoE5FoPmbYCfRLZy2hCwJerEppI_IqZiog3Pxt5X5-QE3_LjqbcUo0MUinrjQ1_KhZc_FpU7leTA3VmuuFCMkmot6Msd-GtjbCGeqheTGQg4FCdhpbjhG177YKCjzDOi-jbJs3ysQNV8FVfjMMVTBOKsPuD9bgyMJ0DDewZcLlQhcGmyToq9La3NFDhbjM26xIK7q2bxUH9hzy_LXRxwkeeDEKoengeG7YH4i44xMCdPuh4iMbloKbe"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-secondary-container text-on-secondary-container px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
                GM
              </div>
            </div>
            <div>
              <h3 className="uppercase tracking-widest text-on-surface-variant mb-1 text-xs">You</h3>
              <p className="font-bold text-lg text-primary">Alex_Nova (2840)</p>
              <div className="flex items-center gap-1 text-tertiary text-xs font-bold">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                +12 Rating
              </div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-on-surface">Global Leaderboard</h1>
            <p className="text-xs tracking-[0.2em] uppercase text-on-surface-variant mt-2">Top Active Duelists</p>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-on-surface-variant">Your Rank</p>
            <p className="text-3xl font-black text-primary">#128</p>
          </div>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 lg:col-span-8">
            <div className="glass-panel p-6 border border-outline-variant/20">
              <div className="grid grid-cols-12 text-[10px] uppercase tracking-widest text-on-surface-variant pb-3 border-b border-outline-variant/20">
                <span className="col-span-2">Rank</span>
                <span className="col-span-6">Player</span>
                <span className="col-span-2 text-right">Rating</span>
                <span className="col-span-2 text-right">Streak</span>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {[
                  ["#1", "MagnusCarlsen", "2850", "5W"],
                  ["#2", "Alex_Nova", "2840", "3W"],
                  ["#3", "Scholar_99", "2795", "2W"],
                  ["#4", "QuantumMind", "2742", "1W"],
                  ["#5", "LogicLancer", "2698", "4W"],
                ].map(([rank, name, rating, streak]) => (
                  <div key={rank} className="grid grid-cols-12 items-center py-4">
                    <span className="col-span-2 font-black text-primary">{rank}</span>
                    <span className="col-span-6 font-bold">{name}</span>
                    <span className="col-span-2 text-right font-bold">{rating}</span>
                    <span className="col-span-2 text-right text-tertiary font-bold">{streak}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-surface-container-low p-6 border-l-2 border-primary">
              <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4">Season Snapshot</h4>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Active Duelists</span>
                  <span className="font-black">142K+</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Top Elo</span>
                  <span className="font-black text-primary">2850</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Your Percentile</span>
                  <span className="font-black text-tertiary">Top 3.2%</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/10 p-6">
              <div className="text-center mb-4">
                <span className="material-symbols-outlined text-secondary text-4xl mb-2">military_tech</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Current Reward Pool</p>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-left">
                  <p className="text-3xl font-black tracking-tighter text-on-surface">+45</p>
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant">XP</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black tracking-tighter text-tertiary">+22</p>
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant">Gems</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

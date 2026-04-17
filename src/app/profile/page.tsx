import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { UserStatsPanel } from "@/components/dashboard/UserStatsPanel";

export default function ProfilePage() {
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
            <Link className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="/leaderboard">
              Leaderboard
            </Link>
            <a className="text-[#adc6ff] font-bold border-b-2 border-[#adc6ff] pb-1" href="#">
              Profile
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-[#94a3b8] hover:text-[#adc6ff] transition-all">notifications</button>
          <button className="material-symbols-outlined text-[#94a3b8] hover:text-[#adc6ff] transition-all">inbox</button>
          <UserButton />
        </div>
      </nav>

      <section className="min-h-screen pt-24 pb-12 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <UserStatsPanel mode="panel" />
            <div className="bg-surface-container p-6 border border-outline-variant/20">
              <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4">Identity</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Tier</span>
                  <span className="font-black text-primary">Grandmaster</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Region</span>
                  <span className="font-bold">EU West</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Member Since</span>
                  <span className="font-bold">2026</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="glass-panel p-8 border border-outline-variant/20">
              <h1 className="text-4xl font-black tracking-tight mb-2">Profile Overview</h1>
              <p className="text-on-surface-variant text-sm">
                Track your rank, consistency, and active goals in one place.
              </p>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-container-low p-4 border-l-2 border-primary">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Total Wins</p>
                  <p className="text-3xl font-black mt-2">142</p>
                </div>
                <div className="bg-surface-container-low p-4 border-l-2 border-tertiary">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Win Rate</p>
                  <p className="text-3xl font-black mt-2">64.2%</p>
                </div>
                <div className="bg-surface-container-low p-4 border-l-2 border-secondary">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Best Streak</p>
                  <p className="text-3xl font-black mt-2">11</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container p-6 border border-outline-variant/20">
              <h3 className="text-sm font-black uppercase tracking-widest mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  ["Won vs QuantumMind", "Chemistry Arena", "+18"],
                  ["Lost vs MagnusCarlsen", "Physics Arena", "-12"],
                  ["Won vs LogicLancer", "Math Arena", "+15"],
                ].map(([title, subtitle, delta]) => (
                  <div key={title} className="flex items-center justify-between p-4 bg-surface-container-low">
                    <div>
                      <p className="font-bold">{title}</p>
                      <p className="text-xs text-on-surface-variant">{subtitle}</p>
                    </div>
                    <span className={delta.startsWith("+") ? "font-black text-tertiary" : "font-black text-error"}>
                      {delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

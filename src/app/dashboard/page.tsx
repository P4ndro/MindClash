import { UserButton } from "@clerk/nextjs";
import { UserStatsPanel } from "@/components/dashboard/UserStatsPanel";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="bg-background text-on-background min-h-screen">
      <header className="bg-[#051426] text-[#adc6ff] font-['Inter'] font-medium text-sm tracking-tight shadow-[0_0_32px_rgba(5,20,38,0.06)] flex justify-between items-center w-full px-6 py-3 max-w-full mx-auto fixed top-0 z-50">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-[#adc6ff] to-[#4d8eff]">
            MindClash
          </span>
          <nav className="hidden md:flex gap-6">
            <a className="text-[#adc6ff] font-bold border-b-2 border-[#adc6ff] pb-1" href="#">
              Dashboard
            </a>
            <a className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="#">
              Training
            </a>
            <Link className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="/leaderboard">
              Leaderboard
            </Link>
            <a className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="#">
              Social
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/arena"
            className="bg-linear-to-br from-[#adc6ff] to-[#4d8eff] text-on-primary-container px-4 py-1.5 rounded-sm font-bold scale-95 active:opacity-80 transition-all"
          >
            Quick Play
          </Link>
          <UserButton />
        </div>
      </header>

      <aside className="hidden md:flex flex-col p-4 border-r border-[#122033] bg-[#0d1c2f] text-[#adc6ff] font-['Inter'] text-sm uppercase tracking-widest w-64 fixed left-0 top-0 pt-20 h-screen">
        <UserStatsPanel mode="sidebar" />
        <nav className="flex flex-col gap-1 grow">
          <div className="bg-linear-to-r from-[#adc6ff]/10 to-transparent text-[#adc6ff] border-l-4 border-[#adc6ff] flex items-center gap-3 px-4 py-3 cursor-pointer">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </div>
          <Link
            href="/arena"
            className="text-[#94a3b8] hover:bg-[#122033] hover:text-white transition-colors flex items-center gap-3 px-4 py-3 cursor-pointer"
          >
            <span className="material-symbols-outlined">swords</span>
            <span>Arena</span>
          </Link>
          <div className="text-[#94a3b8] hover:bg-[#122033] hover:text-white transition-colors flex items-center gap-3 px-4 py-3 cursor-pointer">
            <span className="material-symbols-outlined">psychology</span>
            <span>Training</span>
          </div>
          <Link
            href="/leaderboard"
            className="text-[#94a3b8] hover:bg-[#122033] hover:text-white transition-colors flex items-center gap-3 px-4 py-3 cursor-pointer"
          >
            <span className="material-symbols-outlined">leaderboard</span>
            <span>Leaderboard</span>
          </Link>
          <Link
            href="/profile"
            className="text-[#94a3b8] hover:bg-[#122033] hover:text-white transition-colors flex items-center gap-3 px-4 py-3 cursor-pointer"
          >
            <span className="material-symbols-outlined">account_circle</span>
            <span>Profile</span>
          </Link>
        </nav>
      </aside>

      <div className="md:ml-64 pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-8 bg-surface-container-low rounded-sm overflow-hidden relative group">
            <div className="absolute inset-0 opacity-20">
              <img
                alt="Abstract digital arena background"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAV0JS6gQ6qi4ACZjzPO7Qf3LDTkoGq_wP31XI206zy0uMlz2RpvrlHmP5xueEUn_mTuKZsyoW0SJkdPbWVmXZFai-BMyHjRNMWOwKFoE7CwFYHx1FtvcLUcKPZRlwVZTy14m6W1XauSyVZbVmFX6ztwZGZXWHY5eLngWANzGiH7_F-ONlhHFXKZLH6drVLm-MBX_VGWikOAUmcy6xq-N8L6kjPPdiT8f8dnBVCNBbQCTE46qg2U_ENJYPZcr0cDQ23bCSxuEGdUsM8"
              />
            </div>
            <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between gap-8 bg-linear-to-r from-surface-container-low via-surface-container-low/80 to-transparent">
              <div className="max-w-md">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-none">
                  READY FOR THE NEXT <span className="text-primary">CLASH?</span>
                </h1>
                <p className="text-on-surface-variant mb-8 text-sm">
                  Select your battlefield and prove your intellectual dominance in a real-time 1v1 matchup.
                </p>
                <Link
                  href="/arena"
                  className="inline-block w-full md:w-auto px-12 py-4 bg-linear-to-br from-[#adc6ff] to-[#4d8eff] text-on-primary-container text-lg font-black tracking-widest uppercase rounded-sm shadow-[0_0_24px_rgba(77,142,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Start Matchmaking
                </Link>
              </div>
            </div>
          </section>

          <section className="lg:col-span-4 flex flex-col gap-6">
            <UserStatsPanel mode="panel" />
            <div className="bg-surface-container p-6 rounded-sm">
              <div className="flex justify-between items-end mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Win/Loss Ratio
                </span>
                <span className="text-xl font-black">64.2%</span>
              </div>
              <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden flex">
                <div className="h-full bg-tertiary w-[64%]" />
                <div className="h-full bg-error w-[36%]" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

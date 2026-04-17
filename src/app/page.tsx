import Link from "next/link";

export default function Home() {
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
            <a className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="#">
              Leaderboard
            </a>
            <a className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="#">
              Social
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-linear-to-br from-[#adc6ff] to-[#4d8eff] text-on-primary-container px-4 py-1.5 rounded-sm font-bold scale-95 active:opacity-80 transition-all">
            Quick Play
          </button>
          <Link
            href="/sign-in"
            className="text-xs text-[#adc6ff] border border-[#adc6ff]/40 px-2 py-1 rounded-sm hover:bg-[#122033]"
          >
            Mock Sign In
          </Link>
          <Link
            href="/sign-up"
            className="text-xs text-[#94a3b8] border border-[#94a3b8]/40 px-2 py-1 rounded-sm hover:bg-[#122033]"
          >
            Mock Sign Up
          </Link>
          <img
            alt="User profile avatar"
            className="w-8 h-8 rounded-full object-cover border border-outline-variant"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdWnDVsjOXvPxod0NWR0k21ch2YRT8WSR-uDF2AuzkivxvwdUXYpa7uXMEeG5XauVaWIIAnWrBLG3V5UpRC7NliKFda3mSO6wOAKDXs3w9dZFCXANSbkoWmIWR-ncDAr5LT6grP53HHrAeuL59U60Fndup3Q-hVaelvF6tLjjr6mmHoRI2GxzsbrQ96nTEOB4MUxyLGNTyChceMAFnB6gdJUG5gV0cMoB8M5Gm9ZoSUKo9kCHOTTJDW324Y_xwwiaGEmPmqrx-oEBc"
          />
        </div>
      </header>

      <aside className="hidden md:flex flex-col p-4 border-r border-[#122033] bg-[#0d1c2f] text-[#adc6ff] font-['Inter'] text-sm uppercase tracking-widest w-64 fixed left-0 top-0 pt-20 h-screen">
        <div className="flex items-center gap-3 mb-8 bg-[#122033] p-3 rounded-sm">
          <div className="w-10 h-10 bg-secondary-container flex items-center justify-center text-on-secondary-container rounded-sm shadow-inner">
            <span className="material-symbols-outlined fill-icon">military_tech</span>
          </div>
          <div>
            <div className="text-[10px] text-on-surface-variant leading-none mb-1">Grandmaster</div>
            <div className="font-black tracking-tight text-white normal-case text-lg">Rating: 2840</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 grow">
          <div className="bg-linear-to-r from-[#adc6ff]/10 to-transparent text-[#adc6ff] border-l-4 border-[#adc6ff] flex items-center gap-3 px-4 py-3 cursor-pointer">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </div>
          <div className="text-[#94a3b8] hover:bg-[#122033] hover:text-white transition-colors flex items-center gap-3 px-4 py-3 cursor-pointer">
            <span className="material-symbols-outlined">swords</span>
            <span>Arena</span>
          </div>
          <div className="text-[#94a3b8] hover:bg-[#122033] hover:text-white transition-colors flex items-center gap-3 px-4 py-3 cursor-pointer">
            <span className="material-symbols-outlined">psychology</span>
            <span>Training</span>
          </div>
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
                <button className="w-full md:w-auto px-12 py-4 bg-linear-to-br from-[#adc6ff] to-[#4d8eff] text-on-primary-container text-lg font-black tracking-widest uppercase rounded-sm shadow-[0_0_24px_rgba(77,142,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all">
                  Start Matchmaking
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-surface-container-high p-6 rounded-sm grow flex flex-col justify-center items-center relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">Global Standing</span>
              <div className="text-7xl font-black tracking-tighter leading-none mb-2">1850</div>
              <div className="flex items-center gap-2 text-tertiary text-sm font-bold bg-tertiary/10 px-3 py-1 rounded-full">
                <span className="material-symbols-outlined text-sm">arrow_upward</span>
                <span>+42 THIS WEEK</span>
              </div>
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          <section className="lg:col-span-4 bg-surface-container-low p-6 rounded-sm">
            <h3 className="text-sm font-black tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Recent Activity
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-container">
                <div>
                  <div className="text-xs font-bold text-white">Won vs Alpha_Byte</div>
                  <div className="text-[10px] text-on-surface-variant">Math Arena • 14m ago</div>
                </div>
                <div className="text-tertiary font-bold">+18</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container">
                <div>
                  <div className="text-xs font-bold text-white">Lost vs NeuralNode</div>
                  <div className="text-[10px] text-on-surface-variant">History Arena • 2h ago</div>
                </div>
                <div className="text-error font-bold">-12</div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-5 bg-surface-container p-6 rounded-sm">
            <h3 className="text-sm font-black tracking-widest uppercase flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-secondary">bolt</span>
              Active Challenges
            </h3>
            <div className="glass-panel p-5 rounded-sm border-l-4 border-secondary flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">CyberSage_01</div>
                <div className="text-[10px] text-secondary font-bold uppercase">Daily Challenge: Logic Puzzles</div>
              </div>
              <button className="bg-secondary-container text-on-secondary-container px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                Accept
              </button>
            </div>
          </section>

          <section className="lg:col-span-3 bg-surface-container-low p-6 rounded-sm">
            <h3 className="text-sm font-black tracking-widest uppercase mb-6">Friends Online</h3>
            <div className="space-y-4">
              <div className="text-xs font-bold">LogicLancer</div>
              <div className="text-xs font-bold">ByteQueen</div>
              <div className="text-xs font-bold opacity-50">PixelPioneer</div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

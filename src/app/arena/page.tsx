import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function ArenaPage() {
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
          <div className="hidden md:flex items-center gap-6 font-medium text-sm tracking-tight">
            <Link className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="/dashboard">
              Dashboard
            </Link>
            <a className="text-[#adc6ff] font-bold border-b-2 border-[#adc6ff] pb-1" href="#">
              Training
            </a>
            <Link className="text-[#94a3b8] hover:text-[#adc6ff] transition-colors" href="/leaderboard">
              Leaderboard
            </Link>
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

          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl font-black italic tracking-tighter text-outline-variant opacity-20">VS</div>
            <div className="w-48 h-1.5 bg-surface-container-highest overflow-hidden">
              <div className="w-[65%] h-full bg-linear-to-br from-[#adc6ff] to-[#4d8eff] shadow-[0_0_15px_rgba(173,198,255,0.4)]" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Momentum</div>
          </div>

          <div className="flex items-center gap-4 text-right flex-row-reverse">
            <div className="relative">
              <div className="w-16 h-16 bg-surface-container border-2 border-error-container overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Opponent avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEwuUc30jbg9prUxFAynhVUi16WnzIKnbxVvUZvCN32eA1ftW6eW80NrltuD9BIFJbsm1lwHuzTE9hK77nXlvOClFb9lW6DnKE-XC-XapUJEIoyujsuHjAw65CDlCP4A-PUAcYMOhj_fe5JwqVX8rOqCGpJndyXmdVu_g1bCak6_NTTKy7ohoO0kxG7f15wNPSfjuZhoPoUSWR1tBR9gjJAANPDKxg26jYNx4KuW5eXMQgwjnNChsJ9OQDaN-01JZmS3J_CtnXtg6r"
                />
              </div>
              <div className="absolute -bottom-2 -left-2 bg-secondary-container text-on-secondary-container px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
                GM
              </div>
            </div>
            <div>
              <h3 className="uppercase tracking-widest text-on-surface-variant mb-1 text-xs">Opponent</h3>
              <p className="font-bold text-lg text-error">MagnusCarlsen (2850)</p>
              <div className="flex items-center gap-1 text-on-surface-variant text-xs font-medium justify-end">
                <span className="material-symbols-outlined text-sm">history</span>
                Win Streak: 5
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-surface-container-low p-6 border-l-2 border-primary">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">science</span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Subject</h4>
                  <p className="text-lg font-bold">Organic Chemistry</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                    <span>Round Progress</span>
                    <span>04 / 10</span>
                  </div>
                  <div className="h-1 bg-surface-container-highest">
                    <div className="w-[40%] h-full bg-secondary" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-surface-container p-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4">Live Feed</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full bg-tertiary" />
                  <span className="text-on-surface-variant">MagnusCarlsen is thinking...</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-on-surface-variant">Your turn to act.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <div className="glass-panel p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-surface-container-highest">
                <div className="h-full bg-linear-to-br from-[#adc6ff] to-[#4d8eff] w-[72%]" />
              </div>
              <div className="flex justify-between items-start mb-8">
                <div className="bg-surface-container-highest px-4 py-2 text-primary font-black text-2xl tracking-tighter">
                  12.8s
                </div>
                <button className="material-symbols-outlined text-on-surface-variant hover:text-white">help_outline</button>
              </div>
              <div className="mb-12">
                <h2 className="text-3xl font-black tracking-tight leading-tight mb-6">
                  Identify the primary product of the reaction between Benzene and Nitric Acid in the presence of Sulfuric Acid at
                  50°C.
                </h2>
                <div className="w-full aspect-video bg-surface-container-lowest flex items-center justify-center border border-outline-variant/10">
                  <div className="flex flex-col items-center gap-4 text-on-surface-variant">
                    <span className="material-symbols-outlined text-6xl opacity-30">matter</span>
                    <p className="text-[10px] uppercase tracking-widest">Interactive Molecular Viewer Active</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["Option A", "Nitrobenzene"],
                  ["Option B", "Aniline"],
                  ["Option C", "Phenol"],
                  ["Option D", "Chlorobenzene"],
                ].map(([label, text]) => (
                  <button
                    key={label}
                    className="group flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container-high transition-all text-left border-l-2 border-transparent hover:border-primary"
                  >
                    <div>
                      <span className="text-[10px] font-black text-primary uppercase block mb-1">{label}</span>
                      <span className="font-bold">{text}</span>
                    </div>
                    <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-3 space-y-8">
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant mb-6 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary" />
                Match Intel
              </h4>
              <div className="space-y-4">
                <div className="bg-surface-container-low p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-on-surface-variant">YOUR ACCURACY</span>
                    <span className="text-xs font-black text-primary">92%</span>
                  </div>
                  <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="w-[92%] h-full bg-primary" />
                  </div>
                </div>
                <div className="bg-surface-container-low p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-on-surface-variant">OPPONENT ACCURACY</span>
                    <span className="text-xs font-black text-error">88%</span>
                  </div>
                  <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="w-[88%] h-full bg-error" />
                  </div>
                </div>
              </div>
            </div>
            <button className="w-full py-4 bg-error-container text-on-error-container text-xs font-black uppercase tracking-widest hover:bg-error transition-colors">
              Surrender Match
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

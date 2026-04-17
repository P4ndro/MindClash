"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type UserStatsPanelProps = {
  mode: "sidebar" | "panel";
};

export function UserStatsPanel({ mode }: UserStatsPanelProps) {
  const user = useQuery(api.users.getUserOptional);

  const isLoading = user === undefined;
  const isSyncing = user === null;

  const username = user?.username ?? "MindClasher";
  const email = user?.email ?? "syncing@mindclash.local";
  const rating = user?.rating ?? 1000;
  const rankTier =
    rating >= 2200 ? "Grandmaster" : rating >= 1800 ? "Master" : rating >= 1400 ? "Challenger" : "Contender";

  if (mode === "sidebar") {
    return (
      <div className="flex items-center gap-3 mb-8 bg-[#122033] p-3 rounded-sm">
        <div className="w-10 h-10 bg-secondary-container flex items-center justify-center text-on-secondary-container rounded-sm shadow-inner">
          <span className="material-symbols-outlined fill-icon">military_tech</span>
        </div>
        <div>
          <div className="text-[10px] text-on-surface-variant leading-none mb-1">
            {isLoading ? "Loading profile..." : rankTier}
          </div>
          <div className="font-black tracking-tight text-white normal-case text-lg">Rating: {rating}</div>
          <div className="text-[10px] text-on-surface-variant normal-case truncate max-w-[180px]">
            {isSyncing ? "Syncing account..." : `${username} • ${email}`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-high p-6 rounded-sm grow flex flex-col justify-center items-center relative overflow-hidden">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">Global Standing</span>
      <div className="text-7xl font-black tracking-tighter leading-none mb-2">{rating}</div>
      <div className="flex items-center gap-2 text-tertiary text-sm font-bold bg-tertiary/10 px-3 py-1 rounded-full">
        <span className="material-symbols-outlined text-sm">account_circle</span>
        <span className="max-w-[180px] truncate">{isSyncing ? "Syncing profile..." : username}</span>
      </div>
    </div>
  );
}

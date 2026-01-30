"use client";

import { useState, useEffect } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface LeaderboardEntry {
  rank: number;
  username: string;
  country: string | null;
  score: number;
  accuracy: number;
  correctCount: number;
  totalImages: number;
  avgTime: number | null;
  createdAt: string;
}

interface CountryItem {
  name: string;
  code: string;
  flag: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/leaderboard").then((r) => r.json()),
      fetch("/api/countries").then((r) => r.json()),
    ])
      .then(([lb, co]) => {
        setEntries(lb.leaderboard || []);
        setCountries(Array.isArray(co) ? co : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getFlag = (countryName: string | null) => {
    if (!countryName) return "";
    const found = countries.find((c) => c.name === countryName || c.code === countryName);
    return found?.flag || "";
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen bg-[#020617] text-slate-50 overflow-hidden relative">
        {/* Tactical background */}
        <div className="fixed inset-0 z-0">
          {/* Base background image */}
          <div className="absolute inset-0 opacity-10 mix-blend-overlay">
            <Image src="/assets/images/backgrounds/lol.webp" alt="" fill sizes="100vw" quality={60} className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/30 via-[#020617]/70 to-[#020617]" />

          <div className="absolute inset-0 bg-hex opacity-[0.015]" />
          <div className="absolute inset-0 bg-scanlines" />
          <m.div
            animate={{ y: ["0%", "100%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[1px] opacity-10 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, #ff4655, #fd4556, transparent)" }}
          />
          <m.div animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.15, 0.08] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -left-40 w-[400px] h-[400px] rounded-full blur-[120px]">
            <div className="w-full h-full bg-gradient-to-br from-[#ff4655]/30 to-orange-600/10 rounded-full" />
          </m.div>
          <m.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.06, 0.15, 0.06] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 -right-40 w-[400px] h-[400px] rounded-full blur-[100px]">
            <div className="w-full h-full bg-gradient-to-br from-[#00eeff]/25 to-cyan-600/10 rounded-full" />
          </m.div>
          {/* Corner HUDs */}
          <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-30 hidden lg:block">
            <div className="absolute top-4 left-4 w-20 h-[1px] bg-gradient-to-r from-[#ff4655] to-transparent" />
            <div className="absolute top-4 left-4 h-20 w-[1px] bg-gradient-to-b from-[#ff4655] to-transparent" />
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-30 hidden lg:block">
            <div className="absolute top-4 right-4 w-20 h-[1px] bg-gradient-to-l from-[#00eeff] to-transparent" />
            <div className="absolute top-4 right-4 h-20 w-[1px] bg-gradient-to-b from-[#00eeff] to-transparent" />
          </div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 py-6">
          {/* Nav bar */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/"
              className="group relative px-4 py-2 inline-flex items-center gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(255, 70, 85, 0.1), transparent)",
                clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
              }}
            >
              <span className="text-[#ff4655] text-lg font-black">&larr;</span>
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-white transition-colors">
                Home
              </span>
            </Link>
            <Link href="/game">
              <m.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-6 py-2.5 font-black uppercase tracking-widest text-xs cursor-pointer clip-skew overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg, #ff4655, #00eeff)",
                  boxShadow: "0 0 20px rgba(255, 70, 85, 0.2)",
                }}
              >
                <m.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                <span className="relative z-10">Play Now</span>
              </m.button>
            </Link>
          </div>

          {/* Title */}
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            {/* Tactical badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 clip-skew"
              style={{ background: "rgba(255, 70, 85, 0.08)", border: "1px solid rgba(255, 70, 85, 0.2)" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4655] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4655]" />
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff4655]">Live Rankings</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black mb-2">
              <span className="gradient-text">Leaderboard</span>
            </h1>

            <div className="flex items-center justify-center gap-3">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#ff4655]/50" />
              <div className="w-2 h-2 rotate-45 bg-[#ff4655]/50" />
              <div className="w-8 h-px bg-white/20" />
              <div className="w-2 h-2 rotate-45 bg-[#00eeff]/50" />
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#00eeff]/50" />
            </div>

            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-3">
              Top Players Worldwide
            </p>
          </m.div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-white/10 border-t-[#00eeff] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs text-white/30 font-bold uppercase tracking-wider">Loading...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && entries.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 clip-tactical bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-white/40 font-bold">No scores yet</p>
              <p className="text-xs text-white/20 mt-1">Be the first to play!</p>
            </div>
          )}

          {/* Entries */}
          {!loading && entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((entry, i) => {
                const isTopThree = entry.rank <= 3;
                const medalColors: Record<number, string> = {
                  1: "#fbbf24",
                  2: "#94a3b8",
                  3: "#cd7f32",
                };

                return (
                  <m.div key={`${entry.username}-${entry.createdAt}`}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-4 sm:px-6 py-4 flex items-center gap-4 clip-tactical-sm"
                    style={{
                      background: isTopThree
                        ? `linear-gradient(135deg, ${medalColors[entry.rank]}08, transparent)`
                        : "rgba(255, 255, 255, 0.02)",
                      border: isTopThree
                        ? `1px solid ${medalColors[entry.rank]}30`
                        : "1px solid rgba(255, 255, 255, 0.05)",
                      boxShadow: isTopThree ? `0 0 20px ${medalColors[entry.rank]}10` : "none",
                    }}
                  >
                    {/* Rank */}
                    <div className="w-10 text-center shrink-0">
                      {isTopThree ? (
                        <span className="text-2xl font-black" style={{ color: medalColors[entry.rank] }}>
                          {entry.rank === 1 ? "\u{1F947}" : entry.rank === 2 ? "\u{1F948}" : "\u{1F949}"}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-white/30">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {entry.country && (
                          <span className="text-sm">{getFlag(entry.country)}</span>
                        )}
                        <span className="font-bold text-sm truncate">{entry.username}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-white/30 font-bold">
                          {entry.correctCount}/{entry.totalImages} correct
                        </span>
                        <span className="text-[10px] text-white/15">|</span>
                        <span className="text-[10px] text-white/30 font-bold">{entry.accuracy}% acc</span>
                        {entry.avgTime && (
                          <>
                            <span className="text-[10px] text-white/15">|</span>
                            <span className="text-[10px] text-white/30 font-bold">{entry.avgTime.toFixed(1)}s avg</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <span className="text-xl font-black gradient-text">{entry.score.toLocaleString()}</span>
                      <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em]">pts</p>
                    </div>
                  </m.div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-12 mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#ff4655]/30" />
              <span className="text-[8px] font-black text-white/20 uppercase tracking-wider">aioreal.fun</span>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#00eeff]/30" />
            </div>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}

"use client";

import { m } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface GameResult {
  imageId: string;
  url: string;
  isAi: boolean;
  userAnswer: boolean;
  correct: boolean;
  timeLeft: number;
}

interface GameOverCardProps {
  username: string;
  country: string;
  score: number;
  results: GameResult[];
  rank: number | null;
  isSaving: boolean;
  onPlayAgain: () => void;
}

export default function GameOverCard({
  username,
  country,
  score,
  results,
  rank,
  isSaving,
  onPlayAgain,
}: GameOverCardProps) {
  const correctCount = results.filter((r) => r.correct).length;
  const accuracy = Math.round((correctCount / results.length) * 100);
  const avgTime = results.reduce((sum, r) => sum + (5 - r.timeLeft), 0) / results.length;

  const grade =
    accuracy >= 90 ? "S" : accuracy >= 75 ? "A" : accuracy >= 60 ? "B" : accuracy >= 40 ? "C" : "D";
  const gradeColor =
    grade === "S" ? "#00eeff" : grade === "A" ? "#10b981" : grade === "B" ? "#f59e0b" : grade === "C" ? "#f97316" : "#ff4655";

  return (
    <m.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg"
    >
      <div className="glass overflow-hidden clip-tactical" style={{ boxShadow: "0 0 60px rgba(0, 238, 255, 0.08)" }}>
        {/* Header */}
        <div className="p-8 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(255, 70, 85, 0.12), rgba(0, 238, 255, 0.12))" }}
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#00eeff]/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#ff4655]/10 blur-2xl" />

          <div className="relative z-10">
            {/* Tactical badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 clip-skew"
              style={{ background: "rgba(0, 238, 255, 0.08)", border: "1px solid rgba(0, 238, 255, 0.2)" }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00eeff] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00eeff]" />
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00eeff]">Mission Complete</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black mb-1">{username}</h2>
            {country && (
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider">{country}</p>
            )}
          </div>
        </div>

        {/* Score section */}
        <div className="px-8 py-6">
          {/* Grade + Score */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">Total Score</p>
              <p className="text-4xl sm:text-5xl font-black gradient-text">{score}</p>
            </div>
            <m.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
              className="w-20 h-20 flex items-center justify-center clip-tactical"
              style={{
                background: `${gradeColor}12`,
                border: `2px solid ${gradeColor}40`,
                boxShadow: `0 0 30px ${gradeColor}20`,
              }}
            >
              <span className="text-4xl font-black" style={{ color: gradeColor }}>{grade}</span>
            </m.div>
          </div>

          {/* Stats grid - Tactical boxes */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Correct", value: `${correctCount}/${results.length}`, color: "#10b981" },
              { label: "Accuracy", value: `${accuracy}%`, color: "#00eeff" },
              { label: "Avg Time", value: `${avgTime.toFixed(1)}s`, color: "#f59e0b" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 clip-tactical-sm"
                style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}
              >
                <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/30 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Rank */}
          {rank && (
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="text-center mb-6 p-4 clip-tactical-sm"
              style={{
                background: "linear-gradient(135deg, rgba(0, 238, 255, 0.06), rgba(255, 70, 85, 0.06))",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">Global Rank</p>
              <p className="text-2xl font-black gradient-text">#{rank}</p>
            </m.div>
          )}

          {isSaving && (
            <div className="text-center mb-4">
              <div className="w-5 h-5 border-2 border-white/10 border-t-[#00eeff] rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[9px] text-white/30 font-black uppercase tracking-wider">Saving score...</p>
            </div>
          )}

          {/* Image results grid */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-px bg-gradient-to-r from-[#ff4655]/50 to-transparent" />
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Your Answers</p>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-6 gap-2">
              {results.map((r, i) => (
                <m.div key={i}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative portrait-image rounded-lg overflow-hidden clip-tactical-sm"
                  style={{ border: `1px solid ${r.correct ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 70, 85, 0.3)"}` }}
                >
                  <Image src={r.url} alt={`Image ${i + 1}`} fill className="object-cover" sizes="60px" />
                  <div className={`absolute inset-0 flex items-center justify-center ${r.correct ? "bg-emerald-500/40" : "bg-red-500/40"}`}>
                    {r.correct ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </div>
                  {/* AI/Real label */}
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5">
                    <p className="text-[6px] font-black text-center uppercase tracking-wider"
                      style={{ color: r.isAi ? "#ff4655" : "#00eeff" }}
                    >
                      {r.isAi ? "AI" : "Real"}
                    </p>
                  </div>
                </m.div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <m.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onPlayAgain}
              className="w-full py-4 font-black uppercase tracking-[0.15em] text-sm cursor-pointer clip-skew overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, #ff4655, #00eeff)",
                boxShadow: "0 0 30px rgba(255, 70, 85, 0.15)",
              }}
            >
              <m.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span className="relative z-10">Play Again</span>
            </m.button>

            <Link href="/leaderboard" className="block">
              <m.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-4 font-black uppercase tracking-[0.15em] text-sm cursor-pointer clip-tactical-sm transition-colors"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                View Leaderboard
              </m.button>
            </Link>

            <Link href="/" className="block text-center pt-2">
              <span className="text-xs text-white/30 hover:text-white/50 transition-colors font-bold uppercase tracking-wider">
                Back to Home
              </span>
            </Link>
          </div>
        </div>
      </div>
    </m.div>
  );
}

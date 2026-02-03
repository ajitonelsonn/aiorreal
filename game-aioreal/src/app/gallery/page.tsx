"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface GalleryItem {
  id: string;
  url: string;
  username: string;
  score: number;
  country: string | null;
  createdAt: string;
}

interface CountryItem {
  name: string;
  code: string;
  flag: string;
}

const REFRESH_INTERVAL = 30000;

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    clickSoundRef.current = new Audio("/assets/sounds/sfx/click.mp3");
    clickSoundRef.current.volume = 0.3;
  }, []);

  useEffect(() => {
    const handleClick = () => {
      if (clickSoundRef.current) {
        clickSoundRef.current.currentTime = 0;
        clickSoundRef.current.play().catch(() => {});
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const fetchData = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsRefreshing(true);
    try {
      const [galleryRes, coRes] = await Promise.all([
        fetch("/api/gallery"),
        isInitial ? fetch("/api/countries") : Promise.resolve(null),
      ]);
      const galleryData = await galleryRes.json();
      if (coRes) {
        const co = await coRes.json();
        setCountries(Array.isArray(co) ? co : []);
      }

      const newItems: GalleryItem[] = Array.isArray(galleryData)
        ? galleryData
        : [];
      setItems(newItems);
      setLastUpdated(new Date());
      if (isInitial) setLoading(false);
    } catch {
      if (isInitial) setLoading(false);
    }
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Close modal on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedItem(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const getFlag = (countryName: string | null) => {
    if (!countryName) return "";
    const found = countries.find(
      (c) => c.name === countryName || c.code === countryName,
    );
    return found?.flag || "";
  };

  const getGrade = (score: number) => {
    if (score >= 1500) return { label: "S+", color: "#ff4655", bg: "rgba(255, 70, 85, 0.15)" };
    if (score >= 1200) return { label: "S", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
    if (score >= 900) return { label: "A", color: "#00eeff", bg: "rgba(0, 238, 255, 0.15)" };
    if (score >= 600) return { label: "B", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" };
    return { label: "C", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)" };
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen bg-[#020617] text-slate-50 overflow-hidden relative">
        {/* Tactical background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-10 mix-blend-overlay">
            <Image
              src="/assets/images/backgrounds/lol.webp"
              alt=""
              fill
              sizes="100vw"
              quality={60}
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/30 via-[#020617]/70 to-[#020617]" />
          <div className="absolute inset-0 bg-hex opacity-[0.015]" />
          <div className="absolute inset-0 bg-scanlines" />
          <m.div
            animate={{ y: ["0%", "100%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[1px] opacity-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, #ff4655, #fd4556, transparent)",
            }}
          />
          <m.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.15, 0.08] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -left-40 w-[400px] h-[400px] rounded-full blur-[120px]"
          >
            <div className="w-full h-full bg-gradient-to-br from-[#ff4655]/30 to-orange-600/10 rounded-full" />
          </m.div>
          <m.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.06, 0.15, 0.06] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 -right-40 w-[400px] h-[400px] rounded-full blur-[100px]"
          >
            <div className="w-full h-full bg-gradient-to-br from-[#00eeff]/25 to-cyan-600/10 rounded-full" />
          </m.div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
          {/* Nav bar */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="group relative px-4 py-2 inline-flex items-center gap-3"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 70, 85, 0.1), transparent)",
                  clipPath:
                    "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
                }}
              >
                <span className="text-[#ff4655] text-lg font-black">
                  &larr;
                </span>
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-white transition-colors">
                  Home
                </span>
              </Link>
              <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                <Image
                  src="/assets/logo/aiorreal_logo.jpg"
                  alt="AI or Real Logo"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/leaderboard">
                <m.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 font-black uppercase tracking-widest text-xs cursor-pointer clip-tactical-sm transition-colors"
                  style={{
                    background: "rgba(0, 238, 255, 0.08)",
                    border: "1px solid rgba(0, 238, 255, 0.2)",
                    color: "#00eeff",
                  }}
                >
                  Leaderboard
                </m.button>
              </Link>
              <Link href="/game">
                <m.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-2.5 font-black uppercase tracking-widest text-xs cursor-pointer clip-skew overflow-hidden relative"
                  style={{
                    background: "linear-gradient(135deg, #ff4655, #00eeff)",
                    boxShadow: "0 0 20px rgba(255, 70, 85, 0.2)",
                  }}
                >
                  <m.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                  />
                  <span className="relative z-10">Play Now</span>
                </m.button>
              </Link>
            </div>
          </div>

          {/* Hero header */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 mb-5 clip-skew"
              style={{
                background: "rgba(255, 70, 85, 0.08)",
                border: "1px solid rgba(255, 70, 85, 0.2)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4655] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4655]" />
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#ff4655]">
                Live Feed
              </span>
              {isRefreshing && (
                <div className="w-3 h-3 border border-[#ff4655]/30 border-t-[#ff4655] rounded-full animate-spin ml-1" />
              )}
            </div>

            <h1 className="text-5xl sm:text-6xl font-black mb-3">
              <span className="gradient-text">Wall of Fame</span>
            </h1>

            <p className="text-xs text-white/30 font-bold uppercase tracking-[0.2em] mb-4">
              Player card submissions from the arena
            </p>

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-20 h-px bg-gradient-to-r from-transparent to-[#ff4655]/50" />
              <div className="w-2 h-2 rotate-45 bg-[#ff4655]/50" />
              <div className="w-10 h-px bg-white/20" />
              <div className="w-2 h-2 rotate-45 bg-[#00eeff]/50" />
              <div className="w-20 h-px bg-gradient-to-l from-transparent to-[#00eeff]/50" />
            </div>

            {/* Stats bar */}
            {!loading && items.length > 0 && (
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-3"
              >
                <div
                  className="clip-tactical-sm px-4 py-2 flex items-center gap-2"
                  style={{
                    background: "rgba(0, 238, 255, 0.06)",
                    border: "1px solid rgba(0, 238, 255, 0.15)",
                  }}
                >
                  <svg
                    className="w-3.5 h-3.5 text-[#00eeff] opacity-60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-black text-[#00eeff] tabular-nums">
                    {items.length}
                  </span>
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">
                    Cards
                  </span>
                </div>
                <div
                  className="clip-tactical-sm px-4 py-2 flex items-center gap-2"
                  style={{
                    background: "rgba(255, 70, 85, 0.06)",
                    border: "1px solid rgba(255, 70, 85, 0.15)",
                  }}
                >
                  <svg
                    className="w-3.5 h-3.5 text-[#ff4655] opacity-60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">
                    Auto
                  </span>
                  <span className="text-sm font-black text-[#ff4655]">30s</span>
                </div>
                {lastUpdated && (
                  <span className="text-[9px] text-white/20 font-bold">
                    Updated{" "}
                    {lastUpdated.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </m.div>
            )}
          </m.div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-24">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-[#00eeff] rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-transparent border-t-[#ff4655] rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              </div>
              <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">
                Loading Gallery
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && items.length === 0 && (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-24"
            >
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 70, 85, 0.1), rgba(0, 238, 255, 0.1))",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <svg
                  className="w-10 h-10 text-white/20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-white/40 text-sm font-black uppercase tracking-wider mb-2">
                No submissions yet
              </p>
              <p className="text-white/20 text-xs mb-6">
                Play the game and upload your card to appear here!
              </p>
              <Link href="/game">
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 font-black uppercase tracking-widest text-xs cursor-pointer clip-skew overflow-hidden relative"
                  style={{
                    background: "linear-gradient(135deg, #ff4655, #00eeff)",
                    boxShadow: "0 0 30px rgba(255, 70, 85, 0.2)",
                  }}
                >
                  <span className="relative z-10">Play Now</span>
                </m.button>
              </Link>
            </m.div>
          )}

          {/* Gallery Masonry Grid */}
          {!loading && items.length > 0 && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12"
            >
              {items.map((item, index) => {
                const grade = getGrade(item.score);
                return (
                  <m.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.8) }}
                    className="group cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div
                      className="relative overflow-hidden rounded-xl transition-all duration-300 group-hover:shadow-lg"
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      {/* Grade badge - top right */}
                      <div
                        className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-lg"
                        style={{
                          background: grade.bg,
                          border: `1px solid ${grade.color}40`,
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <span
                          className="text-xs font-black"
                          style={{ color: grade.color }}
                        >
                          {grade.label}
                        </span>
                      </div>

                      {/* Image */}
                      <div className="relative w-full overflow-hidden">
                        <Image
                          src={item.url}
                          alt={`Submission by ${item.username}`}
                          width={600}
                          height={800}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Bottom gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/20 via-40% to-transparent" />

                        {/* Hover shimmer */}
                        <m.div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(255, 70, 85, 0.05), rgba(0, 238, 255, 0.05))",
                          }}
                        />

                        {/* Corner scan marks on hover */}
                        <div className="absolute top-3 left-3 w-6 h-6 pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity">
                          <div className="absolute top-0 left-0 w-full h-[1px] bg-[#00eeff]" />
                          <div className="absolute top-0 left-0 h-full w-[1px] bg-[#00eeff]" />
                        </div>
                        <div className="absolute bottom-16 right-3 w-6 h-6 pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity">
                          <div className="absolute bottom-0 right-0 w-full h-[1px] bg-[#ff4655]" />
                          <div className="absolute bottom-0 right-0 h-full w-[1px] bg-[#ff4655]" />
                        </div>
                      </div>

                      {/* Info bar */}
                      <div className="relative px-4 py-3 -mt-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Player avatar */}
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(255, 70, 85, 0.2), rgba(0, 238, 255, 0.2))",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                              }}
                            >
                              {item.country && getFlag(item.country) ? (
                                <span className="text-sm">
                                  {getFlag(item.country)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-white/50 uppercase">
                                  {item.username.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate">
                                {item.username}
                              </p>
                              <p className="text-[9px] text-white/25 font-bold">
                                {new Date(item.createdAt).toLocaleDateString(
                                  [],
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-right flex-shrink-0">
                            <p
                              className="text-sm font-black tabular-nums"
                              style={{ color: grade.color }}
                            >
                              {item.score.toLocaleString()}
                            </p>
                            <p className="text-[8px] text-white/20 font-black uppercase tracking-wider">
                              pts
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </m.div>
                );
              })}
            </m.div>
          )}
        </div>

        {/* Image Modal */}
        <AnimatePresence>
          {selectedItem && (
            <m.div
              key="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
              onClick={() => setSelectedItem(null)}
            >
              <m.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.2 }}
                className="relative max-w-3xl max-h-[90vh] w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Card container */}
                <div
                  className="relative overflow-hidden rounded-2xl"
                  style={{
                    background: "rgba(15, 25, 35, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow:
                      "0 25px 80px rgba(0, 0, 0, 0.8), 0 0 60px rgba(0, 238, 255, 0.05)",
                  }}
                >
                  {/* Image */}
                  <div className="relative w-full">
                    <Image
                      src={selectedItem.url}
                      alt={`Submission by ${selectedItem.username}`}
                      width={1200}
                      height={1600}
                      className="w-full h-auto object-contain max-h-[70vh]"
                    />
                  </div>

                  {/* Info footer */}
                  <div className="px-6 py-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(255, 70, 85, 0.2), rgba(0, 238, 255, 0.2))",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          {selectedItem.country &&
                          getFlag(selectedItem.country) ? (
                            <span className="text-lg">
                              {getFlag(selectedItem.country)}
                            </span>
                          ) : (
                            <span className="text-sm font-black text-white/50 uppercase">
                              {selectedItem.username.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">
                            {selectedItem.username}
                          </p>
                          <p className="text-[10px] text-white/30 font-bold">
                            {new Date(
                              selectedItem.createdAt,
                            ).toLocaleDateString([], {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {(() => {
                          const grade = getGrade(selectedItem.score);
                          return (
                            <div
                              className="px-3 py-1.5 rounded-lg flex items-center gap-2"
                              style={{
                                background: grade.bg,
                                border: `1px solid ${grade.color}30`,
                              }}
                            >
                              <span
                                className="text-xs font-black"
                                style={{ color: grade.color }}
                              >
                                {grade.label}
                              </span>
                              <span
                                className="text-sm font-black tabular-nums"
                                style={{ color: grade.color }}
                              >
                                {selectedItem.score.toLocaleString()} pts
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center font-black text-white bg-black/60 hover:bg-[#ff4655] backdrop-blur-md transition-colors rounded-lg cursor-pointer"
                  style={{
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}

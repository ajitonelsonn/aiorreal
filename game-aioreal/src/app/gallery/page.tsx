"use client";

import { useState, useEffect, useCallback } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
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

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

      const newItems: GalleryItem[] = Array.isArray(galleryData) ? galleryData : [];
      setItems(newItems);
      setLastUpdated(new Date());
      if (isInitial) setLoading(false);
    } catch {
      if (isInitial) setLoading(false);
    }
    setIsRefreshing(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getFlag = (countryName: string | null) => {
    if (!countryName) return "";
    const found = countries.find(
      (c) => c.name === countryName || c.code === countryName,
    );
    return found?.flag || "";
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
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.08, 0.15, 0.08],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -left-40 w-[400px] h-[400px] rounded-full blur-[120px]"
          >
            <div className="w-full h-full bg-gradient-to-br from-[#ff4655]/30 to-orange-600/10 rounded-full" />
          </m.div>
          <m.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.06, 0.15, 0.06],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 -right-40 w-[400px] h-[400px] rounded-full blur-[100px]"
          >
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

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
          {/* Nav bar */}
          <div className="flex items-center justify-between mb-8">
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

          {/* Title */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 mb-4 clip-skew"
              style={{
                background: "rgba(255, 70, 85, 0.08)",
                border: "1px solid rgba(255, 70, 85, 0.2)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4655] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4655]" />
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff4655]">
                Player Submissions
              </span>
              {isRefreshing && (
                <div className="w-3 h-3 border border-[#ff4655]/30 border-t-[#ff4655] rounded-full animate-spin ml-1" />
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl font-black mb-2">
              <span className="gradient-text">Gallery</span>
            </h1>

            <div className="flex items-center justify-center gap-3">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#ff4655]/50" />
              <div className="w-2 h-2 rotate-45 bg-[#ff4655]/50" />
              <div className="w-8 h-px bg-white/20" />
              <div className="w-2 h-2 rotate-45 bg-[#00eeff]/50" />
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#00eeff]/50" />
            </div>

            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-3">
              Community Highlights
              {lastUpdated && (
                <span className="ml-2 text-white/15">
                  &middot; Updated{" "}
                  {lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </p>
          </m.div>

          {/* Item count */}
          {!loading && items.length > 0 && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-4 mb-6"
            >
              <div
                className="clip-tactical-sm px-4 py-2 flex items-center gap-2"
                style={{
                  background: "rgba(0, 238, 255, 0.06)",
                  border: "1px solid rgba(0, 238, 255, 0.15)",
                }}
              >
                <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">
                  Total Items
                </span>
                <span className="text-sm font-black text-[#00eeff]">
                  {items.length}
                </span>
              </div>
              <div
                className="clip-tactical-sm px-4 py-2 flex items-center gap-2"
                style={{
                  background: "rgba(255, 70, 85, 0.06)",
                  border: "1px solid rgba(255, 70, 85, 0.15)",
                }}
              >
                <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">
                  Auto-Refresh
                </span>
                <span className="text-sm font-black text-[#ff4655]">30s</span>
              </div>
            </m.div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-white/10 border-t-[#00eeff] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs text-white/30 font-bold uppercase tracking-wider">
                Loading...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && items.length === 0 && (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <span className="text-2xl">🖼️</span>
              </div>
              <p className="text-white/40 text-sm font-bold uppercase tracking-wider">
                No gallery items yet
              </p>
              <p className="text-white/20 text-xs mt-2">
                Play the game to add your submission!
              </p>
            </m.div>
          )}

          {/* Gallery Grid */}
          {!loading && items.length > 0 && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8"
            >
              {items.map((item, index) => (
                <m.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className="group relative cursor-pointer"
                  onClick={() => setSelectedImage(item.url)}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    clipPath:
                      "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                  }}
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square overflow-hidden">
                    <Image
                      src={item.url}
                      alt={`Submission by ${item.username}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-60" />
                  </div>

                  {/* Info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {item.country && getFlag(item.country) && (
                          <span className="text-lg">{getFlag(item.country)}</span>
                        )}
                        <span className="text-xs font-black text-white truncate max-w-[120px]">
                          {item.username}
                        </span>
                      </div>
                      <div
                        className="px-2 py-1 text-[10px] font-black"
                        style={{
                          background: "rgba(0, 238, 255, 0.15)",
                          border: "1px solid rgba(0, 238, 255, 0.3)",
                          color: "#00eeff",
                          clipPath: "polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))",
                        }}
                      >
                        {item.score}
                      </div>
                    </div>
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Hover effect border */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, rgba(255, 70, 85, 0.1), rgba(0, 238, 255, 0.1))",
                      clipPath:
                        "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                    }}
                  />
                </m.div>
              ))}
            </m.div>
          )}
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
            onClick={() => setSelectedImage(null)}
          >
            <m.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full">
                <Image
                  src={selectedImage}
                  alt="Gallery item"
                  width={1200}
                  height={1200}
                  className="object-contain w-full h-full"
                />
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center font-black text-white bg-[#ff4655] hover:bg-[#ff4655]/80 transition-colors"
                style={{
                  clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
                }}
              >
                ✕
              </button>
            </m.div>
          </m.div>
        )}
      </div>
    </LazyMotion>
  );
}

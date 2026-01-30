"use client";

import { useState, useEffect } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen bg-[#020617] text-slate-50 selection:bg-cyan-500/30 overflow-hidden">
        {/* === VALORANT/LoL Tactical Background === */}
        <div className="fixed inset-0 z-0">
          {/* Base background image */}
          <div className="absolute inset-0 opacity-22 mix-blend-overlay">
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

          {/* Hexagonal grid */}
          <div className="absolute inset-0 bg-hex opacity-[0.015]" />
          {/* Diagonal scan lines */}
          <div className="absolute inset-0 bg-scanlines" />

          {/* Animated horizontal scan line */}
          <m.div
            animate={{ y: ["0%", "100%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[1px] opacity-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, #ff4655, #fd4556, transparent)",
            }}
          />

          {/* Mouse-following glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 238, 255, 0.05), transparent 40%)`,
            }}
          />

          {/* Animated orbs */}
          <m.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.12, 0.22, 0.12],
              x: [0, 80, 0],
              y: [0, 40, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px]"
          >
            <div className="w-full h-full bg-gradient-to-br from-[#ff4655]/40 to-orange-600/20 rounded-full" />
          </m.div>
          <m.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.1, 0.25, 0.1],
              x: [0, -60, 0],
              y: [0, 80, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/3 -right-40 w-[450px] h-[450px] rounded-full blur-[100px]"
          >
            <div className="w-full h-full bg-gradient-to-br from-[#00eeff]/30 to-cyan-600/20 rounded-full" />
          </m.div>
          <m.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.18, 0.08] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 left-1/2 w-[400px] h-[400px] rounded-full blur-[100px]"
          >
            <div className="w-full h-full bg-gradient-to-br from-red-600/30 to-[#ff4655]/20 rounded-full" />
          </m.div>

          {/* Corner HUD elements */}
          <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-30 hidden lg:block">
            <div className="absolute top-4 left-4 w-20 h-[1px] bg-gradient-to-r from-[#ff4655] to-transparent" />
            <div className="absolute top-4 left-4 h-20 w-[1px] bg-gradient-to-b from-[#ff4655] to-transparent" />
            <div className="absolute top-8 left-8 text-[8px] font-black text-[#ff4655]/50 uppercase tracking-[0.3em]">
              AI//
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-30 hidden lg:block">
            <div className="absolute top-4 right-4 w-20 h-[1px] bg-gradient-to-l from-[#00eeff] to-transparent" />
            <div className="absolute top-4 right-4 h-20 w-[1px] bg-gradient-to-b from-[#00eeff] to-transparent" />
            <div className="absolute top-8 right-8 text-[8px] font-black text-[#00eeff]/50 uppercase tracking-[0.3em]">
              {"//REAL"}
            </div>
          </div>
          <div className="absolute bottom-4 left-4 w-8 h-8 pointer-events-none opacity-20 hidden sm:block">
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-[#ff4655] to-transparent" />
            <div className="absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#ff4655] to-transparent" />
          </div>
          <div className="absolute bottom-4 right-4 w-8 h-8 pointer-events-none opacity-20 hidden sm:block">
            <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-[#00eeff] to-transparent" />
            <div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#00eeff] to-transparent" />
          </div>

          {/* Floating Hero Characters - Desktop only */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
            {[
              {
                src: "/assets/images/hero/Jett_Artwork_Full.webp",
                pos: "top-[10%] left-[3%]",
                delay: 0,
              },
              {
                src: "/assets/images/hero/Reyna_Artwork_Full.webp",
                pos: "top-[20%] right-[4%]",
                delay: 4,
              },
              {
                src: "/assets/images/hero/Sage_Artwork_Full.webp",
                pos: "bottom-[15%] left-[6%]",
                delay: 8,
              },
            ].map((hero, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: [0, 0.4, 0],
                  scale: [0.85, 1, 1.1],
                  x: i % 2 === 0 ? [0, 40, 0] : [0, -40, 0],
                  y: [0, -80, 0],
                }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  delay: hero.delay,
                  ease: "linear",
                }}
                className={`absolute ${hero.pos} w-48 h-[320px]`}
              >
                <Image
                  src={hero.src}
                  alt="Hero"
                  fill
                  sizes="192px"
                  quality={50}
                  className="object-contain brightness-90 contrast-110 saturate-[0.7]"
                />
              </m.div>
            ))}
          </div>

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(2, 6, 23, 0.4) 100%)",
            }}
          />
        </div>

        {/* === Content === */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Nav bar */}
          <nav className="relative px-4 sm:px-12 py-4 sm:py-6">
            <div className="absolute inset-0 bg-[#020617]/60 backdrop-blur-md border-b border-white/5" />
            <div className="relative z-10 flex justify-between items-center max-w-7xl mx-auto">
              <m.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                  <Image
                    src="/assets/logo/aiorreal_logo.jpg"
                    alt="AI or Real Logo"
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div className="hidden sm:block">
                  <div className="text-[10px] font-black text-[#ff4655]/60 uppercase tracking-[0.2em]">
                    AI or Real
                  </div>
                  <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                    Event Game
                  </div>
                </div>
              </m.div>

              <m.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
              >
                <Link
                  href="/gallery"
                  className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] text-white/40 hover:text-[#00eeff] transition-colors"
                >
                  Gallery
                </Link>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rotate-45 bg-[#ff4655]" />
                  <div className="h-5 w-px bg-white/20" />
                  <div className="w-1 h-1 rotate-45 bg-[#00eeff]" />
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <Image
                    src="/assets/images/logos/cloud9-icon.png"
                    alt="Cloud9"
                    width={24}
                    height={24}
                    className="opacity-60"
                  />
                  <div className="text-[9px] font-black text-white/30 uppercase tracking-wider">
                    x
                  </div>
                  <Image
                    src="/assets/images/logos/jetbrains-icon.png"
                    alt="JetBrains"
                    width={24}
                    height={24}
                    className="opacity-60"
                  />
                </div>
              </m.div>
            </div>
          </nav>

          {/* Hero */}
          <main className="flex-1 flex items-center justify-center px-4">
            <div className="max-w-3xl mx-auto text-center">
              {/* Tactical badge */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 mb-8 backdrop-blur-md relative overflow-hidden clip-skew"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 70, 85, 0.1), rgba(255, 70, 85, 0.05))",
                  border: "1px solid rgba(255, 70, 85, 0.3)",
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4655] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4655]" />
                </span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4655]">
                  Cloud9 x JetBrains Hackathon
                </span>
                <m.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                />
              </m.div>

              {/* Title */}
              <m.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight mb-4 leading-[0.85]"
              >
                <span className="gradient-text">AI</span>
                <span className="text-white/15 mx-2 sm:mx-4 text-4xl sm:text-6xl">
                  or
                </span>
                <span className="text-white">Real</span>
                <span className="text-[#ff4655]">?</span>
              </m.h1>

              {/* Divider + Subtitle */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-16 sm:w-24 h-px bg-gradient-to-r from-transparent to-[#ff4655]/50" />
                  <div className="w-2 h-2 rotate-45 bg-[#ff4655]/50" />
                  <div className="w-8 h-px bg-white/20" />
                  <div className="w-2 h-2 rotate-45 bg-[#00eeff]/50" />
                  <div className="w-16 sm:w-24 h-px bg-gradient-to-l from-transparent to-[#00eeff]/50" />
                </div>
                <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                  Test your perception in this fast-paced arena. 12 images. 2
                  seconds each. Can you tell AI-generated images from real
                  photographs?
                </p>
              </m.div>

              {/* CTA */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="mt-10"
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/game">
                    <m.button
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="group relative px-12 sm:px-16 py-5 sm:py-6 text-white font-black uppercase tracking-[0.15em] text-sm sm:text-base overflow-hidden cursor-pointer clip-skew"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255, 70, 85, 0.9), rgba(0, 238, 255, 0.9))",
                        boxShadow:
                          "0 0 40px rgba(255, 70, 85, 0.3), 0 0 60px rgba(0, 238, 255, 0.2)",
                      }}
                    >
                      <m.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
                      />
                      <span className="relative z-10 flex items-center gap-3">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Play The Game
                      </span>
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0, 238, 255, 0.9), rgba(255, 70, 85, 0.9))",
                        }}
                      />
                    </m.button>
                  </Link>
                  <Link href="/leaderboard">
                    <m.button
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="group relative px-12 sm:px-16 py-5 sm:py-6 text-white font-black uppercase tracking-[0.15em] text-sm sm:text-base overflow-hidden cursor-pointer clip-skew"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(16, 185, 129, 0.9))",
                        boxShadow:
                          "0 0 40px rgba(168, 85, 247, 0.3), 0 0 60px rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      <m.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
                      />
                      <span className="relative z-10 flex items-center gap-3">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 3a1 1 0 011-1h2a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm6 4a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1h-2a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v13a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Leaderboard
                      </span>
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(168, 85, 247, 0.9))",
                        }}
                      />
                    </m.button>
                  </Link>
                </div>
                <p className="text-slate-500 text-[10px] sm:text-xs mt-4 font-black uppercase tracking-[0.15em]">
                  Mouse-only controls &bull; Under 2 minutes
                </p>
              </m.div>

              {/* Stats boxes */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="flex items-center justify-center gap-4 sm:gap-6 mt-14"
              >
                {[
                  { label: "Images", value: "12", color: "#00eeff" },
                  { label: "Per Image", value: "2s", color: "#ff4655" },
                  { label: "Controls", value: "Click", color: "#10b981" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="clip-tactical-sm px-5 sm:px-7 py-3 sm:py-4 text-center"
                    style={{
                      background: `linear-gradient(135deg, ${stat.color}10, transparent)`,
                      border: `1px solid ${stat.color}30`,
                    }}
                  >
                    <div
                      className="text-xl sm:text-2xl font-black"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-white/30 font-black uppercase tracking-[0.2em] mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </m.div>
            </div>
          </main>

          {/* Footer */}
          <footer className="relative border-t border-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent" />
            <div className="relative z-10 container mx-auto px-4 sm:px-8 py-10">
              <div className="flex flex-col items-center">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 mb-4 clip-skew"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
                    AI or Real Protocol // Active
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#ff4655]/30" />
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-wider">
                    Sky&apos;s the Limit
                  </span>
                  <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#00eeff]/30" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rotate-45 bg-[#ff4655]" />
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                    &copy; 2026 Cloud9 x JetBrains Hackathon &mdash;
                    aiorreal.fun
                  </span>
                  <div className="w-1 h-1 rotate-45 bg-[#00eeff]" />
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </LazyMotion>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import GameOverCard from "../components/GameOverCard";
import { useMusic } from "../components/MusicProvider";

interface GameImage {
  id: string;
  url: string;
  isAi: boolean;
}

interface GameResult {
  imageId: string;
  url: string;
  isAi: boolean;
  userAnswer: boolean;
  correct: boolean;
  timeLeft: number;
}

interface CountryItem {
  name: string;
  code: string;
  flag: string;
}

type GamePhase =
  | "register"
  | "loading"
  | "countdown"
  | "playing"
  | "feedback"
  | "gameover";

const TIME_PER_IMAGE = 5;

export default function GamePage() {
  // Registration
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Game state
  const [phase, setPhase] = useState<GamePhase>("register");
  const [images, setImages] = useState<GameImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_IMAGE);
  const [results, setResults] = useState<GameResult[]>([]);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    answer: boolean;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [rank, setRank] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [imageReady, setImageReady] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const { playGameMusic, playVictoryMusic, stopAllMusic } = useMusic();

  // Load countries from DB
  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((d) => setCountries(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCountryDropdown(false);
      }
    };
    if (showCountryDropdown)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCountryDropdown]);

  // Load saved credentials
  useEffect(() => {
    const savedName = localStorage.getItem("aioreal_username");
    const savedCountry = localStorage.getItem("aioreal_country");
    const savedCountrySearch = localStorage.getItem("aioreal_country_search");
    if (savedName) setUsername(savedName);
    if (savedCountry) setCountry(savedCountry);
    if (savedCountrySearch) setCountrySearch(savedCountrySearch);
  }, []);

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const selectCountry = (c: CountryItem) => {
    setCountry(c.name);
    setCountrySearch(c.name);
    setShowCountryDropdown(false);
  };

  // Preload all images into browser cache
  const preloadImages = (imageList: GameImage[]): Promise<void> => {
    let loaded = 0;
    return new Promise((resolve) => {
      if (imageList.length === 0) {
        resolve();
        return;
      }
      imageList.forEach((img) => {
        const image = new window.Image();
        image.onload = image.onerror = () => {
          loaded++;
          setLoadProgress(Math.round((loaded / imageList.length) * 100));
          if (loaded >= imageList.length) resolve();
        };
        image.src = img.url;
      });
    });
  };

  // Start game
  const startGame = async () => {
    if (!username.trim()) return;
    localStorage.setItem("aioreal_username", username);
    localStorage.setItem("aioreal_country", country);
    localStorage.setItem("aioreal_country_search", countrySearch);

    setPhase("loading");
    setLoadProgress(0);

    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      setImages(data.images);

      // Preload all images into browser cache
      await preloadImages(data.images);

      setPhase("countdown");
      setCountdownNum(3);
    } catch (err) {
      console.error("Failed to load images:", err);
      setPhase("register");
    }
  };

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownNum <= 0) {
      setPhase("playing");
      startTimeRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdownNum((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum]);

  // Reset imageReady when image changes
  useEffect(() => {
    if (phase === "playing") setImageReady(false);
  }, [currentIndex]);

  // Timer — only starts once image is visible
  useEffect(() => {
    if (phase !== "playing" || !imageReady) return;
    setTimeLeft(TIME_PER_IMAGE);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, TIME_PER_IMAGE - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        handleAnswer(null);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIndex, imageReady]);

  // Handle answer
  const handleAnswer = useCallback(
    (userSaidAi: boolean | null) => {
      if (phase !== "playing" || !images[currentIndex]) return;
      if (timerRef.current) clearInterval(timerRef.current);

      const image = images[currentIndex];
      const correct = userSaidAi !== null && userSaidAi === image.isAi;

      let points = 0;
      if (correct) {
        const speedBonus = Math.round((timeLeft / TIME_PER_IMAGE) * 50);
        const streakBonus = streak * 10;
        points = 100 + speedBonus + streakBonus;
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }
      setScore((s) => s + points);

      const result: GameResult = {
        imageId: image.id,
        url: image.url,
        isAi: image.isAi,
        userAnswer: userSaidAi ?? false,
        correct,
        timeLeft,
      };

      setResults((prev) => [...prev, result]);
      setFeedback({ correct, answer: image.isAi });
      setPhase("feedback");
    },
    [phase, images, currentIndex, timeLeft, streak],
  );

  // Feedback -> next
  useEffect(() => {
    if (phase !== "feedback") return;
    const t = setTimeout(() => {
      if (currentIndex + 1 >= images.length) {
        setPhase("gameover");
      } else {
        setCurrentIndex((i) => i + 1);
        setPhase("playing");
      }
      setFeedback(null);
    }, 1200);
    return () => clearTimeout(t);
  }, [phase, currentIndex, images.length]);

  // Submit score
  const submitScore = async () => {
    setIsSaving(true);
    try {
      const correctCount = results.filter((r) => r.correct).length;
      const accuracy = (correctCount / results.length) * 100;
      const avgTime =
        results.reduce((sum, r) => sum + (TIME_PER_IMAGE - r.timeLeft), 0) /
        results.length;
      const res = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          country,
          totalScore: score,
          correctCount,
          totalImages: results.length,
          accuracy: Math.round(accuracy * 100) / 100,
          avgTime: Math.round(avgTime * 100) / 100,
        }),
      });
      const data = await res.json();
      setRank(data.rank);
    } catch (err) {
      console.error("Failed to submit score:", err);
    }
    setIsSaving(false);
  };

  useEffect(() => {
    if (phase === "gameover") submitScore();
  }, [phase]);

  // Music transitions
  useEffect(() => {
    if (phase === "countdown" || phase === "playing" || phase === "feedback") {
      playGameMusic();
    } else if (phase === "gameover") {
      playVictoryMusic();
    } else if (phase === "register") {
      stopAllMusic();
    }
  }, [phase]);

  const currentImage = images[currentIndex];
  const progress =
    ((currentIndex + (phase === "feedback" ? 1 : 0)) / images.length) * 100;
  const timerPercent = (timeLeft / TIME_PER_IMAGE) * 100;
  const timerColor =
    timeLeft > 3 ? "#00eeff" : timeLeft > 1.5 ? "#f59e0b" : "#ff4655";

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen bg-[#020617] text-slate-50 overflow-hidden relative">
        {/* Tactical background */}
        <div className="fixed inset-0 z-0">
          {/* Base background image */}
          <div className="absolute inset-0 opacity-20 mix-blend-overlay">
            <Image
              src="/assets/images/backgrounds/valorant_.webp"
              alt=""
              fill
              sizes="100vw"
              quality={60}
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/40 via-[#020617]/80 to-[#020617]" />

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
          {/* Orbs */}
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

        {/* ===== REGISTER ===== */}
        <AnimatePresence mode="wait">
          {phase === "register" && (
            <m.div
              key="register"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 min-h-screen flex items-center justify-center px-4"
            >
              <m.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
              >
                {/* Back */}
                <Link
                  href="/"
                  className="group relative px-4 py-2 inline-flex items-center gap-3 mb-6"
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
                    Back to Home
                  </span>
                </Link>

                <div className="glass rounded-2xl overflow-hidden glow-cyan clip-tactical">
                  {/* Header gradient */}
                  <div
                    className="p-6 pb-4 text-center relative overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255, 70, 85, 0.1), rgba(0, 238, 255, 0.1))",
                    }}
                  >
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#00eeff]/5 blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#ff4655]/5 blur-2xl" />
                    <div className="relative z-10">
                      {/* Tactical badge */}
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 clip-skew"
                        style={{
                          background: "rgba(255, 70, 85, 0.1)",
                          border: "1px solid rgba(255, 70, 85, 0.2)",
                        }}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4655] opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ff4655]" />
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#ff4655]">
                          Player Registration
                        </span>
                      </div>
                      <h2 className="text-2xl font-black">Enter the Arena</h2>
                    </div>
                  </div>

                  <div className="p-6 pt-4 space-y-5">
                    {/* Username */}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && startGame()}
                        placeholder="Enter your name..."
                        maxLength={20}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#00eeff]/50 focus:ring-2 focus:ring-[#00eeff]/20 transition-all text-sm clip-tactical-sm"
                      />
                    </div>

                    {/* Country - searchable dropdown */}
                    <div ref={countryDropdownRef}>
                      <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-2">
                        Country
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={countrySearch}
                          onChange={(e) => {
                            setCountrySearch(e.target.value);
                            setShowCountryDropdown(true);
                          }}
                          onFocus={() => setShowCountryDropdown(true)}
                          placeholder="Search country..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#00eeff]/50 focus:ring-2 focus:ring-[#00eeff]/20 transition-all text-sm clip-tactical-sm"
                        />
                        {/* Selected flag */}
                        {country && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg">
                            {countries.find((c) => c.name === country)?.flag}
                          </span>
                        )}

                        {/* Dropdown */}
                        {showCountryDropdown && (
                          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-[#0f172a] border border-white/10 rounded-lg shadow-2xl">
                            {filteredCountries.length === 0 ? (
                              <div className="px-4 py-3 text-xs text-white/30">
                                No countries found
                              </div>
                            ) : (
                              filteredCountries.map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => selectCountry(c)}
                                  className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left cursor-pointer ${country === c.name ? "bg-[#00eeff]/10" : ""}`}
                                >
                                  <span className="text-base">{c.flag}</span>
                                  <span className="text-sm text-white/80">
                                    {c.name}
                                  </span>
                                  <span className="text-[10px] text-white/30 ml-auto font-bold">
                                    {c.code}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Start button */}
                    <m.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startGame}
                      disabled={!username.trim()}
                      className="w-full py-4 font-black uppercase tracking-[0.15em] text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer clip-skew overflow-hidden relative"
                      style={{
                        background: username.trim()
                          ? "linear-gradient(135deg, #ff4655, #00eeff)"
                          : "rgba(255,255,255,0.05)",
                        boxShadow: username.trim()
                          ? "0 0 30px rgba(255, 70, 85, 0.2)"
                          : "none",
                      }}
                    >
                      {username.trim() && (
                        <m.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                        />
                      )}
                      <span className="relative z-10">Start Game</span>
                    </m.button>
                  </div>

                  {/* Game info */}
                  <div className="px-6 pb-6 pt-2">
                    <div className="border-t border-white/5 pt-4">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          { v: "12", l: "Images", c: "#00eeff" },
                          { v: "5s", l: "Per Image", c: "#ff4655" },
                          { v: "2", l: "Choices", c: "#10b981" },
                        ].map((s) => (
                          <div
                            key={s.l}
                            className="clip-tactical-sm p-2.5"
                            style={{
                              background: `${s.c}08`,
                              border: `1px solid ${s.c}20`,
                            }}
                          >
                            <div
                              className="text-lg font-black"
                              style={{ color: s.c }}
                            >
                              {s.v}
                            </div>
                            <div className="text-[8px] text-white/30 font-black uppercase tracking-wider">
                              {s.l}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            </m.div>
          )}

          {/* ===== LOADING (preloading images) ===== */}
          {phase === "loading" && (
            <m.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 min-h-screen flex items-center justify-center"
            >
              <div className="text-center w-full max-w-xs">
                {/* Tactical badge */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 mb-6 clip-skew"
                  style={{
                    background: "rgba(0, 238, 255, 0.08)",
                    border: "1px solid rgba(0, 238, 255, 0.2)",
                  }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00eeff] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00eeff]" />
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00eeff]">
                    Initializing Arena
                  </span>
                </div>

                <p className="text-sm text-white/40 font-bold uppercase tracking-widest mb-6">
                  Downloading images...
                </p>

                {/* Progress bar */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3 clip-tactical-sm">
                  <m.div
                    className="h-full bg-gradient-to-r from-[#ff4655] to-[#00eeff] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs font-black text-[#00eeff] tabular-nums">
                  {loadProgress}%
                </p>
              </div>
            </m.div>
          )}

          {/* ===== COUNTDOWN ===== */}
          {phase === "countdown" && (
            <m.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 min-h-screen flex items-center justify-center"
            >
              <div className="text-center">
                <AnimatePresence mode="wait">
                  <m.div
                    key={countdownNum}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {countdownNum > 0 ? (
                      <div className="text-8xl sm:text-9xl font-black gradient-text">
                        {countdownNum}
                      </div>
                    ) : (
                      <div className="text-5xl sm:text-6xl font-black text-[#00eeff]">
                        GO!
                      </div>
                    )}
                  </m.div>
                </AnimatePresence>
                <p className="text-[10px] text-white/30 mt-6 font-black uppercase tracking-[0.3em]">
                  Get Ready
                </p>
              </div>
            </m.div>
          )}

          {/* ===== PLAYING / FEEDBACK ===== */}
          {(phase === "playing" || phase === "feedback") && currentImage && (
            <m.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 min-h-screen flex flex-col"
            >
              {/* Top HUD bar */}
              <div className="relative px-4 sm:px-8 py-3">
                <div className="absolute inset-0 bg-[#020617]/70 backdrop-blur-md border-b border-white/5" />
                <div className="relative z-10 max-w-4xl mx-auto">
                  {/* Score + Image counter + Streak */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div
                        className="clip-tactical-sm px-3 py-1.5"
                        style={{
                          background: "rgba(255, 70, 85, 0.1)",
                          border: "1px solid rgba(255, 70, 85, 0.2)",
                        }}
                      >
                        <span className="text-[9px] font-black text-[#ff4655] uppercase tracking-[0.2em]">
                          {currentIndex + 1}/{images.length}
                        </span>
                      </div>
                      {streak > 1 && (
                        <m.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="clip-tactical-sm px-3 py-1.5"
                          style={{
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                          }}
                        >
                          <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.15em]">
                            {streak}x Streak
                          </span>
                        </m.div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">
                        Score
                      </span>
                      <span className="text-xl font-black gradient-text tabular-nums">
                        {score}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                    <m.div
                      className="h-full rounded-full bg-gradient-to-r from-[#ff4655] to-[#00eeff]"
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Timer bar */}
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-100 ease-linear"
                      style={{
                        width: `${timerPercent}%`,
                        backgroundColor: timerColor,
                        boxShadow: `0 0 10px ${timerColor}40`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span
                      className="text-xs font-black tabular-nums"
                      style={{ color: timerColor }}
                    >
                      {timeLeft.toFixed(1)}s
                    </span>
                    <span className="text-[9px] text-white/20 font-black uppercase tracking-wider">
                      Time Remaining
                    </span>
                  </div>
                </div>
              </div>

              {/* Image + Buttons area */}
              <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
                <div className="w-full max-w-sm">
                  {/* PORTRAIT Image container (3:4 ratio = 768x1024) */}
                  <m.div
                    key={currentImage.id}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full portrait-image rounded-2xl overflow-hidden mb-5 clip-tactical"
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 0 40px rgba(0,0,0,0.5)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentImage.url}
                      alt="AI or Real?"
                      onLoad={() => setImageReady(true)}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Loading indicator until image renders */}
                    {!imageReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#020617]">
                        <div className="w-8 h-8 border-3 border-white/10 border-t-[#00eeff] rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Corner scan HUD */}
                    <div className="absolute top-3 left-3 w-6 h-6 pointer-events-none opacity-40">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-[#00eeff]" />
                      <div className="absolute top-0 left-0 h-full w-[1px] bg-[#00eeff]" />
                    </div>
                    <div className="absolute top-3 right-3 w-6 h-6 pointer-events-none opacity-40">
                      <div className="absolute top-0 right-0 w-full h-[1px] bg-[#ff4655]" />
                      <div className="absolute top-0 right-0 h-full w-[1px] bg-[#ff4655]" />
                    </div>
                    <div className="absolute bottom-3 left-3 w-6 h-6 pointer-events-none opacity-40">
                      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-[#00eeff]" />
                      <div className="absolute bottom-0 left-0 h-full w-[1px] bg-[#00eeff]" />
                    </div>
                    <div className="absolute bottom-3 right-3 w-6 h-6 pointer-events-none opacity-40">
                      <div className="absolute bottom-0 right-0 w-full h-[1px] bg-[#ff4655]" />
                      <div className="absolute bottom-0 right-0 h-full w-[1px] bg-[#ff4655]" />
                    </div>

                    {/* Scan label */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 backdrop-blur-sm rounded-full">
                      <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">
                        {imageReady ? "Analyzing Image" : "Loading Image..."}
                      </span>
                    </div>

                    {/* Feedback overlay */}
                    <AnimatePresence>
                      {feedback && (
                        <m.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`absolute inset-0 flex items-center justify-center ${feedback.correct ? "bg-emerald-500/30" : "bg-red-500/30"}`}
                        >
                          <m.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="text-center"
                          >
                            <div
                              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 ${feedback.correct ? "bg-emerald-500" : "bg-red-500"}`}
                            >
                              {feedback.correct ? (
                                <svg
                                  className="w-10 h-10 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-10 h-10 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              )}
                            </div>
                            <p className="text-white font-black text-lg uppercase tracking-wider">
                              {feedback.correct ? "Correct!" : "Wrong!"}
                            </p>
                            <p className="text-white/60 text-sm mt-1">
                              This was{" "}
                              {feedback.answer
                                ? "AI Generated"
                                : "A Real Photo"}
                            </p>
                          </m.div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </m.div>

                  {/* Answer buttons */}
                  {phase === "playing" && imageReady && (
                    <div className="grid grid-cols-2 gap-3">
                      <m.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAnswer(true)}
                        className="py-5 font-black uppercase tracking-[0.1em] text-sm transition-all cursor-pointer clip-tactical-sm overflow-hidden relative"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(255, 70, 85, 0.1), rgba(255, 70, 85, 0.05))",
                          border: "1px solid rgba(255, 70, 85, 0.3)",
                          color: "#ff4655",
                          boxShadow: "0 0 20px rgba(255, 70, 85, 0.05)",
                        }}
                      >
                        <m.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-[#ff4655]/10 to-transparent pointer-events-none"
                        />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          AI Generated
                        </span>
                      </m.button>

                      <m.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAnswer(false)}
                        className="py-5 font-black uppercase tracking-[0.1em] text-sm transition-all cursor-pointer clip-tactical-sm overflow-hidden relative"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0, 238, 255, 0.1), rgba(0, 238, 255, 0.05))",
                          border: "1px solid rgba(0, 238, 255, 0.3)",
                          color: "#00eeff",
                          boxShadow: "0 0 20px rgba(0, 238, 255, 0.05)",
                        }}
                      >
                        <m.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear",
                            delay: 1.5,
                          }}
                          className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-[#00eeff]/10 to-transparent pointer-events-none"
                        />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          Real Photo
                        </span>
                      </m.button>
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          )}

          {/* ===== GAME OVER ===== */}
          {phase === "gameover" && (
            <m.div
              key="gameover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8"
            >
              <GameOverCard
                username={username}
                country={country}
                score={score}
                results={results}
                rank={rank}
                isSaving={isSaving}
                onPlayAgain={() => {
                  setPhase("register");
                  setCurrentIndex(0);
                  setResults([]);
                  setScore(0);
                  setStreak(0);
                  setRank(null);
                }}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}

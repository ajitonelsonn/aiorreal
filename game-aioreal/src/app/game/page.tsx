"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import GameOverCard from "../components/GameOverCard";
import { useMusic } from "../components/MusicProvider";
import { useSfx } from "../hooks/useSfx";
import FlagIcon from "../components/FlagIcon";

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

const TIME_PER_IMAGE = 2;

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
  const [lastPoints, setLastPoints] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const { playGameMusic, playVictoryMusic, stopAllMusic } = useMusic();
  const {
    playClick,
    playCorrect,
    playWrong,
    playTick,
    playGameOver,
    playWhoosh,
    playCoin,
  } = useSfx();
  const lastTickRef = useRef(TIME_PER_IMAGE);

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

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const selectCountry = (c: CountryItem) => {
    setCountry(c.name);
    setCountrySearch(c.name);
    setShowCountryDropdown(false);
    playClick();
  };

  // Start game
  const startGame = async () => {
    if (!username.trim()) return;
    playClick();
    localStorage.setItem("aioreal_username", username);
    localStorage.setItem("aioreal_country", country);
    localStorage.setItem("aioreal_country_search", countrySearch);

    setPhase("loading");
    setLoadProgress(0);

    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      // Shuffle images randomly on client side too
      const shuffled = [...data.images].sort(() => Math.random() - 0.5);
      setImages(shuffled);

      // Preload both images and audio with combined progress tracking
      const totalAssets = shuffled.length + 12; // 12 images + 12 audio files
      let loadedAssets = 0;

      const updateProgress = () => {
        loadedAssets++;
        setLoadProgress(Math.round((loadedAssets / totalAssets) * 100));
      };

      // Preload images with progress tracking
      const imagePromise = new Promise<void>((resolve) => {
        if (shuffled.length === 0) {
          resolve();
          return;
        }
        let loaded = 0;
        shuffled.forEach((img) => {
          const image = new window.Image();
          image.onload = image.onerror = () => {
            loaded++;
            updateProgress();
            if (loaded >= shuffled.length) resolve();
          };
          image.src = img.url;
        });
      });

      // Preload audio with progress tracking
      const audioFiles = [
        "/assets/sounds/music/music-game.mp3",
        "/assets/sounds/music/music-victory.mp3",
        "/assets/sounds/sfx/click.mp3",
        "/assets/sounds/sfx/coin.mp3",
        "/assets/sounds/sfx/error.mp3",
        "/assets/sounds/sfx/explosion.mp3",
        "/assets/sounds/sfx/gameover.mp3",
        "/assets/sounds/sfx/jump.mp3",
        "/assets/sounds/sfx/pop.mp3",
        "/assets/sounds/sfx/success.mp3",
        "/assets/sounds/sfx/victory.mp3",
        "/assets/sounds/sfx/whoosh.mp3",
      ];

      const audioPromise = new Promise<void>((resolve) => {
        if (audioFiles.length === 0) {
          resolve();
          return;
        }
        let loaded = 0;
        audioFiles.forEach((src) => {
          const audio = new Audio();
          audio.preload = "auto";
          audio.oncanplaythrough = audio.onerror = () => {
            loaded++;
            updateProgress();
            if (loaded >= audioFiles.length) resolve();
          };
          audio.src = src;
        });
      });

      // Wait for both images and audio to finish loading
      await Promise.all([imagePromise, audioPromise]);

      setPhase("countdown");
      setCountdownNum(3);
    } catch (err) {
      console.error("Failed to load assets:", err);
      setPhase("register");
    }
  };

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownNum <= 0) {
      setPhase("playing");
      startTimeRef.current = Date.now();
      playWhoosh();
      return;
    }
    playTick();
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
    lastTickRef.current = TIME_PER_IMAGE;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, TIME_PER_IMAGE - elapsed);
      setTimeLeft(remaining);

      // Tick sound at each second when <= 3s
      const currentSecond = Math.ceil(remaining);
      const lastSecond = Math.ceil(lastTickRef.current);
      if (
        currentSecond !== lastSecond &&
        currentSecond <= 3 &&
        currentSecond > 0
      ) {
        playTick();
      }
      lastTickRef.current = remaining;

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
        // Speed bonus: faster answer = more points (0-100 range)
        const speedRatio = timeLeft / TIME_PER_IMAGE;
        const speedBonus = Math.round(speedRatio * 100);
        // Streak multiplier: 1x, 1.2x, 1.5x, 2x, 2.5x...
        const streakMultiplier = 1 + streak * 0.25;
        points = Math.round((100 + speedBonus) * streakMultiplier);
        setStreak((s) => s + 1);
        playCorrect();
        if (streak >= 2) playCoin();
      } else {
        setStreak(0);
        playWrong();
      }
      setScore((s) => s + points);
      setLastPoints(points);

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
        playGameOver();
      } else {
        setCurrentIndex((i) => i + 1);
        setPhase("playing");
        playWhoosh();
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
      // Average response time (TIME_PER_IMAGE - timeLeft = how long player took)
      const answeredResults = results.filter((r) => r.timeLeft > 0);
      const avgTime =
        answeredResults.length > 0
          ? answeredResults.reduce(
              (sum, r) => sum + (TIME_PER_IMAGE - r.timeLeft),
              0,
            ) / answeredResults.length
          : TIME_PER_IMAGE;
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
    if (phase === "countdown" || phase === "playing") {
      playGameMusic();
    } else if (phase === "gameover") {
      playVictoryMusic();
    } else if (phase === "register") {
      stopAllMusic();
    }
  }, [phase]);

  // Keyboard shortcuts during gameplay
  useEffect(() => {
    if (phase !== "playing" || !imageReady) return;
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === "a" ||
        e.key === "A" ||
        e.key === "1" ||
        e.key === "ArrowLeft"
      ) {
        playClick();
        handleAnswer(true);
      } else if (
        e.key === "r" ||
        e.key === "R" ||
        e.key === "2" ||
        e.key === "ArrowRight"
      ) {
        playClick();
        handleAnswer(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, imageReady, handleAnswer]);

  const currentImage = images[currentIndex];
  const progress =
    ((currentIndex + (phase === "feedback" ? 1 : 0)) / images.length) * 100;
  const timerPercent = (timeLeft / TIME_PER_IMAGE) * 100;
  const timerColor =
    timeLeft > 3 ? "#00eeff" : timeLeft > 1.5 ? "#f59e0b" : "#ff4655";
  const isTimerCritical = timeLeft <= 1.5;

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen bg-[#020617] text-slate-50 overflow-hidden relative">
        {/* Tactical background */}
        <div className="fixed inset-0 z-0">
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
                <div className="flex items-center justify-between mb-6">
                  <Link
                    href="/"
                    onClick={playClick}
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
                      Back to Home
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

                <div className="glass rounded-2xl overflow-hidden glow-cyan clip-tactical relative">
                  {/* Animated corner accents */}
                  <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none opacity-40">
                    <m.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute top-0 left-0 w-16 h-[2px] bg-gradient-to-r from-[#ff4655] to-transparent"
                    />
                    <m.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      className="absolute top-0 left-0 h-16 w-[2px] bg-gradient-to-b from-[#ff4655] to-transparent"
                    />
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-40">
                    <m.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: 0.25,
                      }}
                      className="absolute top-0 right-0 w-16 h-[2px] bg-gradient-to-l from-[#00eeff] to-transparent"
                    />
                    <m.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: 0.75,
                      }}
                      className="absolute top-0 right-0 h-16 w-[2px] bg-gradient-to-b from-[#00eeff] to-transparent"
                    />
                  </div>

                  {/* Header gradient */}
                  <div
                    className="p-6 pb-4 text-center relative overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255, 70, 85, 0.15), rgba(0, 238, 255, 0.15))",
                    }}
                  >
                    <m.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#00eeff]/20 blur-3xl"
                    />
                    <m.div
                      animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.1, 0.2, 0.1],
                      }}
                      transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                      className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#ff4655]/20 blur-3xl"
                    />
                    <div className="relative z-10">
                      <m.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 mb-4 clip-skew"
                        style={{
                          background: "rgba(255, 70, 85, 0.15)",
                          border: "1px solid rgba(255, 70, 85, 0.3)",
                          boxShadow: "0 0 20px rgba(255, 70, 85, 0.1)",
                        }}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4655] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4655]" />
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#ff4655]">
                          Player Registration
                        </span>
                      </m.div>
                      <m.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl sm:text-4xl font-black mb-2"
                      >
                        <span className="gradient-text">Play The Game</span>
                      </m.h2>
                      <m.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xs text-white/40 mt-2 font-bold uppercase tracking-wider"
                      >
                        Can you tell AI from reality?
                      </m.p>
                    </div>
                  </div>

                  <div className="p-6 pt-4 space-y-5">
                    {/* Username */}
                    <m.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-3 flex items-center gap-2">
                        <svg
                          className="w-3.5 h-3.5 text-[#00eeff]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        Your Name
                      </label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && startGame()}
                          placeholder="Enter your name..."
                          maxLength={20}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white placeholder-white/20 focus:outline-none focus:border-[#00eeff]/60 focus:ring-2 focus:ring-[#00eeff]/30 transition-all text-sm clip-tactical-sm hover:bg-white/8 hover:border-white/20"
                          style={{
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <div
                          className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(0, 238, 255, 0.05), transparent)",
                          }}
                        />
                      </div>
                    </m.div>

                    {/* Country - searchable dropdown */}
                    <m.div
                      ref={countryDropdownRef}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-3 flex items-center gap-2">
                        <svg
                          className="w-3.5 h-3.5 text-[#ff4655]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Country (Optional)
                      </label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={countrySearch}
                          onChange={(e) => {
                            setCountrySearch(e.target.value);
                            setShowCountryDropdown(true);
                          }}
                          onFocus={() => setShowCountryDropdown(true)}
                          placeholder="Search country..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white placeholder-white/20 focus:outline-none focus:border-[#ff4655]/60 focus:ring-2 focus:ring-[#ff4655]/30 transition-all text-sm clip-tactical-sm hover:bg-white/8 hover:border-white/20"
                          style={{
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        {country && countries.find((c) => c.name === country)?.code && (
                          <m.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2"
                          >
                            <FlagIcon 
                              countryCode={countries.find((c) => c.name === country)?.code || ""} 
                              size={24} 
                            />
                          </m.span>
                        )}
                        <div
                          className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(255, 70, 85, 0.05), transparent)",
                          }}
                        />

                        {showCountryDropdown && (
                          <m.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 mt-2 w-full max-h-48 overflow-y-auto bg-[#0f172a]/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl clip-tactical-sm"
                            style={{
                              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                            }}
                          >
                            {filteredCountries.length === 0 ? (
                              <div className="px-4 py-3 text-xs text-white/30 text-center">
                                No countries found
                              </div>
                            ) : (
                              filteredCountries.map((c, idx) => (
                                <m.button
                                  key={c.code}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.02 }}
                                  type="button"
                                  onClick={() => selectCountry(c)}
                                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all text-left cursor-pointer border-b border-white/5 last:border-0 ${country === c.name ? "bg-[#00eeff]/15 border-l-2 border-l-[#00eeff]" : ""}`}
                                >
                                  <span className="inline-block">
                                    <FlagIcon countryCode={c.code} size={20} />
                                  </span>
                                  <span className="text-sm text-white/90 font-medium">
                                    {c.name}
                                  </span>
                                  <span className="text-[10px] text-white/30 ml-auto font-bold uppercase">
                                    {c.code}
                                  </span>
                                </m.button>
                              ))
                            )}
                          </m.div>
                        )}
                      </div>
                    </m.div>

                    {/* Start button */}
                    <m.button
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      whileHover={{
                        scale: username.trim() ? 1.03 : 1,
                        y: username.trim() ? -2 : 0,
                      }}
                      whileTap={{ scale: username.trim() ? 0.97 : 1 }}
                      onClick={startGame}
                      disabled={!username.trim()}
                      className="w-full py-5 font-black uppercase tracking-[0.15em] text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer clip-skew overflow-hidden relative group"
                      style={{
                        background: username.trim()
                          ? "linear-gradient(135deg, #ff4655, #00eeff)"
                          : "rgba(255,255,255,0.05)",
                        boxShadow: username.trim()
                          ? "0 0 40px rgba(255, 70, 85, 0.3), 0 0 60px rgba(0, 238, 255, 0.2)"
                          : "none",
                      }}
                    >
                      {username.trim() && (
                        <>
                          <m.div
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
                        </>
                      )}
                      <span className="relative z-10 flex items-center justify-center gap-3">
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Start Game
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </span>
                    </m.button>
                  </div>

                  {/* Game info */}
                  <div className="px-6 pb-6 pt-2">
                    <div className="border-t border-white/10 pt-5">
                      <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="grid grid-cols-3 gap-4 text-center"
                      >
                        {[
                          {
                            v: "12",
                            l: "Images",
                            c: "#00eeff",
                            icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
                          },
                          {
                            v: "2s",
                            l: "Per Image",
                            c: "#ff4655",
                            icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                          },
                          {
                            v: "2",
                            l: "Choices",
                            c: "#10b981",
                            icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                          },
                        ].map((s, idx) => (
                          <m.div
                            key={s.l}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 + idx * 0.1 }}
                            whileHover={{ scale: 1.05, y: -3 }}
                            className="clip-tactical-sm p-4 relative overflow-hidden group cursor-default"
                            style={{
                              background: `linear-gradient(135deg, ${s.c}12, ${s.c}05)`,
                              border: `1px solid ${s.c}30`,
                              boxShadow: `0 4px 15px ${s.c}10`,
                            }}
                          >
                            <div
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                              style={{
                                background: `linear-gradient(135deg, ${s.c}08, transparent)`,
                              }}
                            />
                            <svg
                              className="w-5 h-5 mx-auto mb-2 opacity-60"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke={s.c}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={s.icon}
                              />
                            </svg>
                            <div
                              className="text-2xl font-black mb-1"
                              style={{ color: s.c }}
                            >
                              {s.v}
                            </div>
                            <div className="text-[9px] text-white/40 font-black uppercase tracking-wider">
                              {s.l}
                            </div>
                          </m.div>
                        ))}
                      </m.div>
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
                      <>
                        <div className="text-8xl sm:text-9xl font-black gradient-text drop-shadow-[0_0_40px_rgba(0,238,255,0.3)]">
                          {countdownNum}
                        </div>
                        {/* Pulse ring */}
                        <m.div
                          initial={{ scale: 0.8, opacity: 0.5 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ duration: 0.8 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div className="w-32 h-32 rounded-full border-2 border-[#00eeff]/30" />
                        </m.div>
                      </>
                    ) : (
                      <div className="text-5xl sm:text-6xl font-black text-[#00eeff] drop-shadow-[0_0_40px_rgba(0,238,255,0.5)]">
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
                <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5" />
                <div className="relative z-10 max-w-4xl mx-auto">
                  {/* Score + Image counter + Streak */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {/* Image counter */}
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
                      {/* Streak badge */}
                      <AnimatePresence>
                        {streak > 1 && (
                          <m.div
                            initial={{ scale: 0, x: -10 }}
                            animate={{ scale: 1, x: 0 }}
                            exit={{ scale: 0, x: -10 }}
                            className="clip-tactical-sm px-3 py-1.5 flex items-center gap-1.5"
                            style={{
                              background: "rgba(245, 158, 11, 0.12)",
                              border: "1px solid rgba(245, 158, 11, 0.3)",
                              boxShadow: "0 0 15px rgba(245, 158, 11, 0.1)",
                            }}
                          >
                            <span className="text-amber-400 text-xs">
                              &#x1F525;
                            </span>
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.15em]">
                              {streak}x Streak
                            </span>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Score display */}
                    <div className="flex items-center gap-3">
                      <AnimatePresence>
                        {lastPoints > 0 && feedback && (
                          <m.span
                            key={`pts-${currentIndex}`}
                            initial={{ opacity: 1, y: 0 }}
                            animate={{ opacity: 0, y: -20 }}
                            transition={{ duration: 1 }}
                            className="text-xs font-black text-emerald-400"
                          >
                            +{lastPoints}
                          </m.span>
                        )}
                      </AnimatePresence>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-wider block">
                          Score
                        </span>
                        <m.span
                          key={score}
                          initial={{ scale: 1.3 }}
                          animate={{ scale: 1 }}
                          className="text-xl font-black gradient-text tabular-nums block"
                        >
                          {score}
                        </m.span>
                      </div>
                    </div>
                  </div>

                  {/* Mini results dots */}
                  {results.length > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      {results.map((r, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: r.correct ? "#10b981" : "#ff4655",
                          }}
                        />
                      ))}
                      {Array.from({
                        length: images.length - results.length,
                      }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="w-1.5 h-1.5 rounded-full bg-white/10"
                        />
                      ))}
                    </div>
                  )}

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
                  <div
                    className={`h-2 bg-white/5 rounded-full overflow-hidden ${isTimerCritical ? "animate-pulse" : ""}`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-100 ease-linear"
                      style={{
                        width: `${timerPercent}%`,
                        backgroundColor: timerColor,
                        boxShadow: `0 0 ${isTimerCritical ? "20px" : "10px"} ${timerColor}60`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <m.span
                      animate={isTimerCritical ? { scale: [1, 1.15, 1] } : {}}
                      transition={
                        isTimerCritical
                          ? { duration: 0.5, repeat: Infinity }
                          : {}
                      }
                      className="text-sm font-black tabular-nums"
                      style={{ color: timerColor }}
                    >
                      {timeLeft.toFixed(1)}s
                    </m.span>
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
                    initial={{ opacity: 0, scale: 1.05, rotateY: 10 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="relative w-full portrait-image rounded-2xl overflow-hidden mb-5 clip-tactical"
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: `0 0 60px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.2)`,
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
                        <div className="text-center">
                          <div className="w-10 h-10 border-3 border-white/10 border-t-[#00eeff] rounded-full animate-spin mx-auto mb-3" />
                          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            Loading...
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Corner scan HUD */}
                    <div className="absolute top-3 left-3 w-8 h-8 pointer-events-none opacity-50">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-[#00eeff]" />
                      <div className="absolute top-0 left-0 h-full w-[1px] bg-[#00eeff]" />
                    </div>
                    <div className="absolute top-3 right-3 w-8 h-8 pointer-events-none opacity-50">
                      <div className="absolute top-0 right-0 w-full h-[1px] bg-[#ff4655]" />
                      <div className="absolute top-0 right-0 h-full w-[1px] bg-[#ff4655]" />
                    </div>
                    <div className="absolute bottom-3 left-3 w-8 h-8 pointer-events-none opacity-50">
                      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-[#00eeff]" />
                      <div className="absolute bottom-0 left-0 h-full w-[1px] bg-[#00eeff]" />
                    </div>
                    <div className="absolute bottom-3 right-3 w-8 h-8 pointer-events-none opacity-50">
                      <div className="absolute bottom-0 right-0 w-full h-[1px] bg-[#ff4655]" />
                      <div className="absolute bottom-0 right-0 h-full w-[1px] bg-[#ff4655]" />
                    </div>

                    {/* Scan label */}
                    <m.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10"
                    >
                      <span className="text-[8px] font-black text-white/60 uppercase tracking-[0.2em]">
                        {imageReady ? "Analyzing Image" : "Loading Image..."}
                      </span>
                    </m.div>

                    {/* Scan line animation over image */}
                    {imageReady && phase === "playing" && (
                      <m.div
                        animate={{ y: ["-100%", "200%"] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute left-0 right-0 h-[2px] opacity-20 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, #00eeff, transparent)",
                          boxShadow: "0 0 10px #00eeff40",
                        }}
                      />
                    )}

                    {/* Feedback overlay */}
                    <AnimatePresence>
                      {feedback && (
                        <m.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`absolute inset-0 flex items-center justify-center ${feedback.correct ? "bg-emerald-500/30" : "bg-red-500/30"}`}
                          style={{
                            backdropFilter: "blur(2px)",
                          }}
                        >
                          <m.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="text-center"
                          >
                            <m.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                type: "spring",
                                bounce: 0.6,
                                delay: 0.1,
                              }}
                              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 ${feedback.correct ? "bg-emerald-500" : "bg-red-500"}`}
                              style={{
                                boxShadow: feedback.correct
                                  ? "0 0 40px rgba(16, 185, 129, 0.5)"
                                  : "0 0 40px rgba(255, 70, 85, 0.5)",
                              }}
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
                            </m.div>
                            <p className="text-white font-black text-xl uppercase tracking-wider drop-shadow-lg">
                              {feedback.correct ? "Correct!" : "Wrong!"}
                            </p>
                            <p className="text-white/70 text-sm mt-1 font-bold">
                              This was{" "}
                              <span
                                className={
                                  feedback.answer
                                    ? "text-[#ff4655]"
                                    : "text-[#00eeff]"
                                }
                              >
                                {feedback.answer
                                  ? "AI Generated"
                                  : "A Real Photo"}
                              </span>
                            </p>
                            {feedback.correct && lastPoints > 0 && (
                              <m.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-emerald-300 font-black text-lg mt-2"
                              >
                                +{lastPoints} pts
                              </m.p>
                            )}
                          </m.div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </m.div>

                  {/* Question label */}
                  {phase === "playing" && imageReady && (
                    <m.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3"
                    >
                      Is this image AI generated or a real photo?
                    </m.p>
                  )}

                  {/* Answer buttons */}
                  {phase === "playing" && imageReady && (
                    <m.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <m.button
                        whileHover={{ scale: 1.06, y: -5 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          playClick();
                          handleAnswer(true);
                        }}
                        className="py-6 font-black uppercase tracking-[0.12em] text-sm transition-all cursor-pointer clip-tactical-sm overflow-hidden relative group"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(255, 70, 85, 0.18), rgba(255, 70, 85, 0.08))",
                          border: "2px solid rgba(255, 70, 85, 0.4)",
                          color: "#ff4655",
                          boxShadow:
                            "0 4px 25px rgba(255, 70, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <m.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#ff4655]/20 to-transparent pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-[#ff4655]/0 group-hover:bg-[#ff4655]/10 transition-colors pointer-events-none" />
                        <m.div
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ff4655] to-transparent opacity-50"
                        />
                        <span className="relative z-10 flex flex-col items-center justify-center gap-2">
                          <svg
                            className="w-7 h-7"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <span>AI Generated</span>
                        </span>
                      </m.button>

                      <m.button
                        whileHover={{ scale: 1.06, y: -5 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          playClick();
                          handleAnswer(false);
                        }}
                        className="py-6 font-black uppercase tracking-[0.12em] text-sm transition-all cursor-pointer clip-tactical-sm overflow-hidden relative group"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0, 238, 255, 0.18), rgba(0, 238, 255, 0.08))",
                          border: "2px solid rgba(0, 238, 255, 0.4)",
                          color: "#00eeff",
                          boxShadow:
                            "0 4px 25px rgba(0, 238, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <m.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#00eeff]/20 to-transparent pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-[#00eeff]/0 group-hover:bg-[#00eeff]/10 transition-colors pointer-events-none" />
                        <m.div
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: 1,
                          }}
                          className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00eeff] to-transparent opacity-50"
                        />
                        <span className="relative z-10 flex flex-col items-center justify-center gap-2">
                          <svg
                            className="w-7 h-7"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span>Real Photo</span>
                        </span>
                      </m.button>
                    </m.div>
                  )}

                  {/* Keyboard hint */}
                  {phase === "playing" && imageReady && (
                    <p className="text-center text-[8px] text-white/15 font-bold uppercase tracking-widest mt-2">
                      Press A or ← for AI &nbsp;·&nbsp; R or → for Real
                    </p>
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
                  playClick();
                  setUsername("");
                  setCountry("");
                  setCountrySearch("");
                  localStorage.removeItem("aioreal_username");
                  localStorage.removeItem("aioreal_country");
                  localStorage.removeItem("aioreal_country_search");
                  setPhase("register");
                  setCurrentIndex(0);
                  setResults([]);
                  setScore(0);
                  setStreak(0);
                  setRank(null);
                  setLastPoints(0);
                }}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}

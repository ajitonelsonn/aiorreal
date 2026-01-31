"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import FlagIcon from "./FlagIcon";

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

interface CountryItem {
  name: string;
  code: string;
  flag: string;
}

type CardStep = "results" | "camera";

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
  const TIME_PER_IMAGE = 2;
  const avgTime =
    results.reduce((sum, r) => sum + (TIME_PER_IMAGE - r.timeLeft), 0) /
    results.length;
  const bestStreak = results.reduce(
    (acc, r) => {
      if (r.correct) {
        acc.current++;
        acc.best = Math.max(acc.best, acc.current);
      } else {
        acc.current = 0;
      }
      return acc;
    },
    { current: 0, best: 0 },
  ).best;

  const grade =
    accuracy >= 90
      ? "S"
      : accuracy >= 75
        ? "A"
        : accuracy >= 60
          ? "B"
          : accuracy >= 40
            ? "C"
            : "D";
  const gradeColor =
    grade === "S"
      ? "#ff4655"
      : grade === "A"
        ? "#10b981"
        : grade === "B"
          ? "#f59e0b"
          : grade === "C"
            ? "#f97316"
            : "#6b7280";
  const gradeLabel =
    grade === "S"
      ? "Supreme"
      : grade === "A"
        ? "Ace"
        : grade === "B"
          ? "Good"
          : grade === "C"
            ? "Average"
            : "Novice";

  const [step, setStep] = useState<CardStep>("results");
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [tempSelfie, setTempSelfie] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((d) => setCountries(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  const getCountryCode = (countryName: string | null) => {
    if (!countryName) return "";
    const found = countries.find(
      (c) => c.name === countryName || c.code === countryName,
    );
    return found?.code || "";
  };

  const shareUrl =
    uploadedUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/gallery`
      : "https://aiorreal.fun/gallery");
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=0f1923&color=ffffff`;

  const startCamera = useCallback(async () => {
    try {
      setStep("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(console.error);
              resolve();
            };
          } else {
            resolve();
          }
        });
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Could not access camera. Please grant camera permission.");
      setStep("results");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const takeSelfie = useCallback(() => {
    setCaptureCountdown(3);
  }, []);

  useEffect(() => {
    if (captureCountdown <= 0) return;
    const t = setTimeout(() => {
      if (captureCountdown === 1) {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0);
            const data = canvas.toDataURL("image/png");
            setTempSelfie(data);
          }
        }
        setCaptureCountdown(0);
      } else {
        setCaptureCountdown((n) => n - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [captureCountdown]);

  const confirmSelfie = useCallback(() => {
    setSelfieData(tempSelfie);
    setTempSelfie(null);
    stopCamera();
    setStep("results");
  }, [tempSelfie, stopCamera]);

  const retakeSelfie = useCallback(() => {
    setTempSelfie(null);
    setCaptureCountdown(0);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const uploadCard = useCallback(async () => {
    if (!cardRef.current) return;
    setIsUploading(true);
    try {
      const { toJpeg } = await import("html-to-image");
      const dataUrl = await toJpeg(cardRef.current, {
        quality: 0.85,
        pixelRatio: 1.5,
        backgroundColor: "#0a0e14",
        filter: (node: HTMLElement) => {
          return !node.dataset?.exportHide;
        },
      });
      const timestamp = Date.now();
      const filename = `card-${username.replace(/[^a-zA-Z0-9]/g, "_")}-${score}-${timestamp}.jpg`;
      const res = await fetch("/api/upload-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: dataUrl,
          filename,
          username,
          score,
          country,
        }),
      });
      const data = await res.json();
      if (data.url) {
        setUploadedUrl(data.url);
      }
    } catch (err) {
      console.error("Failed to upload card:", err);
    }
    setIsUploading(false);
  }, [username, score, country]);

  const downloadCard = useCallback(async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      if (!uploadedUrl) {
        await uploadCard();
      }
      const { toJpeg } = await import("html-to-image");
      const dataUrl = await toJpeg(cardRef.current, {
        quality: 0.9,
        pixelRatio: 2,
        backgroundColor: "#0a0e14",
        filter: (node: HTMLElement) => {
          return !node.dataset?.exportHide;
        },
      });
      const link = document.createElement("a");
      link.download = `aioreal-${username}-${score}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download card:", err);
    }
    setIsDownloading(false);
  }, [username, score, uploadedUrl, uploadCard]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const heroImages = [
    "/assets/images/hero/Jett_Artwork_Full.webp",
    "/assets/images/hero/Reyna_Artwork_Full.webp",
    "/assets/images/hero/Sage_Artwork_Full.webp",
  ];
  const [randomHero] = useState(
    () => heroImages[Math.floor(Math.random() * heroImages.length)],
  );

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <AnimatePresence mode="wait">
        {/* ===== CAMERA STEP ===== */}
        {step === "camera" && (
          <m.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full"
          >
            <div className="relative bg-[#0a0e14] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
              {/* Camera header */}
              <div className="relative flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-2 h-2 bg-[#ff4655] rounded-full" />
                    <div className="absolute inset-0 w-2 h-2 bg-[#ff4655] rounded-full animate-ping opacity-75" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
                    Camera
                  </span>
                </div>
                <div className="px-2 py-0.5 rounded bg-[#ff4655]/15 border border-[#ff4655]/25">
                  <span className="text-[10px] font-bold text-[#ff4655] tracking-wider">
                    REC
                  </span>
                </div>
              </div>

              {/* Video area */}
              <div className="relative aspect-[4/3] bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Viewfinder corners */}
                <div className="absolute inset-6 pointer-events-none">
                  <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-white/40 rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-white/40 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-white/40 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-white/40 rounded-br" />
                </div>

                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-4 h-px bg-white/20" />
                    <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-px h-4 bg-white/20" />
                  </div>
                </div>

                {/* Scan line */}
                <m.div
                  animate={{ y: ["0%", "100%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff4655]/30 to-transparent pointer-events-none"
                />

                {/* Temp selfie preview overlay */}
                <AnimatePresence>
                  {tempSelfie ? (
                    <m.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tempSelfie}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </m.div>
                  ) : (
                    captureCountdown > 0 && (
                      <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                      >
                        <m.div
                          key={captureCountdown}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 2, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        >
                          <span className="text-8xl font-black text-white tabular-nums">
                            {captureCountdown}
                          </span>
                        </m.div>
                      </m.div>
                    )
                  )}
                </AnimatePresence>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {/* Camera controls */}
              <div className="p-5 space-y-3">
                {tempSelfie ? (
                  <div className="flex gap-3">
                    <m.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={retakeSelfie}
                      className="flex-1 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white/80 font-semibold text-sm tracking-wide transition-colors hover:bg-white/10"
                    >
                      Retake
                    </m.button>
                    <m.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={confirmSelfie}
                      className="flex-1 py-3.5 rounded-xl bg-[#ff4655] text-white font-semibold text-sm tracking-wide shadow-lg shadow-[#ff4655]/25 transition-colors hover:bg-[#ff5565]"
                    >
                      Use Photo
                    </m.button>
                  </div>
                ) : (
                  <>
                    <m.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={takeSelfie}
                      disabled={captureCountdown > 0}
                      className="w-full py-3.5 rounded-xl bg-[#ff4655] text-white font-semibold text-sm tracking-wide shadow-lg shadow-[#ff4655]/25 transition-colors hover:bg-[#ff5565] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {captureCountdown > 0 ? `${captureCountdown}...` : "Capture"}
                    </m.button>
                    <button
                      onClick={() => { stopCamera(); setStep("results"); }}
                      className="w-full py-2.5 text-sm text-white/40 hover:text-white/70 transition-colors font-medium"
                    >
                      Skip
                    </button>
                  </>
                )}
              </div>
            </div>
          </m.div>
        )}

        {/* ===== RESULTS CARD ===== */}
        {step === "results" && (
          <m.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            {/* The exportable card */}
            <div
              ref={cardRef}
              className="relative bg-[#0a0e14] rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Hero background with character art */}
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${randomHero})`,
                    filter: "blur(20px) brightness(0.2) saturate(1.5)",
                    transform: "scale(1.2)",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e14]/60 via-[#0a0e14]/80 to-[#0a0e14]" />
              </div>

              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff4655]/60 to-transparent" />

              {/* Card content */}
              <div className="relative">
                {/* Header section with character art peek */}
                <div className="relative h-32 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-top"
                    style={{
                      backgroundImage: `url(${randomHero})`,
                      filter: "brightness(0.5) saturate(1.2)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0e14]/60 to-[#0a0e14]" />

                  {/* Holographic shimmer */}
                  <m.div
                    animate={{
                      backgroundPosition: ["200% 0%", "-200% 0%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage:
                        "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0.8) 50%, transparent 55%)",
                      backgroundSize: "200% 100%",
                    }}
                  />

                  {/* Game title */}
                  <div className="absolute top-4 left-5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#ff4655] rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                      AI or Real?
                    </span>
                  </div>

                  {/* Grade badge - top right */}
                  <m.div
                    initial={{ opacity: 0, scale: 0, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                    className="absolute top-3 right-4"
                  >
                    <div
                      className="relative w-16 h-16 flex flex-col items-center justify-center rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${gradeColor}25, ${gradeColor}08)`,
                        border: `1px solid ${gradeColor}40`,
                      }}
                    >
                      <span
                        className="text-3xl font-black leading-none"
                        style={{ color: gradeColor }}
                      >
                        {grade}
                      </span>
                      <span
                        className="text-[7px] font-bold uppercase tracking-wider mt-0.5"
                        style={{ color: `${gradeColor}90` }}
                      >
                        {gradeLabel}
                      </span>
                      <m.div
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="absolute inset-0 rounded-xl blur-lg -z-10"
                        style={{ backgroundColor: `${gradeColor}20` }}
                      />
                    </div>
                  </m.div>
                </div>

                {/* Player info section */}
                <div className="px-5 -mt-8 relative z-10">
                  <div className="flex items-end gap-4">
                    {/* Selfie / Avatar */}
                    <m.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="relative flex-shrink-0"
                    >
                      <div
                        className="w-20 h-20 rounded-xl overflow-hidden border-2 shadow-xl"
                        style={{ borderColor: `${gradeColor}60` }}
                      >
                        {selfieData ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selfieData}
                            alt="Player"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#1a2030] to-[#0f1520] flex items-center justify-center">
                            <span className="text-2xl font-black text-white/20">
                              {username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Country flag badge */}
                      {getCountryCode(country) && (
                        <div className="absolute -bottom-1 -right-1 drop-shadow-lg">
                          <FlagIcon countryCode={getCountryCode(country)} size={24} />
                        </div>
                      )}
                    </m.div>

                    {/* Name and rank */}
                    <m.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex-1 min-w-0 pb-1"
                    >
                      <div className="text-xl font-black uppercase tracking-tight text-white truncate leading-tight">
                        {username}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {rank && (
                          <span className="text-xs font-bold text-white/40">
                            Rank #{rank}
                          </span>
                        )}
                        {rank && (
                          <span className="text-white/20">&#183;</span>
                        )}
                        <span className="text-xs text-white/30">
                          {country || "Unknown"}
                        </span>
                      </div>
                    </m.div>
                  </div>
                </div>

                {/* Score display */}
                <m.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mx-5 mt-5 p-4 rounded-xl bg-gradient-to-r from-[#ff4655]/10 via-[#ff4655]/[0.06] to-transparent border border-[#ff4655]/15"
                >
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
                        Score
                      </div>
                      <m.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                        className="text-5xl font-black text-[#ff4655] leading-none tabular-nums"
                      >
                        {score.toLocaleString()}
                      </m.div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
                        Result
                      </div>
                      <div className="text-lg font-black text-white/80">
                        {correctCount}/{results.length}
                      </div>
                    </div>
                  </div>
                </m.div>

                {/* Stats grid */}
                <m.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mx-5 mt-3 grid grid-cols-3 gap-2"
                >
                  {[
                    {
                      label: "Accuracy",
                      value: `${accuracy}%`,
                      sub: accuracy >= 75 ? "Great" : accuracy >= 50 ? "Good" : "Low",
                      color: "#10b981",
                      pct: accuracy,
                    },
                    {
                      label: "Avg Speed",
                      value: `${avgTime.toFixed(1)}s`,
                      sub: avgTime <= 2 ? "Fast" : avgTime <= 3.5 ? "Mid" : "Slow",
                      color: "#3b82f6",
                      pct: Math.max(0, Math.min(100, ((5 - avgTime) / 5) * 100)),
                    },
                    {
                      label: "Best Streak",
                      value: `${bestStreak}`,
                      sub: bestStreak >= 6 ? "Fire" : bestStreak >= 3 ? "Nice" : "Ok",
                      color: "#f59e0b",
                      pct: (bestStreak / results.length) * 100,
                    },
                  ].map((stat, i) => (
                    <m.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.08 }}
                      className="relative p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center"
                    >
                      <div
                        className="text-lg font-black leading-none mb-0.5"
                        style={{ color: stat.color }}
                      >
                        {stat.value}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-white/35 mb-2">
                        {stat.label}
                      </div>
                      {/* Mini progress bar */}
                      <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                        <m.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stat.pct}%` }}
                          transition={{ delay: 0.9 + i * 0.1, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: stat.color }}
                        />
                      </div>
                    </m.div>
                  ))}
                </m.div>

                {/* Per-image results strip */}
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mx-5 mt-4"
                >
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">
                    Round Results
                  </div>
                  <div className="flex gap-1">
                    {results.map((r, i) => (
                      <m.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 + i * 0.04 }}
                        className="flex-1 h-1.5 rounded-full"
                        style={{
                          backgroundColor: r.correct
                            ? "#10b981"
                            : "#ff4655",
                          opacity: 0.7 + (r.timeLeft / 5) * 0.3,
                        }}
                      />
                    ))}
                  </div>
                </m.div>

                {/* QR code + share section */}
                <m.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="mx-5 mt-5 flex items-center gap-4"
                >
                  <div className="flex-shrink-0 p-1.5 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeUrl}
                      alt="QR"
                      className="w-14 h-14 rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">
                      Share
                    </div>
                    <div className="text-xs text-white/50 truncate">
                      {shareUrl.replace(/^https?:\/\//, "")}
                    </div>
                  </div>
                </m.div>

                {/* Footer */}
                <div className="mt-5 px-5 py-3 flex items-center justify-between border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-[#ff4655]/50 rounded-full" />
                    <span className="text-[9px] font-bold text-white/25 uppercase tracking-widest">
                      aiorreal.fun
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-wider">
                      Powered by
                    </span>
                    <div className="flex items-center gap-2 opacity-40">
                      <Image
                        src="/assets/images/logos/cloud9-logo.png"
                        alt="Cloud9"
                        width={32}
                        height={12}
                        className="object-contain"
                      />
                      <div className="w-px h-3 bg-white/15" />
                      <Image
                        src="/assets/images/logos/jetbrains-logo.png"
                        alt="JetBrains"
                        width={36}
                        height={12}
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons - outside the exportable card */}
            <div className="mt-5 space-y-3" data-export-hide="true">
              {/* Upload status */}
              {uploadedUrl && (
                <m.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20"
                >
                  <svg className="w-4 h-4 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs font-semibold text-[#10b981]">
                    Saved to Gallery
                  </span>
                </m.div>
              )}

              {/* Photo + Save row */}
              <div className="grid grid-cols-3 gap-2.5">
                <m.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startCamera}
                  disabled={!!uploadedUrl}
                  className="py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] transition-all text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {selfieData ? "Retake" : "Photo"}
                </m.button>

                <m.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={downloadCard}
                  disabled={isDownloading}
                  className="py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isDownloading ? "..." : "Save"}
                </m.button>

                <m.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={uploadedUrl ? copyLink : uploadCard}
                  disabled={isUploading}
                  className="py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1.5"
                >
                  {uploadedUrl ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {copied ? "Copied!" : "Copy"}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {isUploading ? "..." : "Upload"}
                    </>
                  )}
                </m.button>
              </div>

              {/* Play Again - hero CTA */}
              <m.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPlayAgain}
                className="w-full py-4 rounded-xl bg-[#ff4655] text-white font-bold uppercase text-sm tracking-wider shadow-lg shadow-[#ff4655]/20 transition-all hover:bg-[#ff5565] hover:shadow-[#ff4655]/30 flex items-center justify-center gap-2.5"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play Again
              </m.button>

              {/* Leaderboard link */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors font-medium"
                >
                  View Leaderboard
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </m.div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}

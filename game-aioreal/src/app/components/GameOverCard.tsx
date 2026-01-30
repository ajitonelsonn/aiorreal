"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
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

interface CountryItem {
  name: string;
  code: string;
  flag: string;
}

type CardStep = "results" | "camera" | "preview" | "generating";

const THEME = {
  primary: "#ff4655",
  secondary: "#fd4556",
  accent: "#0f1923",
  border: "#2a3441",
  text: "#ece8e1",
  glass: "rgba(15, 25, 35, 0.7)",
  glassLight: "rgba(255, 255, 255, 0.05)",
  success: "#10b981",
  warning: "#f59e0b",
  purple: "#a855f7",
};

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
  const avgTime =
    results.reduce((sum, r) => sum + (5 - r.timeLeft), 0) / results.length;

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

  const [step, setStep] = useState<CardStep>("results");
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [tempSelfie, setTempSelfie] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [countries, setCountries] = useState<CountryItem[]>([]);

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

  const getCountryFlag = (countryName: string | null) => {
    if (!countryName) return "";
    const found = countries.find(
      (c) => c.name === countryName || c.code === countryName,
    );
    return found?.flag || "";
  };

  const getCountryCode = () => {
    if (!country) return "US";
    const found = countries.find((c) => c.name === country);
    return found?.code || "US";
  };

  const shareUrl =
    uploadedUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/gallery`
      : "https://aiorreal.fun/gallery");
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

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
        backgroundColor: "#0f1923",
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
        backgroundColor: "#0f1923",
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

  const heroImages = [
    "/assets/images/hero/Jett_Artwork_Full.webp",
    "/assets/images/hero/Reyna_Artwork_Full.webp",
    "/assets/images/hero/Sage_Artwork_Full.webp",
  ];
  const randomHero = heroImages[Math.floor(Math.random() * heroImages.length)];

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-4xl mx-auto"
    >
      <AnimatePresence mode="wait">
        {step === "camera" && (
          <m.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full"
          >
            <div className="relative bg-gradient-to-br from-[#0a0e1a] via-[#0f1520] to-[#0a0e1a] rounded-3xl border border-white/10 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff4655]/8 via-transparent to-[#a855f7]/5 pointer-events-none" />
              <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                  backgroundSize: "20px 20px",
                }}
              />

              <div className="relative p-8">
                <m.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3 mb-6"
                >
                  <div className="relative flex items-center gap-2">
                    <div className="relative">
                      <div className="w-2.5 h-2.5 bg-[#ff4655] rounded-full animate-pulse" />
                      <div className="absolute inset-0 w-2.5 h-2.5 bg-[#ff4655] rounded-full animate-ping" />
                    </div>
                    <div className="h-4 w-px bg-[#ff4655]/30" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-[#ff4655]">
                      Camera Active
                    </span>
                    <div className="px-2 py-0.5 rounded-full bg-[#ff4655]/20 border border-[#ff4655]/30">
                      <span className="text-[10px] font-bold text-[#ff4655]">
                        REC
                      </span>
                    </div>
                  </div>
                </m.div>

                <div className="relative w-full aspect-video bg-black/60 rounded-2xl mb-6 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm border border-white/10">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />

                  {/* Enhanced corner brackets */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-[3px] border-t-[3px] border-[#ff4655] rounded-tl-xl" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-[3px] border-t-[3px] border-[#ff4655] rounded-tr-xl" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-[3px] border-b-[3px] border-[#ff4655] rounded-bl-xl" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-[3px] border-b-[3px] border-[#ff4655] rounded-br-xl" />

                  {/* Scanning line animation */}
                  <m.div
                    animate={{ y: ["0%", "100%"] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff4655]/50 to-transparent"
                  />

                  <AnimatePresence>
                    {tempSelfie ? (
                      <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tempSelfie}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </m.div>
                    ) : (
                      captureCountdown > 0 && (
                        <m.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md"
                        >
                          <m.div
                            key={captureCountdown}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 200,
                              damping: 15,
                            }}
                            className="relative"
                          >
                            <span className="text-7xl font-black text-white drop-shadow-2xl">
                              {captureCountdown}
                            </span>
                            <div className="absolute inset-0 text-7xl font-black text-[#ff4655] blur-xl opacity-50">
                              {captureCountdown}
                            </div>
                          </m.div>
                        </m.div>
                      )
                    )}
                  </AnimatePresence>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="space-y-4">
                  {tempSelfie ? (
                    <>
                      <m.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={confirmSelfie}
                        className="w-full py-4 bg-gradient-to-r from-[#10b981] via-[#10b981] to-[#059669] hover:from-[#059669] hover:via-[#10b981] hover:to-[#10b981] text-white font-bold uppercase text-sm tracking-wider transition-all duration-300 rounded-2xl shadow-[0_10px_40px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_20px_60px_-10px_rgba(16,185,129,0.7)] relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <div className="relative z-10 flex items-center justify-center gap-2">
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Confirm Photo
                        </div>
                      </m.button>
                      <m.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: selfieData ? 1 : 1.05 }}
                        whileTap={{ scale: selfieData ? 1 : 0.95 }}
                        onClick={retakeSelfie}
                        disabled={!!selfieData}
                        className="w-full py-3 text-sm text-white/60 hover:text-white/90 transition-all duration-300 font-semibold uppercase tracking-wider rounded-xl hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-white/60 disabled:hover:bg-transparent"
                      >
                        Retake
                      </m.button>
                    </>
                  ) : (
                    <>
                      <m.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={takeSelfie}
                        disabled={captureCountdown > 0}
                        className="w-full py-4 bg-gradient-to-r from-[#ff4655] via-[#ff5565] to-[#ff4655] hover:from-[#ff5565] hover:via-[#ff6675] hover:to-[#ff5565] text-white font-bold uppercase text-sm tracking-wider transition-all duration-300 rounded-2xl shadow-[0_10px_40px_-10px_rgba(255,70,85,0.5)] hover:shadow-[0_20px_60px_-10px_rgba(255,70,85,0.7)] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <div className="relative z-10 flex items-center justify-center gap-3">
                          <div className="relative">
                            <svg
                              className="w-6 h-6"
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
                            {captureCountdown > 0 && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
                            )}
                          </div>
                          {captureCountdown > 0
                            ? `Capturing in ${captureCountdown}...`
                            : "Capture Photo"}
                        </div>
                      </m.button>
                      <m.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          stopCamera();
                          setStep("results");
                        }}
                        className="w-full py-3 text-sm text-white/60 hover:text-white/90 transition-all duration-300 font-semibold uppercase tracking-wider rounded-xl hover:bg-white/5"
                      >
                        Cancel
                      </m.button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </m.div>
        )}

        {step === "results" && (
          <m.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <div
              ref={cardRef}
              className="relative bg-gradient-to-br from-[#0a0e1a] via-[#0f1520] to-[#0a0e1a] rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]"
            >
              {/* Enhanced Animated Background with Mesh Gradient */}
              <m.div
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0 overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${randomHero})`,
                    filter: "blur(4px) brightness(0.4)",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a]/98 via-[#0f1520]/95 to-[#1a0f1f]/98" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ff4655]/10 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#a855f7]/8 via-transparent to-transparent" />
              </m.div>

              {/* Animated Border Glow */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff4655] to-transparent opacity-80" />
              <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none" />

              {/* Subtle Grid Pattern Overlay */}
              <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                  backgroundSize: "20px 20px",
                }}
              />

              <div className="relative p-8">
                {/* Modern Header with Enhanced Layout */}
                <div className="mb-8">
                  <div className="flex items-start justify-between gap-6 mb-6">
                    {/* Left: Player Info */}
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                      {selfieData && (
                        <m.div
                          initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          transition={{
                            duration: 0.6,
                            delay: 0.2,
                            type: "spring",
                            stiffness: 180,
                          }}
                          className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selfieData}
                            alt="Player"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-[#ff4655]/20 via-transparent to-[#a855f7]/10" />
                          <div className="absolute inset-0 ring-2 ring-white/10 rounded-2xl" />
                          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#ff4655] rounded-tl-md" />
                          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#ff4655] rounded-br-md" />
                        </m.div>
                      )}
                      <div className="flex-1 min-w-0">
                        <m.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="flex items-center gap-2 mb-3"
                        >
                          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[#ff4655]/20 to-[#ff4655]/10 border border-[#ff4655]/30 backdrop-blur-sm">
                            <span className="text-[10px] font-bold text-[#ff4655] uppercase tracking-wider">
                              Player
                            </span>
                          </div>
                          {getCountryFlag(country) && (
                            <span className="text-2xl drop-shadow-lg">
                              {getCountryFlag(country)}
                            </span>
                          )}
                        </m.div>
                        <m.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.4 }}
                          className="text-3xl font-black uppercase tracking-tight text-white truncate drop-shadow-[0_2px_10px_rgba(255,70,85,0.3)]"
                        >
                          {username}
                        </m.div>
                      </div>
                    </div>

                    {/* Right: Grade Badge */}
                    <m.div
                      initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{
                        duration: 0.7,
                        delay: 0.3,
                        type: "spring",
                        stiffness: 150,
                      }}
                      className="relative w-24 h-24 flex items-center justify-center rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${gradeColor}20, ${gradeColor}10)`,
                      }}
                    >
                      <div
                        className="absolute inset-0 border-2 rounded-2xl"
                        style={{ borderColor: `${gradeColor}60` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
                      <span
                        className="text-5xl font-black drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative z-10"
                        style={{ color: gradeColor }}
                      >
                        {grade}
                      </span>
                      {/* Animated glow effect */}
                      <m.div
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-0 rounded-2xl blur-xl"
                        style={{ backgroundColor: `${gradeColor}40` }}
                      />
                    </m.div>
                  </div>

                  {/* Score Display - Prominent */}
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="relative p-6 rounded-2xl bg-gradient-to-br from-[#ff4655]/15 via-[#ff4655]/10 to-transparent border border-[#ff4655]/30 backdrop-blur-sm overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                          Final Score
                        </div>
                        <m.div
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          transition={{
                            duration: 0.6,
                            delay: 0.6,
                            type: "spring",
                            stiffness: 200,
                          }}
                          className="text-6xl font-black text-[#ff4655] drop-shadow-[0_4px_20px_rgba(255,70,85,0.4)]"
                        >
                          {score}
                        </m.div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                          Rank
                        </div>
                        {rank ? (
                          <div className="text-3xl font-black text-white/90">
                            #{rank}
                          </div>
                        ) : (
                          <div className="text-sm text-white/40">
                            Calculating...
                          </div>
                        )}
                      </div>
                    </div>
                  </m.div>
                </div>

                {/* Performance Stats Section */}
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="mb-8"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-[#10b981] rounded-full animate-pulse" />
                      <div
                        className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="w-1 h-1 bg-[#10b981] rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                      Performance Stats
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      {
                        label: "Correct",
                        value: `${correctCount}/${results.length}`,
                        color: "#10b981",
                        icon: (
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ),
                        gradient: "from-[#10b981]/20 to-[#10b981]/5",
                      },
                      {
                        label: "Accuracy",
                        value: `${accuracy}%`,
                        color: "#ff4655",
                        icon: (
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
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                        ),
                        gradient: "from-[#ff4655]/20 to-[#ff4655]/5",
                      },
                      {
                        label: "Avg Time",
                        value: `${avgTime.toFixed(1)}s`,
                        color: "#f59e0b",
                        icon: (
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
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        ),
                        gradient: "from-[#f59e0b]/20 to-[#f59e0b]/5",
                      },
                    ].map((stat, index) => (
                      <m.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.5,
                          delay: 0.8 + index * 0.1,
                          type: "spring",
                          stiffness: 200,
                        }}
                        whileHover={{
                          scale: 1.05,
                          y: -5,
                          transition: { duration: 0.2 },
                        }}
                        className={`relative group text-center p-5 rounded-2xl overflow-hidden backdrop-blur-md shadow-lg bg-gradient-to-br ${stat.gradient} border border-white/10 cursor-pointer`}
                      >
                        {/* Hover glow effect */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
                          style={{ backgroundColor: `${stat.color}30` }}
                        />

                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        <div className="relative z-10">
                          <div
                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 bg-gradient-to-br from-white/10 to-transparent"
                            style={{ color: stat.color }}
                          >
                            {stat.icon}
                          </div>
                          <div
                            className="text-2xl font-black mb-2 drop-shadow-lg"
                            style={{ color: stat.color }}
                          >
                            {stat.value}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                            {stat.label}
                          </div>
                        </div>

                        {/* Animated corner accents */}
                        <div
                          className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 rounded-tl-lg opacity-30 group-hover:opacity-60 transition-opacity"
                          style={{ borderColor: stat.color }}
                        />
                        <div
                          className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 rounded-br-lg opacity-30 group-hover:opacity-60 transition-opacity"
                          style={{ borderColor: stat.color }}
                        />
                      </m.div>
                    ))}
                  </div>
                </m.div>

                {/* Share Section with QR Code */}
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                  className="pt-6 border-t border-white/10"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <svg
                      className="w-4 h-4 text-[#a855f7]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                      Share Your Victory
                    </span>
                  </div>

                  <div className="relative p-5 rounded-2xl bg-gradient-to-br from-[#a855f7]/10 via-[#a855f7]/5 to-transparent border border-[#a855f7]/20 backdrop-blur-sm overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                    <div className="relative flex items-center gap-5">
                      <m.div
                        initial={{ opacity: 0, rotate: -180, scale: 0.5 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        transition={{
                          duration: 0.7,
                          delay: 1.2,
                          type: "spring",
                          stiffness: 150,
                        }}
                        className="relative flex-shrink-0"
                      >
                        <div className="p-3 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrCodeUrl}
                            alt="QR Code"
                            className="w-24 h-24"
                          />
                        </div>
                        <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-l-2 border-t-2 border-[#a855f7] rounded-tl-lg" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-r-2 border-b-2 border-[#a855f7] rounded-br-lg" />

                        {/* Animated scan lines */}
                        <m.div
                          animate={{ y: [0, 96, 0] }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-[#a855f7]/50 to-transparent"
                        />
                      </m.div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white/90 mb-2">
                          Scan QR Code
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed mb-4">
                          Share your achievement with friends or view it in the
                          gallery
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(shareUrl);
                          }}
                          data-export-hide="true"
                          disabled={!uploadedUrl}
                          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg"
                          style={{
                            color: uploadedUrl
                              ? "#a855f7"
                              : "rgba(255,255,255,0.5)",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderColor: uploadedUrl
                              ? "#a855f740"
                              : "rgba(255,255,255,0.1)",
                            backgroundColor: uploadedUrl
                              ? "#a855f720"
                              : "rgba(255,255,255,0.05)",
                          }}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          {uploadedUrl ? "Copy Link" : "Save First"}
                        </button>
                      </div>
                    </div>
                  </div>
                </m.div>
              </div>

              {/* Modern Footer */}
              <div className="relative px-6 py-4 flex items-center justify-between border-t border-white/5 bg-gradient-to-r from-[#0a0e1a]/80 via-[#0f1520]/80 to-[#0a0e1a]/80 backdrop-blur-xl rounded-b-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#ff4655]/5 via-transparent to-[#a855f7]/5" />

                <div className="relative flex items-center gap-3">
                  <m.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-2 h-2 bg-[#ff4655] rounded-full"
                  />
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                    aiorreal.fun
                  </span>
                </div>

                <div className="relative flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Powered by
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="relative h-4 w-auto opacity-50 hover:opacity-80 transition-all duration-300 hover:scale-110">
                      <Image
                        src="/assets/images/logos/cloud9-logo.png"
                        alt="Cloud9"
                        width={40}
                        height={16}
                        className="object-contain"
                      />
                    </div>
                    <div className="w-px h-4 bg-white/20" />
                    <div className="relative h-4 w-auto opacity-50 hover:opacity-80 transition-all duration-300 hover:scale-110">
                      <Image
                        src="/assets/images/logos/jetbrains-logo.png"
                        alt="JetBrains"
                        width={45}
                        height={16}
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Action Buttons */}
            <div className="mt-6 space-y-4" data-export-hide="true">
              {uploadedUrl && (
                <m.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="relative text-center p-4 rounded-2xl border border-[#10b981]/40 bg-gradient-to-r from-[#10b981]/15 via-[#10b981]/10 to-[#10b981]/5 shadow-lg overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  <div className="relative flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5 text-[#10b981]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm font-bold text-[#10b981] uppercase tracking-wider">
                      Saved to Gallery
                    </p>
                  </div>
                </m.div>
              )}

              <m.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{
                  scale: uploadedUrl ? 1 : 1.02,
                  y: uploadedUrl ? 0 : -2,
                }}
                whileTap={{ scale: uploadedUrl ? 1 : 0.98 }}
                onClick={startCamera}
                disabled={!!uploadedUrl}
                className="w-full py-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a2332]/80 to-[#0f1923]/80 hover:from-[#222d3d]/90 hover:to-[#1a2332]/90 text-white font-bold uppercase text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-2xl backdrop-blur-sm relative overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-[#1a2332]/80 disabled:hover:to-[#0f1923]/80"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#a855f7]/0 via-[#a855f7]/10 to-[#a855f7]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <svg
                  className="w-5 h-5 relative z-10"
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
                <span className="relative z-10">
                  {selfieData ? "Retake Photo" : "Add Photo"}
                </span>
              </m.button>

              <div className="grid grid-cols-2 gap-4">
                <m.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadCard}
                  disabled={isDownloading}
                  className="py-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a2332]/80 to-[#0f1923]/80 hover:from-[#222d3d]/90 hover:to-[#1a2332]/90 text-white font-bold uppercase text-xs tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl backdrop-blur-sm relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#3b82f6]/0 via-[#3b82f6]/10 to-[#3b82f6]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    {isDownloading ? "Saving..." : "Download"}
                  </div>
                </m.button>

                <m.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={uploadCard}
                  disabled={isUploading || !!uploadedUrl}
                  className="py-4 rounded-2xl border border-[#10b981]/40 bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 hover:from-[#10b981]/30 hover:to-[#10b981]/10 text-[#10b981] font-bold uppercase text-xs tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl backdrop-blur-sm relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    {uploadedUrl ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Saved!
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        {isUploading ? "Saving..." : "Save"}
                      </>
                    )}
                  </div>
                </m.button>
              </div>

              <m.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={onPlayAgain}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#ff4655] via-[#ff5565] to-[#ff4655] hover:from-[#ff5565] hover:via-[#ff6675] hover:to-[#ff5565] text-white font-black uppercase text-base tracking-wider transition-all duration-300 shadow-[0_10px_40px_-10px_rgba(255,70,85,0.5)] hover:shadow-[0_20px_60px_-10px_rgba(255,70,85,0.7)] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Play Again
                </div>
              </m.button>

              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Link
                  href="/leaderboard"
                  className="block text-center pt-3 group"
                >
                  <span className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/90 transition-all duration-300 font-semibold uppercase tracking-wider group-hover:gap-3">
                    View Leaderboard
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </span>
                </Link>
              </m.div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}

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

type CardStep = "results" | "camera" | "preview" | "generating";

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
      ? "#00eeff"
      : grade === "A"
        ? "#10b981"
        : grade === "B"
          ? "#f59e0b"
          : grade === "C"
            ? "#f97316"
            : "#ff4655";

  const [step, setStep] = useState<CardStep>("results");
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStep("camera");
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Could not access camera. Please grant camera permission.");
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

  // Countdown for photo capture
  useEffect(() => {
    if (captureCountdown <= 0) return;
    if (captureCountdown === 0) return;

    const t = setTimeout(() => {
      if (captureCountdown === 1) {
        // Capture
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Mirror for selfie
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0);
            const data = canvas.toDataURL("image/png");
            setSelfieData(data);
            stopCamera();
            setStep("preview");
          }
        }
        setCaptureCountdown(0);
      } else {
        setCaptureCountdown((n) => n - 1);
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [captureCountdown, stopCamera]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const retakeSelfie = useCallback(() => {
    setSelfieData(null);
    startCamera();
  }, [startCamera]);

  const downloadCard = useCallback(async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
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
  }, [username, score]);

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

  const generateCard = useCallback(async () => {
    setStep("generating");
    await uploadCard();
    await downloadCard();
    setStep("preview");
  }, [uploadCard, downloadCard]);

  return (
    <m.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg"
    >
      <AnimatePresence mode="wait">
        {/* ===== STEP: RESULTS ===== */}
        {step === "results" && (
          <m.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <div
              ref={cardRef}
              className="glass overflow-hidden clip-tactical"
              style={{
                boxShadow: "0 0 60px rgba(0, 238, 255, 0.08)",
              }}
            >
              {/* Header */}
              <div
                className="p-8 text-center relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 70, 85, 0.12), rgba(0, 238, 255, 0.12))",
                }}
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#00eeff]/10 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#ff4655]/10 blur-2xl" />

                <div className="relative z-10">
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 clip-skew"
                    style={{
                      background: "rgba(0, 238, 255, 0.08)",
                      border: "1px solid rgba(0, 238, 255, 0.2)",
                    }}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00eeff] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00eeff]" />
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00eeff]">
                      Mission Complete
                    </span>
                  </div>

                  {/* Selfie circle placeholder */}
                  {selfieData ? (
                    <div className="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden border-2 border-[#00eeff]/30"
                      style={{ boxShadow: "0 0 25px rgba(0, 238, 255, 0.2)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selfieData} alt="Selfie" className="w-full h-full object-cover" />
                    </div>
                  ) : null}

                  <h2 className="text-3xl sm:text-4xl font-black mb-1">
                    {username}
                  </h2>
                  {country && (
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider">
                      {country}
                    </p>
                  )}
                </div>
              </div>

              {/* Score section */}
              <div className="px-8 py-6">
                {/* Grade + Score */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">
                      Total Score
                    </p>
                    <p className="text-4xl sm:text-5xl font-black gradient-text">
                      {score}
                    </p>
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
                    <span
                      className="text-4xl font-black"
                      style={{ color: gradeColor }}
                    >
                      {grade}
                    </span>
                  </m.div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    {
                      label: "Correct",
                      value: `${correctCount}/${results.length}`,
                      color: "#10b981",
                    },
                    {
                      label: "Accuracy",
                      value: `${accuracy}%`,
                      color: "#00eeff",
                    },
                    {
                      label: "Avg Time",
                      value: `${avgTime.toFixed(1)}s`,
                      color: "#f59e0b",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="text-center p-3 clip-tactical-sm"
                      style={{
                        background: `${stat.color}08`,
                        border: `1px solid ${stat.color}20`,
                      }}
                    >
                      <p
                        className="text-xl font-black"
                        style={{ color: stat.color }}
                      >
                        {stat.value}
                      </p>
                      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/30 mt-1">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Rank */}
                {rank && (
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mb-6 p-4 clip-tactical-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(0, 238, 255, 0.06), rgba(255, 70, 85, 0.06))",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">
                      Global Rank
                    </p>
                    <p className="text-2xl font-black gradient-text">
                      #{rank}
                    </p>
                  </m.div>
                )}

                {isSaving && (
                  <div className="text-center mb-4">
                    <div className="w-5 h-5 border-2 border-white/10 border-t-[#00eeff] rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-[9px] text-white/30 font-black uppercase tracking-wider">
                      Saving score...
                    </p>
                  </div>
                )}

                {/* Image results grid */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-px bg-gradient-to-r from-[#ff4655]/50 to-transparent" />
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">
                      Your Answers
                    </p>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {results.map((r, i) => (
                      <m.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="relative portrait-image rounded-lg overflow-hidden clip-tactical-sm"
                        style={{
                          border: `1px solid ${r.correct ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 70, 85, 0.3)"}`,
                        }}
                      >
                        <Image
                          src={r.url}
                          alt={`Image ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="60px"
                        />
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${r.correct ? "bg-emerald-500/40" : "bg-red-500/40"}`}
                        >
                          {r.correct ? (
                            <svg
                              className="w-4 h-4 text-white"
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
                              className="w-4 h-4 text-white"
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
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5">
                          <p
                            className="text-[6px] font-black text-center uppercase tracking-wider"
                            style={{ color: r.isAi ? "#ff4655" : "#00eeff" }}
                          >
                            {r.isAi ? "AI" : "Real"}
                          </p>
                        </div>
                      </m.div>
                    ))}
                  </div>
                </div>

                {/* Branding footer for exported card */}
                <div className="flex items-center justify-center gap-4 mb-6 opacity-60">
                  <Image
                    src="/assets/images/logos/cloud9-icon.png"
                    alt="Cloud9"
                    width={24}
                    height={24}
                    className="opacity-70"
                  />
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                    aioreal.fun
                  </span>
                  <Image
                    src="/assets/images/logos/jetbrains-icon.png"
                    alt="JetBrains"
                    width={24}
                    height={24}
                    className="opacity-70"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons - hidden from export */}
            <div className="space-y-3 mt-6" data-export-hide="true">
              {/* Take Photo + Generate Card button */}
              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startCamera}
                className="w-full py-4 font-black uppercase tracking-[0.15em] text-sm cursor-pointer clip-skew overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg, #00eeff, #10b981)",
                  boxShadow: "0 0 30px rgba(0, 238, 255, 0.15)",
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
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take Photo & Generate Card
                </span>
              </m.button>

              {/* Skip photo - just download */}
              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generateCard}
                disabled={isUploading || isDownloading}
                className="w-full py-4 font-black uppercase tracking-[0.15em] text-sm cursor-pointer clip-tactical-sm transition-colors disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 70, 85, 0.08), rgba(0, 238, 255, 0.08))",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                {isUploading || isDownloading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Card (No Photo)
                  </span>
                )}
              </m.button>

              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPlayAgain}
                className="w-full py-4 font-black uppercase tracking-[0.15em] text-sm cursor-pointer clip-skew overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg, #ff4655, #00eeff)",
                  boxShadow: "0 0 30px rgba(255, 70, 85, 0.15)",
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
                <span className="relative z-10">Play Again</span>
              </m.button>

              <Link href="/leaderboard" className="block">
                <m.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 font-black uppercase tracking-[0.15em] text-sm cursor-pointer clip-tactical-sm transition-colors"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))",
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
          </m.div>
        )}

        {/* ===== STEP: CAMERA ===== */}
        {step === "camera" && (
          <m.div
            key="camera"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="glass overflow-hidden clip-tactical" style={{ boxShadow: "0 0 60px rgba(0, 238, 255, 0.08)" }}>
              <div className="p-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 clip-skew"
                  style={{ background: "rgba(0, 238, 255, 0.08)", border: "1px solid rgba(0, 238, 255, 0.2)" }}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00eeff] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00eeff]" />
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00eeff]">Camera Active</span>
                </div>
                <h3 className="text-xl font-black mb-4">Take a Selfie</h3>

                {/* Video preview */}
                <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-2 border-[#00eeff]/30 mb-6"
                  style={{ boxShadow: "0 0 40px rgba(0, 238, 255, 0.15)" }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />

                  {/* Corner HUD on video */}
                  <div className="absolute top-2 left-2 w-6 h-6 pointer-events-none opacity-50">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-[#00eeff]" />
                    <div className="absolute top-0 left-0 h-full w-[1px] bg-[#00eeff]" />
                  </div>
                  <div className="absolute top-2 right-2 w-6 h-6 pointer-events-none opacity-50">
                    <div className="absolute top-0 right-0 w-full h-[1px] bg-[#ff4655]" />
                    <div className="absolute top-0 right-0 h-full w-[1px] bg-[#ff4655]" />
                  </div>

                  {/* Countdown overlay */}
                  <AnimatePresence>
                    {captureCountdown > 0 && (
                      <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40"
                      >
                        <m.span
                          key={captureCountdown}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 1.5, opacity: 0 }}
                          className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(0,238,255,0.5)]"
                        >
                          {captureCountdown}
                        </m.span>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="space-y-3">
                  <m.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={takeSelfie}
                    disabled={captureCountdown > 0}
                    className="w-full py-4 font-black uppercase tracking-[0.15em] text-sm cursor-pointer clip-skew overflow-hidden relative disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #00eeff, #10b981)",
                      boxShadow: "0 0 30px rgba(0, 238, 255, 0.15)",
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {captureCountdown > 0 ? `Capturing in ${captureCountdown}...` : "Capture"}
                    </span>
                  </m.button>

                  <button
                    onClick={() => {
                      stopCamera();
                      setStep("results");
                    }}
                    className="w-full py-3 text-xs text-white/40 hover:text-white/60 transition-colors font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </m.div>
        )}

        {/* ===== STEP: PREVIEW (after selfie) ===== */}
        {step === "preview" && selfieData && (
          <m.div
            key="preview"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <div
              ref={step === "preview" ? cardRef : undefined}
              className="glass overflow-hidden clip-tactical"
              style={{
                boxShadow: "0 0 60px rgba(0, 238, 255, 0.08)",
              }}
            >
              {/* Header with selfie */}
              <div
                className="p-8 text-center relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 70, 85, 0.12), rgba(0, 238, 255, 0.12))",
                }}
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#00eeff]/10 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#ff4655]/10 blur-2xl" />

                <div className="relative z-10">
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 clip-skew"
                    style={{
                      background: "rgba(0, 238, 255, 0.08)",
                      border: "1px solid rgba(0, 238, 255, 0.2)",
                    }}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00eeff] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00eeff]" />
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00eeff]">
                      Victory Card
                    </span>
                  </div>

                  {/* Selfie */}
                  <div
                    className="w-28 h-28 rounded-full mx-auto mb-3 overflow-hidden border-2 border-[#00eeff]/40"
                    style={{ boxShadow: "0 0 30px rgba(0, 238, 255, 0.25)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selfieData}
                      alt="Selfie"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-black mb-1">
                    {username}
                  </h2>
                  {country && (
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider">
                      {country}
                    </p>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="px-8 py-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">
                      Total Score
                    </p>
                    <p className="text-4xl sm:text-5xl font-black gradient-text">
                      {score}
                    </p>
                  </div>
                  <div
                    className="w-20 h-20 flex items-center justify-center clip-tactical"
                    style={{
                      background: `${gradeColor}12`,
                      border: `2px solid ${gradeColor}40`,
                      boxShadow: `0 0 30px ${gradeColor}20`,
                    }}
                  >
                    <span
                      className="text-4xl font-black"
                      style={{ color: gradeColor }}
                    >
                      {grade}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: "Correct", value: `${correctCount}/${results.length}`, color: "#10b981" },
                    { label: "Accuracy", value: `${accuracy}%`, color: "#00eeff" },
                    { label: "Avg Time", value: `${avgTime.toFixed(1)}s`, color: "#f59e0b" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="text-center p-3 clip-tactical-sm"
                      style={{
                        background: `${stat.color}08`,
                        border: `1px solid ${stat.color}20`,
                      }}
                    >
                      <p className="text-xl font-black" style={{ color: stat.color }}>
                        {stat.value}
                      </p>
                      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/30 mt-1">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {rank && (
                  <div
                    className="text-center mb-6 p-4 clip-tactical-sm"
                    style={{
                      background: "linear-gradient(135deg, rgba(0, 238, 255, 0.06), rgba(255, 70, 85, 0.06))",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">
                      Global Rank
                    </p>
                    <p className="text-2xl font-black gradient-text">#{rank}</p>
                  </div>
                )}

                {/* Image results mini grid */}
                <div className="grid grid-cols-6 gap-1.5 mb-6">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="relative portrait-image rounded overflow-hidden"
                      style={{
                        border: `1px solid ${r.correct ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 70, 85, 0.3)"}`,
                      }}
                    >
                      <Image src={r.url} alt="" fill className="object-cover" sizes="50px" />
                      <div className={`absolute inset-0 ${r.correct ? "bg-emerald-500/40" : "bg-red-500/40"}`}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {r.correct ? (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Branding */}
                <div className="flex items-center justify-center gap-4 opacity-60">
                  <Image src="/assets/images/logos/cloud9-icon.png" alt="Cloud9" width={24} height={24} className="opacity-70" />
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">aioreal.fun</span>
                  <Image src="/assets/images/logos/jetbrains-icon.png" alt="JetBrains" width={24} height={24} className="opacity-70" />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 mt-6" data-export-hide="true">
              {uploadedUrl && (
                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-3 clip-tactical-sm mb-2"
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                    Card saved to gallery!
                  </p>
                </m.div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <m.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadCard}
                  disabled={isDownloading}
                  className="py-3 font-black uppercase tracking-[0.1em] text-xs cursor-pointer clip-tactical-sm overflow-hidden relative disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, rgba(0, 238, 255, 0.1), rgba(0, 238, 255, 0.05))",
                    border: "1px solid rgba(0, 238, 255, 0.3)",
                    color: "#00eeff",
                  }}
                >
                  {isDownloading ? "Saving..." : "Download"}
                </m.button>

                <m.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={uploadCard}
                  disabled={isUploading || !!uploadedUrl}
                  className="py-3 font-black uppercase tracking-[0.1em] text-xs cursor-pointer clip-tactical-sm overflow-hidden relative disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#10b981",
                  }}
                >
                  {isUploading ? "Uploading..." : uploadedUrl ? "Saved!" : "Save to Gallery"}
                </m.button>
              </div>

              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={retakeSelfie}
                className="w-full py-3 font-black uppercase tracking-[0.1em] text-xs cursor-pointer clip-tactical-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                Retake Photo
              </m.button>

              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPlayAgain}
                className="w-full py-4 font-black uppercase tracking-[0.15em] text-sm cursor-pointer clip-skew overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg, #ff4655, #00eeff)",
                  boxShadow: "0 0 30px rgba(255, 70, 85, 0.15)",
                }}
              >
                <m.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                />
                <span className="relative z-10">Play Again</span>
              </m.button>

              <Link href="/leaderboard" className="block text-center pt-1">
                <span className="text-xs text-white/30 hover:text-white/50 transition-colors font-bold uppercase tracking-wider">
                  View Leaderboard
                </span>
              </Link>
            </div>
          </m.div>
        )}

        {/* ===== STEP: GENERATING ===== */}
        {step === "generating" && (
          <m.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <div className="w-12 h-12 border-3 border-white/10 border-t-[#00eeff] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-black text-white/40 uppercase tracking-wider">
              Generating your card...
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}

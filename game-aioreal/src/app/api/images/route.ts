import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cache all images from DB to avoid repeated queries
let cachedAiImages: { id: string; url: string; isAi: boolean }[] | null = null;
let cachedRealImages: { id: string; url: string; isAi: boolean }[] | null =
  null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 60 seconds — images don't change often

export async function GET() {
  try {
    const now = Date.now();

    // Refresh image pool cache if stale
    if (!cachedAiImages || !cachedRealImages || now - cacheTimestamp > CACHE_TTL) {
      const [ai, real] = await Promise.all([
        prisma.gameImage.findMany({
          where: { isAi: true },
          select: { id: true, url: true, isAi: true },
        }),
        prisma.gameImage.findMany({
          where: { isAi: false },
          select: { id: true, url: true, isAi: true },
        }),
      ]);
      cachedAiImages = ai;
      cachedRealImages = real;
      cacheTimestamp = now;
    }

    // Shuffle and pick 6 from each
    const shuffledAi = [...cachedAiImages]
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);
    const shuffledReal = [...cachedRealImages]
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    // Combine and shuffle
    const gameImages = [...shuffledAi, ...shuffledReal].sort(
      () => Math.random() - 0.5,
    );

    return NextResponse.json({ images: gameImages });
  } catch (error) {
    console.error("Failed to fetch images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 },
    );
  }
}

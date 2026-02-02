import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// In-memory cache to avoid hammering DB on every poll
let cachedLeaderboard: unknown[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3000; // 3 seconds

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedLeaderboard && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json(
        { leaderboard: cachedLeaderboard },
        {
          headers: {
            "Cache-Control": "public, max-age=3, stale-while-revalidate=5",
          },
        },
      );
    }

    const scores = await prisma.score.findMany({
      include: {
        player: {
          select: { username: true, country: true },
        },
      },
      orderBy: { totalScore: "desc" },
      take: 50,
    });

    const leaderboard = scores.map((s, i) => ({
      rank: i + 1,
      username: s.player.username,
      country: s.player.country,
      score: s.totalScore,
      accuracy: s.accuracy,
      correctCount: s.correctCount,
      totalImages: s.totalImages,
      avgTime: s.avgTime,
      createdAt: s.createdAt,
    }));

    // Update cache
    cachedLeaderboard = leaderboard;
    cacheTimestamp = now;

    return NextResponse.json(
      { leaderboard },
      {
        headers: {
          "Cache-Control": "public, max-age=3, stale-while-revalidate=5",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}

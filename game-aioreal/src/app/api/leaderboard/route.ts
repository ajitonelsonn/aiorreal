import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

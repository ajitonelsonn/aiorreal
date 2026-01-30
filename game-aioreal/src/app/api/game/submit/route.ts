import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, country, totalScore, correctCount, totalImages, accuracy, avgTime } = body;

    if (!username || totalScore === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create player
    const player = await prisma.player.create({
      data: {
        username,
        country: country || null,
      },
    });

    // Create score
    const score = await prisma.score.create({
      data: {
        playerId: player.id,
        totalScore,
        correctCount,
        totalImages,
        accuracy,
        avgTime: avgTime || null,
      },
    });

    // Get rank
    const rank = await prisma.score.count({
      where: { totalScore: { gt: totalScore } },
    });

    return NextResponse.json({
      playerId: player.id,
      scoreId: score.id,
      rank: rank + 1,
    });
  } catch (error) {
    console.error("Failed to submit score:", error);
    return NextResponse.json({ error: "Failed to submit score" }, { status: 500 });
  }
}

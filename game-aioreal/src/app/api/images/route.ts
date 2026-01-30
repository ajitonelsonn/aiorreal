import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all images, randomly select 12 (6 AI + 6 real for balance)
    const aiImages = await prisma.gameImage.findMany({
      where: { isAi: true },
      select: { id: true, url: true, isAi: true },
    });

    const realImages = await prisma.gameImage.findMany({
      where: { isAi: false },
      select: { id: true, url: true, isAi: true },
    });

    // Shuffle and pick 6 from each
    const shuffledAi = aiImages.sort(() => Math.random() - 0.5).slice(0, 6);
    const shuffledReal = realImages.sort(() => Math.random() - 0.5).slice(0, 6);

    // Combine and shuffle
    const gameImages = [...shuffledAi, ...shuffledReal].sort(
      () => Math.random() - 0.5
    );

    return NextResponse.json({ images: gameImages });
  } catch (error) {
    console.error("Failed to fetch images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

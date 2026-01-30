import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.galleryItem.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch gallery:", error);
    return NextResponse.json([], { status: 500 });
  }
}

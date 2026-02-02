import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Countries rarely change — cache indefinitely until restart
let cachedCountries: { name: string; code: string; flag: string }[] | null =
  null;

export async function GET() {
  try {
    cachedCountries ??= await prisma.country.findMany({
      select: { name: true, code: true, flag: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(cachedCountries, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    return NextResponse.json([], { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME || "aiorreal.fun";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, filename, username, score, country } = body;

    if (!image || !filename || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Parse base64 data URL
    const matches = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }

    const contentType = `image/${matches[1]}`;
    const buffer = Buffer.from(matches[2], "base64");

    const key = `cards/${filename}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const publicUrl = `https://s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${BUCKET}/${key}`;

    // Save to gallery
    await prisma.galleryItem.create({
      data: {
        url: publicUrl,
        username: username.slice(0, 50),
        score: Math.round(Number(score) || 0),
        country: country?.slice(0, 100) || null,
      },
    });

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Failed to upload card:", error);
    return NextResponse.json({ error: "Failed to upload card" }, { status: 500 });
  }
}

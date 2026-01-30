import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AI_IMAGES = [
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/277c0849-185c-4630-8a8e-843549fc9e79.jpg", category: "gaming", description: "AI gaming scene - Valorant" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/b621b729-ff94-496c-8156-684607dd007d.jpg", category: "gaming", description: "AI gaming scene - Valorant 2" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/7398cc83-b013-4f21-ad9a-6fa3ac69e351.jpg", category: "gaming", description: "AI gaming scene - League of Legends" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/ee09bd43-c058-403f-b8c1-cf713a35bf58.jpg", category: "gaming", description: "AI gaming scene - League of Legends 2" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/ae190ee1-4e06-4a68-a438-582e9323d5b6.jpg", category: "esports", description: "AI esports event" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/07e95886-079c-405a-807b-e21c9bd3cc03.jpg", category: "esports", description: "AI esports event 2" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/0dd36f0e-378e-47e2-8f26-522c9b7effb9.jpg", category: "portrait", description: "AI portrait - woman face" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/bd0663f2-c30c-4dab-ba0c-6a6516dd7e8b.jpg", category: "portrait", description: "AI portrait - woman face 2" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/c9af094c-0430-40cc-8885-dde4b20a88e4.jpg", category: "people", description: "AI romantic couple" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/8664a3e4-abb6-43d7-8eab-a662d012238e.jpg", category: "people", description: "AI romantic couple 2" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/8eba85f9-09a9-4055-ac12-9eecbfc75366.jpg", category: "nature", description: "AI rose flower" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/66f5038c-a6da-4596-8e73-dbf516a8bee9.jpg", category: "nature", description: "AI rose flower 2" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/47695132-b899-47bf-8743-f1fd101b0acd.jpg", category: "architecture", description: "AI modern house" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/25b79bac-bb03-4323-95db-a5cfd9d30a24.jpg", category: "military", description: "AI soldier" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/8ee64084-f924-40aa-8c9d-09b84e22830d.jpg", category: "military", description: "AI soldier 2" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/68c10a92-85d6-4b4f-8ca3-8865475efa80.jpg", category: "luxury", description: "AI private jet interior" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/aea71934-316a-45d4-a667-992765ea37a7.jpg", category: "luxury", description: "AI private jet interior 2" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/48bfbec2-b6a8-46b4-9228-e4c69c6d25fd.jpg", category: "nature", description: "AI forest scene" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/ai_image/61387c12-bff3-45d9-8d37-cfedd92c6812.jpg", category: "nature", description: "AI forest scene 2" },
];

const REAL_IMAGES = [
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/bride-8358737_1920.jpg", category: "people", source: "Pixabay - OlcayErtem" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/bride-9924693_1920.jpg", category: "people", source: "Pixabay - OlcayErtem" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/balinese-8097542_1920.jpg", category: "people", source: "Pixabay - Deddy_Sunarto" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/woman-5303971_1280.jpg", category: "people", source: "Pixabay - Tranvanquyet" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/contrast-5073265_1280.jpg", category: "architecture", source: "Pixabay - fietzfotos" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/lubeck-travemunde-5052446_1920.jpg", category: "architecture", source: "Pixabay - Kor_el_ya" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/poppies-5392907_1920.jpg", category: "nature", source: "Pixabay - thegermankid" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/flower-800752_1920.jpg", category: "nature", source: "Pixabay - TanteTati" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/gameboy-1143675_1920.jpg", category: "gaming", source: "Pixabay - Peggy_Marco" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/photo-1618193139062-2c5bf4f935b7.jpg", category: "gaming", source: "Unsplash - Erik Mclean" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/photo-1649425371492-78dc23abb424.jpg", category: "gaming", source: "Unsplash - Eugene Chystiakov" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/man-4207514_1920.jpg", category: "military", source: "Pixabay - Sammy-Sander" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/knight-9765068_1920.jpg", category: "military", source: "Pixabay - Raman_Spirydonau" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/woods-7661735_1920.jpg", category: "nature", source: "Pixabay - Strandkind_Muecke" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/forest-220719_1920.jpg", category: "nature", source: "Pixabay - DeltaWorks" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/food-1050813_1920.jpg", category: "food", source: "Pixabay - karriezhu" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/food-5981232_1920.jpg", category: "food", source: "Pixabay - romjanaly" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/owl-10077647_1920.jpg", category: "nature", source: "Pixabay - Nick4Fun" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/vietnam-6947339_1920.jpg", category: "people", source: "Pixabay - Chuotanhls" },
  { url: "https://s3.us-east-1.amazonaws.com/aiorreal.fun/not_ai_image/tree-9913930_1920.jpg", category: "nature", source: "Pixabay - wal_172619_II" },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing images
  await prisma.gameImage.deleteMany();

  // Seed AI images
  for (const img of AI_IMAGES) {
    await prisma.gameImage.create({
      data: {
        url: img.url,
        isAi: true,
        category: img.category,
        description: img.description,
      },
    });
  }

  // Seed real images
  for (const img of REAL_IMAGES) {
    await prisma.gameImage.create({
      data: {
        url: img.url,
        isAi: false,
        category: img.category,
        source: img.source,
      },
    });
  }

  const count = await prisma.gameImage.count();
  console.log(`Seeded ${count} images (${AI_IMAGES.length} AI + ${REAL_IMAGES.length} real)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

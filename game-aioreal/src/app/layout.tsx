import type { Metadata } from "next";
import "./globals.css";
import { MusicProvider } from "./components/MusicProvider";

export const metadata: Metadata = {
  title: "AI or Real? - Can You Tell The Difference?",
  description:
    "A fast-paced mini-game where you guess if images are AI-generated or real photographs. Built for the Cloud9 x JetBrains Hackathon.",
  metadataBase: new URL("https://www.aiorreal.fun"),
  openGraph: {
    title: "AI or Real? - Can You Tell The Difference?",
    description:
      "Can you tell AI from reality? Test your skills in this fast-paced image guessing game! Built for the Cloud9 x JetBrains Hackathon.",
    siteName: "AI or Real?",
    url: "https://www.aiorreal.fun",
    type: "website",
    images: [
      {
        url: "/ss/landing.png",
        width: 1200,
        height: 630,
        alt: "AI or Real? - Can You Tell The Difference?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI or Real? - Can You Tell The Difference?",
    description:
      "Can you tell AI from reality? Test your skills in this fast-paced image guessing game!",
    images: ["/ss/landing.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <MusicProvider>{children}</MusicProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { MusicProvider } from "./components/MusicProvider";

export const metadata: Metadata = {
  title: "AI or Real? - Can You Tell The Difference?",
  description:
    "A fast-paced mini-game where you guess if images are AI-generated or real photographs. Built for the Cloud9 x JetBrains Hackathon.",
  openGraph: {
    title: "AI or Real?",
    description: "Can you tell AI from reality? Test your skills in this fast-paced image game!",
    siteName: "AI or Real?",
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

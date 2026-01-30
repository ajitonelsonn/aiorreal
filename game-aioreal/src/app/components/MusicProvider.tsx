"use client";

import { createContext, useContext, useEffect, useRef, ReactNode, useState } from "react";
import { usePathname } from "next/navigation";

type MusicTrack = "menu" | "game" | "victory" | null;

interface MusicContextType {
  playMenuMusic: () => void;
  playGameMusic: () => void;
  playVictoryMusic: () => void;
  stopAllMusic: () => void;
  currentTrack: MusicTrack;
}

const MusicContext = createContext<MusicContextType>({
  playMenuMusic: () => {},
  playGameMusic: () => {},
  playVictoryMusic: () => {},
  stopAllMusic: () => {},
  currentTrack: null,
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const menuMusicRef = useRef<HTMLAudioElement | null>(null);
  const gameMusicRef = useRef<HTMLAudioElement | null>(null);
  const victoryMusicRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();

  const initializeAudio = () => {
    if (!isInitialized) {
      const menuMusic = new Audio();
      menuMusic.preload = "none";
      menuMusic.loop = true;
      menuMusic.volume = 0.3;
      menuMusic.src = "/assets/sounds/music/music-menu.mp3";
      menuMusicRef.current = menuMusic;

      const gameMusic = new Audio();
      gameMusic.preload = "none";
      gameMusic.loop = true;
      gameMusic.volume = 0.4;
      gameMusic.src = "/assets/sounds/music/music-game.mp3";
      gameMusicRef.current = gameMusic;

      const victoryMusic = new Audio();
      victoryMusic.preload = "none";
      victoryMusic.loop = false;
      victoryMusic.volume = 0.4;
      victoryMusic.src = "/assets/sounds/music/music-victory.mp3";
      victoryMusicRef.current = victoryMusic;

      setIsInitialized(true);
    }
  };

  const stopAllMusic = () => {
    [menuMusicRef, gameMusicRef, victoryMusicRef].forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });
    setCurrentTrack(null);
  };

  const playMenuMusic = () => {
    if (!isInitialized) {
      initializeAudio();
      setTimeout(() => playMenuMusic(), 0);
      return;
    }
    if (gameMusicRef.current) { gameMusicRef.current.pause(); gameMusicRef.current.currentTime = 0; }
    if (victoryMusicRef.current) { victoryMusicRef.current.pause(); victoryMusicRef.current.currentTime = 0; }

    if (menuMusicRef.current && menuMusicRef.current.paused) {
      menuMusicRef.current.play().then(() => setCurrentTrack("menu")).catch(() => {});
    }
  };

  const playGameMusic = () => {
    if (!isInitialized) {
      initializeAudio();
      setTimeout(() => playGameMusic(), 0);
      return;
    }
    if (menuMusicRef.current) { menuMusicRef.current.pause(); menuMusicRef.current.currentTime = 0; }
    if (victoryMusicRef.current) { victoryMusicRef.current.pause(); victoryMusicRef.current.currentTime = 0; }

    if (gameMusicRef.current && gameMusicRef.current.paused) {
      gameMusicRef.current.play().then(() => setCurrentTrack("game")).catch(() => {});
    }
  };

  const playVictoryMusic = () => {
    if (!isInitialized) {
      initializeAudio();
      setTimeout(() => playVictoryMusic(), 0);
      return;
    }
    if (menuMusicRef.current) { menuMusicRef.current.pause(); menuMusicRef.current.currentTime = 0; }
    if (gameMusicRef.current) { gameMusicRef.current.pause(); gameMusicRef.current.currentTime = 0; }

    if (victoryMusicRef.current && victoryMusicRef.current.paused) {
      victoryMusicRef.current.play().then(() => setCurrentTrack("victory")).catch(() => {});
      victoryMusicRef.current.onended = () => playMenuMusic();
    }
  };

  // Auto-play menu music on menu pages
  useEffect(() => {
    const menuPages = ["/", "/leaderboard"];
    const shouldPlayMenu = menuPages.some((p) => pathname === p);

    if (shouldPlayMenu) {
      if (!isInitialized) { initializeAudio(); return; }
      if (currentTrack === null || currentTrack !== "menu") {
        playMenuMusic();
      }
    }
  }, [pathname, currentTrack, isInitialized]);

  useEffect(() => {
    return () => {
      stopAllMusic();
      if (menuMusicRef.current) menuMusicRef.current.src = "";
      if (gameMusicRef.current) gameMusicRef.current.src = "";
      if (victoryMusicRef.current) victoryMusicRef.current.src = "";
    };
  }, []);

  return (
    <MusicContext.Provider value={{ playMenuMusic, playGameMusic, playVictoryMusic, stopAllMusic, currentTrack }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}

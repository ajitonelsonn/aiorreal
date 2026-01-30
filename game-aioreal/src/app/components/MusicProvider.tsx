"use client";

import { createContext, useContext, useEffect, useRef, ReactNode, useState } from "react";
import { usePathname } from "next/navigation";

type MusicTrack = "game" | "victory" | null;

interface MusicContextType {
  playGameMusic: () => void;
  playVictoryMusic: () => void;
  stopAllMusic: () => void;
  currentTrack: MusicTrack;
}

const MusicContext = createContext<MusicContextType>({
  playGameMusic: () => {},
  playVictoryMusic: () => {},
  stopAllMusic: () => {},
  currentTrack: null,
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const gameMusicRef = useRef<HTMLAudioElement | null>(null);
  const victoryMusicRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();

  const initializeAudio = () => {
    if (!isInitialized) {
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
    [gameMusicRef, victoryMusicRef].forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });
    setCurrentTrack(null);
  };

  const playGameMusic = () => {
    if (!isInitialized) {
      initializeAudio();
      return;
    }
    
    // Stop other tracks
    if (victoryMusicRef.current) { 
      victoryMusicRef.current.pause(); 
      victoryMusicRef.current.currentTime = 0; 
    }

    // Only play if not already playing
    if (gameMusicRef.current && gameMusicRef.current.paused) {
      gameMusicRef.current.play().then(() => setCurrentTrack("game")).catch(() => {});
    }
  };

  const playVictoryMusic = () => {
    if (!isInitialized) {
      initializeAudio();
      return;
    }
    
    // Stop other tracks
    if (gameMusicRef.current) { 
      gameMusicRef.current.pause(); 
      gameMusicRef.current.currentTime = 0; 
    }

    // Only play if not already playing
    if (victoryMusicRef.current && victoryMusicRef.current.paused) {
      victoryMusicRef.current.play().then(() => setCurrentTrack("victory")).catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      stopAllMusic();
      if (gameMusicRef.current) gameMusicRef.current.src = "";
      if (victoryMusicRef.current) victoryMusicRef.current.src = "";
    };
  }, []);

  return (
    <MusicContext.Provider value={{ playGameMusic, playVictoryMusic, stopAllMusic, currentTrack }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}

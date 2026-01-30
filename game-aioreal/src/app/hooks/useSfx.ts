"use client";

import { useRef, useCallback } from "react";

const SFX_FILES = {
  click: "/assets/sounds/sfx/click.mp3",
  coin: "/assets/sounds/sfx/coin.mp3",
  error: "/assets/sounds/sfx/error.mp3",
  explosion: "/assets/sounds/sfx/explosion.mp3",
  gameover: "/assets/sounds/sfx/gameover.mp3",
  jump: "/assets/sounds/sfx/jump.mp3",
  pop: "/assets/sounds/sfx/pop.mp3",
  success: "/assets/sounds/sfx/success.mp3",
  victory: "/assets/sounds/sfx/victory.mp3",
  whoosh: "/assets/sounds/sfx/whoosh.mp3",
} as const;

export type SfxName = keyof typeof SFX_FILES;

export function useSfx() {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  const play = useCallback((name: SfxName, volume = 0.5) => {
    try {
      const src = SFX_FILES[name];
      // Always create a new Audio for overlapping sounds
      const audio = new Audio(src);
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.play().catch(() => {});
      // Cache one instance for preloading
      if (!audioCache.current.has(name)) {
        audioCache.current.set(name, audio);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const playClick = useCallback(() => play("click", 0.3), [play]);
  const playCorrect = useCallback(() => play("success", 0.5), [play]);
  const playWrong = useCallback(() => play("error", 0.5), [play]);
  const playTick = useCallback(() => play("pop", 0.2), [play]);
  const playGameOver = useCallback(() => play("gameover", 0.6), [play]);
  const playWhoosh = useCallback(() => play("whoosh", 0.3), [play]);
  const playCoin = useCallback(() => play("coin", 0.4), [play]);

  return { play, playClick, playCorrect, playWrong, playTick, playGameOver, playWhoosh, playCoin };
}

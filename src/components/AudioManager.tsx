import { useEffect, useRef } from "react";
import { useGameStore } from "../store";

export default function AudioManager() {
  const bgmSrc = useGameStore((s) => s.bgmSrc);
  const currentVoice = useGameStore((s) => s.currentVoice);
  const settings = useGameStore((s) => s.settings);
  const screen = useGameStore((s) => s.screen);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const prevBgmRef = useRef("");

  // BGM management
  useEffect(() => {
    if (screen !== "game") {
      // Pause BGM when not in game
      bgmRef.current?.pause();
      return;
    }

    if (!bgmSrc || !bgmSrc.startsWith("http")) {
      // No valid BGM source
      bgmRef.current?.pause();
      prevBgmRef.current = "";
      return;
    }

    if (bgmSrc === prevBgmRef.current) return;
    prevBgmRef.current = bgmSrc;

    if (bgmRef.current) {
      // Fade out old BGM
      const old = bgmRef.current;
      const fadeOut = setInterval(() => {
        if (old.volume > 0.05) {
          old.volume = Math.max(0, old.volume - 0.05);
        } else {
          clearInterval(fadeOut);
          old.pause();
        }
      }, 50);
    }

    const audio = new Audio(bgmSrc);
    audio.loop = true;
    audio.volume = settings.bgmVolume * settings.masterVolume;
    audio.play().catch(() => {
      // Autoplay blocked — will play on next user interaction
    });
    bgmRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [bgmSrc, screen]);

  // Update BGM volume when settings change
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = settings.bgmVolume * settings.masterVolume;
    }
  }, [settings.bgmVolume, settings.masterVolume]);

  // Voice playback
  useEffect(() => {
    // Stop previous voice
    if (voiceRef.current) {
      voiceRef.current.pause();
      voiceRef.current.src = "";
    }

    if (!currentVoice) return;

    const audio = new Audio(currentVoice);
    audio.volume = settings.voiceVolume * settings.masterVolume;
    audio.play().catch(() => {});
    voiceRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [currentVoice]);

  // Update voice volume when settings change
  useEffect(() => {
    if (voiceRef.current) {
      voiceRef.current.volume = settings.voiceVolume * settings.masterVolume;
    }
  }, [settings.voiceVolume, settings.masterVolume]);

  return null; // This component only manages audio, no visual output
}

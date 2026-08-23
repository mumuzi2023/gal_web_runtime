import { useEffect, useRef } from "react";
import { useGameStore } from "../store";

const FADE_MS = 650;

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function fadeVolume(
  audio: HTMLAudioElement,
  target: number,
  duration = FADE_MS,
  onDone?: () => void,
): () => void {
  const start = audio.volume;
  const startedAt = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    audio.volume = clampVolume(start + (target - start) * progress);
    if (progress < 1) frame = requestAnimationFrame(tick);
    else onDone?.();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

export default function AudioManager() {
  const bgmSrc = useGameStore((state) => state.bgmSrc);
  const currentVoice = useGameStore((state) => state.currentVoice);
  const voiceToken = useGameStore((state) => state.voiceToken);
  const soundEffects = useGameStore((state) => state.soundEffects);
  const settings = useGameStore((state) => state.settings);
  const screen = useGameStore((state) => state.screen);
  const overlayReturnScreen = useGameStore((state) => state.overlayReturnScreen);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const effectRefs = useRef(new Set<HTMLAudioElement>());
  const bgmFadeCancelRef = useRef<(() => void) | null>(null);
  const pendingBgmPlayRef = useRef(false);
  const pendingVoicePlayRef = useRef(false);
  const handledEffectIdRef = useRef(0);

  const gameIsActive = screen === "game" || (screen !== "title" && overlayReturnScreen === "game");
  const voiceCanPlay = screen === "game" || screen === "backlog";
  const bgmVolume = clampVolume(settings.bgmVolume * settings.masterVolume);
  const voiceVolume = clampVolume(settings.voiceVolume * settings.masterVolume);
  const seVolume = clampVolume(settings.seVolume * settings.masterVolume);

  // BGM source lifecycle. Overlay screens intentionally do not recreate or
  // pause BGM; it remains continuous beneath settings/save/backlog/progress.
  useEffect(() => {
    const liveSettings = useGameStore.getState().settings;
    const targetVolume = clampVolume(liveSettings.bgmVolume * liveSettings.masterVolume);
    bgmFadeCancelRef.current?.();
    const previous = bgmRef.current;

    if (!bgmSrc || !gameIsActive) {
      if (previous) {
        bgmFadeCancelRef.current = fadeVolume(previous, 0, 300, () => {
          previous.pause();
          previous.removeAttribute("src");
          previous.load();
        });
      }
      bgmRef.current = null;
      pendingBgmPlayRef.current = false;
      return;
    }

    if (previous?.dataset.source === bgmSrc) {
      previous.volume = targetVolume;
      if (previous.paused) {
        void previous.play().catch(() => { pendingBgmPlayRef.current = true; });
      }
      return;
    }

    if (previous) {
      const old = previous;
      fadeVolume(old, 0, 350, () => {
        old.pause();
        old.removeAttribute("src");
        old.load();
      });
    }

    const audio = new Audio(bgmSrc);
    audio.dataset.source = bgmSrc;
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    bgmRef.current = audio;
    void audio.play().then(() => {
      pendingBgmPlayRef.current = false;
      bgmFadeCancelRef.current = fadeVolume(audio, targetVolume);
    }).catch(() => {
      // Browser autoplay policy: the pointer listener below retries from the
      // first real user gesture without losing the selected BGM.
      pendingBgmPlayRef.current = true;
    });

    return () => {
      bgmFadeCancelRef.current?.();
    };
  }, [bgmSrc, gameIsActive]);

  useEffect(() => {
    if (!bgmRef.current) return;
    bgmFadeCancelRef.current?.();
    bgmFadeCancelRef.current = fadeVolume(bgmRef.current, bgmVolume, 180);
  }, [bgmVolume]);

  // Retry blocked autoplay on a user gesture. This also handles mobile Safari
  // returning to the page after the audio session was suspended.
  useEffect(() => {
    const unlock = () => {
      const bgm = bgmRef.current;
      if (bgm && gameIsActive && (pendingBgmPlayRef.current || bgm.paused)) {
        bgm.volume = bgmVolume;
        void bgm.play().then(() => { pendingBgmPlayRef.current = false; }).catch(() => {});
      }
      const voice = voiceRef.current;
      if (voice && voiceCanPlay && pendingVoicePlayRef.current && !voice.ended) {
        voice.volume = voiceVolume;
        void voice.play().then(() => { pendingVoicePlayRef.current = false; }).catch(() => {});
      }
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
  }, [bgmVolume, gameIsActive, voiceCanPlay, voiceVolume]);

  // Voice is event-based (voiceToken), so two consecutive lines using the
  // same file can still replay. Modal screens pause and later resume the line.
  useEffect(() => {
    voiceRef.current?.pause();
    if (voiceRef.current) {
      voiceRef.current.removeAttribute("src");
      voiceRef.current.load();
    }
    if (!currentVoice) {
      voiceRef.current = null;
      pendingVoicePlayRef.current = false;
      return;
    }
    const audio = new Audio(currentVoice);
    audio.preload = "auto";
    const liveSettings = useGameStore.getState().settings;
    audio.volume = clampVolume(liveSettings.voiceVolume * liveSettings.masterVolume);
    voiceRef.current = audio;
    const liveScreen = useGameStore.getState().screen;
    if (liveScreen === "game" || liveScreen === "backlog") {
      void audio.play()
        .then(() => { pendingVoicePlayRef.current = false; })
        .catch(() => { pendingVoicePlayRef.current = true; });
    }
    return () => {
      audio.pause();
    };
  }, [currentVoice, voiceToken]);

  useEffect(() => {
    const audio = voiceRef.current;
    if (!audio) return;
    audio.volume = voiceVolume;
    if (voiceCanPlay && audio.paused && !audio.ended) {
      void audio.play()
        .then(() => { pendingVoicePlayRef.current = false; })
        .catch(() => { pendingVoicePlayRef.current = true; });
    } else if (!voiceCanPlay && !audio.paused) audio.pause();
  }, [voiceCanPlay, voiceVolume]);

  // SE is also event-based. Keep multiple short effects alive concurrently.
  useEffect(() => {
    const liveState = useGameStore.getState();
    const active = liveState.screen === "game" || (
      liveState.screen !== "title" && liveState.overlayReturnScreen === "game"
    );
    const pending = soundEffects.filter((event) => event.id > handledEffectIdRef.current);
    if (pending.length === 0) return;
    handledEffectIdRef.current = Math.max(...pending.map((event) => event.id));
    if (!active) return;

    for (const event of pending) {
      if (!event.src) continue;
      const audio = new Audio(event.src);
      audio.preload = "auto";
      audio.volume = clampVolume(liveState.settings.seVolume * liveState.settings.masterVolume);
      effectRefs.current.add(audio);
      const dispose = () => {
        audio.removeEventListener("ended", dispose);
        audio.removeEventListener("error", dispose);
        effectRefs.current.delete(audio);
      };
      audio.addEventListener("ended", dispose, { once: true });
      audio.addEventListener("error", dispose, { once: true });
      void audio.play().catch(dispose);
    }
  }, [soundEffects]);

  useEffect(() => {
    // HTMLAudioElement is intentionally mutable; these instances are external
    // media resources, not React state.
    // eslint-disable-next-line react-hooks/immutability
    for (const audio of effectRefs.current) audio.volume = seVolume;
  }, [seVolume]);

  useEffect(() => {
    if (gameIsActive) return;
    for (const audio of effectRefs.current) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    effectRefs.current.clear();
  }, [gameIsActive]);

  // Browsers may keep audio running in a background tab. Pause on visibility
  // loss and resume only the long-lived tracks when visible again.
  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      if (hidden) {
        bgmRef.current?.pause();
        voiceRef.current?.pause();
        for (const audio of effectRefs.current) audio.pause();
        return;
      }
      if (gameIsActive && bgmRef.current) {
        void bgmRef.current.play().catch(() => { pendingBgmPlayRef.current = true; });
      }
      if (voiceCanPlay && voiceRef.current && !voiceRef.current.ended) {
        void voiceRef.current.play()
          .then(() => { pendingVoicePlayRef.current = false; })
          .catch(() => { pendingVoicePlayRef.current = true; });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [gameIsActive, voiceCanPlay]);

  useEffect(() => () => {
    bgmFadeCancelRef.current?.();
    bgmRef.current?.pause();
    voiceRef.current?.pause();
    for (const audio of effectRefs.current) audio.pause();
    effectRefs.current.clear();
  }, []);

  return null;
}

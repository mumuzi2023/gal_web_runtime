import { useEffect, useState, useCallback } from "react";
import { useGameStore } from "./store";
import TitleScreen from "./components/TitleScreen";
import BackgroundLayer from "./components/BackgroundLayer";
import DialogBox from "./components/DialogBox";
import ChoiceMenu from "./components/ChoiceMenu";
import ChapterTitle from "./components/ChapterTitle";
import AudioManager from "./components/AudioManager";
import SettingsPanel from "./components/SettingsPanel";
import SaveLoadScreen from "./components/SaveLoadScreen";
import BacklogPanel from "./components/BacklogPanel";
import EndingsScreen from "./components/EndingsScreen";
import ProgressPanel from "./components/ProgressPanel";

// Fixed internal resolution — the entire game is designed at this size
// and scaled uniformly to fit the viewport (like an image).
const GAME_W = 1920;
const GAME_H = 1080;

export default function App() {
  const loadGameData = useGameStore((s) => s.loadGameData);
  const loading = useGameStore((s) => s.loading);
  const error = useGameStore((s) => s.error);
  const gameData = useGameStore((s) => s.gameData);
  const screen = useGameStore((s) => s.screen);

  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setScale(Math.min(vw / GAME_W, vh / GAME_H));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  useEffect(() => {
    // Get game data URL from query parameter, or auto-load game_data.json
    const params = new URLSearchParams(window.location.search);
    const url = params.get("data") || `${import.meta.env.BASE_URL}game_data.json`;
    loadGameData(url);
  }, [loadGameData]);

  if (loading || (!gameData && !error)) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-white/60 text-lg animate-pulse">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">加载失败</div>
          <div className="text-white/40 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div
        className="absolute overflow-hidden select-none"
        style={{
          width: GAME_W,
          height: GAME_H,
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
      {/* Audio manager (invisible) */}
      <AudioManager />

      {/* Title screen */}
      {screen === "title" && <TitleScreen />}

      {/* Game screen */}
      {screen === "game" && (
        <>
          <BackgroundLayer />
          <DialogBox />
          <ChoiceMenu />
          <ChapterTitle />
        </>
      )}

      {/* Overlay screens */}
      <SettingsPanel />
      <SaveLoadScreen />
      <BacklogPanel />
      <EndingsScreen />
      <ProgressPanel />
      </div>
    </div>
  );
}

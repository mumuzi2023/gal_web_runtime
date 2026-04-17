import { useEffect } from "react";
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

export default function App() {
  const loadGameData = useGameStore((s) => s.loadGameData);
  const loading = useGameStore((s) => s.loading);
  const error = useGameStore((s) => s.error);
  const gameData = useGameStore((s) => s.gameData);
  const screen = useGameStore((s) => s.screen);

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
    <div className="h-full w-full relative overflow-hidden select-none">
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
    </div>
  );
}

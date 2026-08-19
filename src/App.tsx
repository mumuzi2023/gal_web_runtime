import { useEffect, useCallback, useRef } from "react";
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

// Reference design dimensions. Layout is fluid (% of the viewport), but font
// sizes scale with `min(vw/REF_W, vh/REF_H)` so text stays readable on small
// windows without distorting layout.
const REF_W = 1920;
const REF_H = 1080;

export default function App() {
  const loadGameData = useGameStore((s) => s.loadGameData);
  const loading = useGameStore((s) => s.loading);
  const error = useGameStore((s) => s.error);
  const gameData = useGameStore((s) => s.gameData);
  const screen = useGameStore((s) => s.screen);
  const commandIndex = useGameStore((s) => s.commandIndex);
  const waitingForChoice = useGameStore((s) => s.waitingForChoice);
  const choiceOptions = useGameStore((s) => s.choiceOptions);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const advanceCommand = useGameStore((s) => s.advanceCommand);
  const selectChoice = useGameStore((s) => s.selectChoice);
  const studioStarted = useRef(false);

  const updateFontScale = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / REF_W, vh / REF_H);
    // 16px is the default html root font-size; multiplying it scales every
    // Tailwind text-* class (which is rem-based) and any rem/em consumer.
    document.documentElement.style.fontSize = `${Math.max(8, 16 * scale)}px`;
  }, []);

  useEffect(() => {
    updateFontScale();
    window.addEventListener("resize", updateFontScale);
    return () => {
      window.removeEventListener("resize", updateFontScale);
      // Restore default so the loading/error screens render normally if the
      // component unmounts (e.g. HMR).
      document.documentElement.style.fontSize = "";
    };
  }, [updateFontScale]);

  useEffect(() => {
    // Get game data URL from query parameter, or auto-load game_data.json
    const params = new URLSearchParams(window.location.search);
    const url = params.get("data") || `${import.meta.env.BASE_URL}game_data.json`;
    loadGameData(url);
  }, [loadGameData]);

  // Studio embeds the real runtime in an iframe.  It must skip the title
  // screen and seek to the command selected by the editor, while the normal
  // player keeps its existing title/new-game flow unchanged.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("studio") !== "1" || !gameData || studioStarted.current) return;
    studioStarted.current = true;
    startNewGame();
  }, [gameData, startNewGame]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("studio") !== "1" || screen !== "game") return;
    const target = Math.max(0, Number(params.get("command") || 0));
    if (commandIndex >= target) return;
    const timer = window.setTimeout(() => {
      if (waitingForChoice && choiceOptions[0]) selectChoice(choiceOptions[0]);
      else advanceCommand();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [screen, commandIndex, waitingForChoice, choiceOptions, advanceCommand, selectChoice]);

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
      <div className="absolute inset-0 overflow-hidden select-none">
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

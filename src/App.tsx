import { useEffect, useRef } from "react";
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

export default function App() {
  const loadGameData = useGameStore((s) => s.loadGameData);
  const loading = useGameStore((s) => s.loading);
  const error = useGameStore((s) => s.error);
  const gameData = useGameStore((s) => s.gameData);
  const screen = useGameStore((s) => s.screen);
  const overlayReturnScreen = useGameStore((s) => s.overlayReturnScreen);
  const preloadProgress = useGameStore((s) => s.preloadProgress);
  const preloadLabel = useGameStore((s) => s.preloadLabel);
  const preloadFailures = useGameStore((s) => s.preloadFailures);
  const commandIndex = useGameStore((s) => s.commandIndex);
  const commandSerial = useGameStore((s) => s.commandSerial);
  const currentSceneKey = useGameStore((s) => s.currentSceneKey);
  const waitingForChoice = useGameStore((s) => s.waitingForChoice);
  const choiceOptions = useGameStore((s) => s.choiceOptions);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const advanceCommand = useGameStore((s) => s.advanceCommand);
  const selectChoice = useGameStore((s) => s.selectChoice);
  const finishTyping = useGameStore((s) => s.finishTyping);
  const closeOverlay = useGameStore((s) => s.closeOverlay);
  const toggleAutoMode = useGameStore((s) => s.toggleAutoMode);
  const studioStarted = useRef(false);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.repeat || target?.closest("button, input, select, textarea, [contenteditable='true']")) return;
      if (screen !== "game") {
        if (event.key === "Escape") closeOverlay();
        return;
      }
      if (waitingForChoice) return;
      if ([" ", "Enter", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const state = useGameStore.getState();
        if (state.isTyping) finishTyping();
        else if (state.waitingForClick) advanceCommand();
      } else if (event.key.toLowerCase() === "a") {
        toggleAutoMode();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advanceCommand, closeOverlay, finishTyping, screen, toggleAutoMode, waitingForChoice]);

  if (loading || (!gameData && !error)) {
    return (
      <div className="runtime-loading">
        <div className="runtime-loading__glow" />
        <div className="runtime-loading__panel">
          <div className="runtime-loading__eyebrow">STORYFORGE RUNTIME</div>
          <div className="runtime-loading__title">正在准备故事</div>
          <div className="runtime-loading__track">
            <span style={{ width: `${Math.max(6, preloadProgress * 100)}%` }} />
          </div>
          <div className="runtime-loading__status">{preloadLabel || "读取游戏数据…"}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="runtime-loading">
        <div className="runtime-error-card">
          <div className="runtime-error-card__icon">!</div>
          <div className="runtime-error-card__title">故事载入失败</div>
          <div className="runtime-error-card__detail">{error}</div>
          <button onClick={() => window.location.reload()}>重新加载</button>
        </div>
      </div>
    );
  }

  return (
    <main className="runtime-shell">
      <div className="runtime-stage select-none">
      {/* Audio manager (invisible) */}
      <AudioManager />

      {/* Keep the base scene mounted below modal screens. This prevents black
          flashes and lets BGM continue while settings/backlog are open. */}
      {(screen === "title" || (screen !== "game" && overlayReturnScreen === "title")) && <TitleScreen />}

      {/* Game screen */}
      {(screen === "game" || (screen !== "title" && overlayReturnScreen === "game")) && (
        <>
          <BackgroundLayer />
          <DialogBox key={`${currentSceneKey}:${commandIndex}:${commandSerial}`} />
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

      {preloadFailures.length > 0 && screen !== "title" && (
        <div className="asset-warning" title={`${preloadFailures.length} 个资源未能预载`}>
          <span>!</span> {preloadFailures.length} 个资源不可用
        </div>
      )}
      </div>
    </main>
  );
}

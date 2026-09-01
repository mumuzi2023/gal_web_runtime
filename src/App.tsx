import { useEffect, useRef, useState } from "react";
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
import { globalThemeStyle, panelStyle } from "./uiConfig";
import { SKIN_SAFE_PRESETS, useSkinGeometryVariables } from "./skinGeometry";
import type { Screen, UiConfig } from "./types";

export default function App() {
  const isStudio = new URLSearchParams(window.location.search).get("studio") === "1";
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
  const currentText = useGameStore((s) => s.currentText);
  const isTyping = useGameStore((s) => s.isTyping);
  const currentSceneKey = useGameStore((s) => s.currentSceneKey);
  const waitingForChoice = useGameStore((s) => s.waitingForChoice);
  const choiceOptions = useGameStore((s) => s.choiceOptions);
  const showChapterTitle = useGameStore((s) => s.showChapterTitle);
  const cgSrc = useGameStore((s) => s.cgSrc);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const advanceCommand = useGameStore((s) => s.advanceCommand);
  const selectChoice = useGameStore((s) => s.selectChoice);
  const dismissChapterTitle = useGameStore((s) => s.dismissChapterTitle);
  const dismissCg = useGameStore((s) => s.dismissCg);
  const finishTyping = useGameStore((s) => s.finishTyping);
  const closeOverlay = useGameStore((s) => s.closeOverlay);
  const toggleAutoMode = useGameStore((s) => s.toggleAutoMode);
  const appearance = useGameStore((s) => s.settings.appearance);
  const studioStarted = useRef(false);
  const studioSceneReady = useRef(false);
  const [studioInteractive, setStudioInteractive] = useState(false);
  const [studioSystemPreview, setStudioSystemPreview] = useState<"loading" | "error">();
  const studioSurfaceRef = useRef<string | undefined>(undefined);
  const runtimeUi = gameData?.ui || gameData?.config?.ui;
  const projectTheme = runtimeUi?.global?.defaultTheme || "light";
  const resolvedAppearance = appearance === "project" ? projectTheme : appearance;
  const globalCss = globalThemeStyle(runtimeUi?.global);
  const loadingCss = panelStyle(runtimeUi?.pages?.system?.loading, {});
  const errorCss = panelStyle(runtimeUi?.pages?.system?.error, {});
  const loadingPanelRef = useRef<HTMLDivElement>(null);
  const errorPanelRef = useRef<HTMLDivElement>(null);
  const systemGeometryKey = `${loading}:${Boolean(error)}:${studioSystemPreview || "none"}`;
  const loadingGeometry = useSkinGeometryVariables(loadingPanelRef, runtimeUi?.pages?.system?.loading?.skin, systemGeometryKey, SKIN_SAFE_PRESETS.systemCard);
  const errorGeometry = useSkinGeometryVariables(errorPanelRef, runtimeUi?.pages?.system?.error?.skin, systemGeometryKey, SKIN_SAFE_PRESETS.systemCard);

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
    // UI Studio can deliberately render a synthetic chapter card.  The
    // command seeker must not dismiss that preview just because command 0 is
    // not a chapter_title command.
    if (studioSurfaceRef.current === "chapterCard") return;
    const target = Math.max(0, Number(params.get("command") || 0));
    if (commandIndex >= target) {
      const targetCommand = gameData?.scenes[currentSceneKey]?.commands[target];
      if (targetCommand?.type !== "chapter_title" && showChapterTitle) {
        useGameStore.setState({ showChapterTitle: false });
        return;
      }
      if (targetCommand?.type !== "cg" && cgSrc) {
        useGameStore.setState({ cgSrc: null });
        return;
      }
      if (isTyping) {
        finishTyping();
        return;
      }
      if (!studioSceneReady.current) {
        studioSceneReady.current = true;
        window.parent.postMessage(
          {
            type: "storyforge:runtime-scene-ready",
            sceneKey: currentSceneKey,
            commandIndex,
          },
          window.location.origin,
        );
      }
      return;
    }
    const timer = window.setTimeout(() => {
      if (waitingForChoice && choiceOptions[0]) selectChoice(choiceOptions[0]);
      else if (showChapterTitle) dismissChapterTitle();
      else if (cgSrc) dismissCg();
      else advanceCommand();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [screen, commandIndex, currentSceneKey, gameData, waitingForChoice, choiceOptions, showChapterTitle, cgSrc, isTyping, advanceCommand, selectChoice, dismissChapterTitle, dismissCg, finishTyping]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isStudio && !studioInteractive) return;
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
  }, [advanceCommand, closeOverlay, finishTyping, isStudio, screen, studioInteractive, toggleAutoMode, waitingForChoice]);

  useEffect(() => {
    if (!isStudio || studioInteractive) return;
    const blockRuntimeInput = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener("click", blockRuntimeInput, true);
    document.addEventListener("pointerdown", blockRuntimeInput, true);
    document.addEventListener("pointerup", blockRuntimeInput, true);
    return () => {
      document.removeEventListener("click", blockRuntimeInput, true);
      document.removeEventListener("pointerdown", blockRuntimeInput, true);
      document.removeEventListener("pointerup", blockRuntimeInput, true);
    };
  }, [isStudio, studioInteractive]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("studio") !== "1") return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "storyforge:ui-preview") return;
      const ui = event.data.ui as UiConfig | undefined;
      const target = event.data.screen as Screen | undefined;
      const surface = event.data.surface as string | undefined;
      studioSurfaceRef.current = surface;
      const interactive = event.data.interactive === true;
      setStudioInteractive(interactive);
      if (!interactive) useGameStore.setState({ autoMode: false });
      if (ui) {
        useGameStore.setState((state) => state.gameData ? {
          gameData: {
            ...state.gameData,
            ui,
            config: { ...(state.gameData.config || {}), ui },
          },
        } : state);
      }
      if (target) useGameStore.getState().setScreen(target);
      if (target === "backlog") {
        useGameStore.setState({
          backlog: [
            {
              character: "gu_yao",
              characterName: "顾遥",
              characterColor: "#2f75a8",
              text: "雨停之后，站台尽头传来一声并不存在的汽笛。",
            },
            {
              text: "潮水漫过旧铁轨，把没有寄出的那张车票推回岸边。她停了一会儿，又说起十年前最后一班列车离站时的灯光，以及那个至今没有等到回信的人。",
            },
            {
              character: "gu_yao",
              characterName: "顾遥",
              characterColor: "#2f75a8",
              text: "如果钟声再次响起，我们就沿着海岸继续走。",
            },
          ],
        });
      }
      if (target === "game" && surface !== "chapterCard") {
        const choicePreview = surface === "choiceButtons";
        useGameStore.setState({
          screen: "game",
          overlayReturnScreen: "game",
          currentText: choicePreview ? "海风将岔路口的路牌吹得轻轻作响。" : "雨停之后，站台尽头传来一声并不存在的汽笛。",
          currentCharacter: choicePreview ? null : "顾遥",
          currentCharacterColor: "var(--runtime-accent)",
          waitingForClick: !choicePreview,
          waitingForChoice: choicePreview,
          choiceOptions: choicePreview ? [
            { text: "沿着海岸寻找旧车站" },
            { text: "回到灯塔询问守夜人" },
            { text: "留在原地等待潮声" },
          ] : [],
          isTyping: false,
          showChapterTitle: false,
        });
      }
      setStudioSystemPreview(
        surface === "loading" ? "loading" : surface === "error" ? "error" : undefined,
      );
      if (surface === "chapterCard") {
        useGameStore.setState({
          screen: "game",
          overlayReturnScreen: "game",
          waitingForChoice: false,
          choiceOptions: [],
          showChapterTitle: true,
          chapterTitle: "第三章 · 潮声抵达之前",
          chapterSubtitle: "在分岔的夜晚，所有选择都有了回声",
        });
      } else {
        useGameStore.setState({ showChapterTitle: false });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("studio") !== "1" || !gameData || !studioStarted.current) return;
    // A preview target received before loadGameData finishes can be replaced
    // by startNewGame(). Announce readiness only after that initialization so
    // the Studio resends the authoritative draft and target screen.
    const timer = window.setTimeout(() => {
      window.parent.postMessage(
        { type: "storyforge:ui-preview-ready" },
        window.location.origin,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [gameData]);

  if (loading || (!gameData && !error)) {
    return (
      <div className="runtime-loading" data-runtime-theme={resolvedAppearance} style={globalCss}>
        <div className="runtime-loading__glow" />
        <div ref={loadingPanelRef} className={`runtime-loading__panel ui-responsive-skin ${runtimeUi?.pages?.system?.loading?.skin ? "has-ui-skin" : ""}`} style={{ ...loadingCss, ...loadingGeometry }}>
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
      <div className="runtime-loading" data-runtime-theme={resolvedAppearance} style={globalCss}>
        <div ref={errorPanelRef} className={`runtime-error-card ui-responsive-skin ${runtimeUi?.pages?.system?.error?.skin ? "has-ui-skin" : ""}`} style={{ ...errorCss, ...errorGeometry }}>
          <div className="runtime-error-card__icon">!</div>
          <div className="runtime-error-card__title">故事载入失败</div>
          <div className="runtime-error-card__detail">{error}</div>
          <button onClick={() => window.location.reload()}>重新加载</button>
        </div>
      </div>
    );
  }

  return (
    <main className="runtime-shell" data-runtime-theme={resolvedAppearance} style={globalCss}>
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
          <DialogBox key={`${currentSceneKey}:${commandIndex}:${commandSerial}:${currentText}`} />
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
      {studioSystemPreview === "loading" && (
        <div className="runtime-loading runtime-studio-system" data-runtime-theme={resolvedAppearance} style={globalCss}>
          <div className="runtime-loading__glow" />
          <div ref={loadingPanelRef} className={`runtime-loading__panel ui-responsive-skin ${runtimeUi?.pages?.system?.loading?.skin ? "has-ui-skin" : ""}`} style={{ ...loadingCss, ...loadingGeometry }}>
            <div className="runtime-loading__eyebrow">STORYFORGE RUNTIME</div>
            <div className="runtime-loading__title">正在准备故事</div>
            <div className="runtime-loading__track"><span style={{ width: "64%" }} /></div>
            <div className="runtime-loading__status">载入章节与美术资源…</div>
          </div>
        </div>
      )}
      {studioSystemPreview === "error" && (
        <div className="runtime-loading runtime-studio-system" data-runtime-theme={resolvedAppearance} style={globalCss}>
          <div ref={errorPanelRef} className={`runtime-error-card ui-responsive-skin ${runtimeUi?.pages?.system?.error?.skin ? "has-ui-skin" : ""}`} style={{ ...errorCss, ...errorGeometry }}>
            <div className="runtime-error-card__icon">!</div>
            <div className="runtime-error-card__title">故事载入失败</div>
            <div className="runtime-error-card__detail">这里预览玩家实际看到的错误状态与重试入口。</div>
            <button onClick={() => window.location.reload()}>重新加载</button>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

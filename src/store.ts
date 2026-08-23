import { create } from "zustand";
import type {
  GameData,
  Command,
  VisibleCharacter,
  BacklogEntry,
  SaveSlot,
  SoundEffectEvent,
  Screen,
  ChoiceOption,
  BaseScreen,
} from "./types";
import { evaluateCondition, applySet } from "./engine";
import {
  collectImageUrls,
  getStartSceneKey,
  preloadConnectedScenes,
  preloadImages,
  preloadStartupAssets,
} from "./preloader";

const SAVE_KEY = "galgame_saves";
const SETTINGS_KEY = "galgame_settings";
const MAX_SLOTS = 20;

/** Resolve a relative asset path using the _asset_manifest */
function resolveUrl(path: string | undefined, manifest: Record<string, string> | undefined): string {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (manifest) {
    const resolved = manifest[path];
    if (resolved) return resolved;
  }
  return path;
}

/** Pick a usable background URL, falling back to the first scene's bg
 * (used by overlay panels opened before the player has entered any scene). */
export function resolveOverlayBackground(
  current: string | undefined,
  data: GameData | null | undefined,
): string {
  if (current) return current;
  if (!data) return current || "";
  for (const sk of data.scene_order || Object.keys(data.scenes || {})) {
    const sceneBg = data.scenes?.[sk]?.background;
    const url = resolveUrl(sceneBg, data._asset_manifest);
    if (url) return url;
  }
  return current || "";
}

export interface GameSettings {
  textSpeed: number;       // chars per second (10-100)
  autoSpeed: number;       // seconds per message in auto mode (1-10)
  bgmVolume: number;       // 0-1
  voiceVolume: number;     // 0-1
  seVolume: number;        // 0-1
  masterVolume: number;    // 0-1
}

const defaultSettings: GameSettings = {
  textSpeed: 40,
  autoSpeed: 3,
  bgmVolume: 0.5,
  voiceVolume: 0.8,
  seVolume: 0.6,
  masterVolume: 1,
};

export interface GameState {
  // Data
  gameData: GameData | null;
  loading: boolean;
  error: string | null;

  // Navigation
  screen: Screen;
  setScreen: (s: Screen) => void;
  overlayReturnScreen: BaseScreen;
  closeOverlay: () => void;

  // Startup/preload feedback
  preloadProgress: number;
  preloadLabel: string;
  preloadFailures: string[];

  // Playback state
  currentSceneKey: string;
  commandIndex: number;
  commandSerial: number;
  commandQueue: Command[];
  activeInlineCommand: Command | null;
  variables: Record<string, number>;
  visibleCharacters: VisibleCharacter[];
  background: string;
  backgroundPosition: "left" | "center" | "right";
  bgmSrc: string;
  currentText: string;
  currentCharacter: string | null;
  currentCharacterKey: string | null;
  currentCharacterColor: string | null;
  currentVoice: string | null;
  voiceToken: number;
  isTyping: boolean;
  waitingForClick: boolean;
  waitingForChoice: boolean;
  choiceOptions: ChoiceOption[];
  showChapterTitle: boolean;
  chapterTitle: string;
  chapterSubtitle: string;
  autoMode: boolean;
  shaking: boolean;
  flashing: boolean;
  flashColor: string;
  effectType: string | null;
  cgSrc: string | null;
  cgMode: "full" | "half";
  seSrc: string | null;
  seToken: number;
  soundEffects: SoundEffectEvent[];
  visitedScenes: string[];

  // Backlog
  backlog: BacklogEntry[];

  // Settings
  settings: GameSettings;
  updateSettings: (partial: Partial<GameSettings>) => void;

  // Saves
  saves: (SaveSlot | null)[];

  // Endings
  reachedEndings: string[];

  // Actions
  loadGameData: (url: string) => Promise<void>;
  startNewGame: () => void;
  advanceCommand: () => void;
  executeCommand: (cmd: Command) => void;
  selectChoice: (option: ChoiceOption) => void;
  dismissChapterTitle: () => void;
  jumpToScene: (sceneKey: string) => void;
  finishTyping: () => void;
  toggleAutoMode: () => void;
  dismissCg: () => void;
  playVoice: (src: string) => void;
  saveGame: (slotId: number) => void;
  loadGame: (slotId: number) => void;
  setShaking: (v: boolean) => void;
  setFlashing: (v: boolean, color?: string) => void;
}

export const useGameStore = create<GameState>((set, get) => {
  // Load persisted data
  const loadSaves = (): (SaveSlot | null)[] => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return Array(MAX_SLOTS).fill(null);
  };

  const loadSettings = (): GameSettings => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...defaultSettings };
  };

  const loadEndings = (): string[] => {
    try {
      const raw = localStorage.getItem("galgame_endings");
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  };

  const persistSaves = (saves: (SaveSlot | null)[]) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  };

  const persistSettings = (s: GameSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  };

  const persistEndings = (endings: string[]) => {
    localStorage.setItem("galgame_endings", JSON.stringify(endings));
  };

  const getCommandAt = (sceneKey: string, index: number): Command | null => {
    const data = get().gameData;
    if (!data) return null;
    const scene = data.scenes[sceneKey];
    if (!scene || index >= scene.commands.length) return null;
    return scene.commands[index];
  };

  const executeCommand = (cmd: Command) => {
    set((current) => ({ commandSerial: current.commandSerial + 1 }));
    const state = get();
    const data = state.gameData;
    if (!data) return;

    switch (cmd.type) {
      case "bg": {
        set({
          background: resolveUrl(cmd.src, data._asset_manifest),
          backgroundPosition: cmd.position || "center",
        });
        get().advanceCommand();
        break;
      }

      case "show": {
        const chars = [...state.visibleCharacters];
        const existing = chars.findIndex((c) => c.key === cmd.character);
        const position = cmd.position ?? (existing >= 0 ? chars[existing].position : "left");
        const isNew = existing < 0;
        const vc: VisibleCharacter = {
          key: cmd.character,
          expression: cmd.expression || (existing >= 0 ? chars[existing].expression : "normal"),
          outfitId: cmd.outfit_id || (existing >= 0 ? chars[existing].outfitId : "default"),
          position,
          entering: isNew,
        };
        if ((data.config?.mode ?? "advanced") === "easy") {
          // Easy mode keeps a single speaker on stage for legacy scripts that
          // never emit hide commands. Generated scripts default to advanced.
          set({ visibleCharacters: [vc] });
        } else {
          // Advanced: update in place or append, keep others visible
          const newChars = [...chars];
          if (existing >= 0) {
            newChars[existing] = {
              ...newChars[existing],
              expression: vc.expression,
              outfitId: vc.outfitId,
              position: vc.position,
            };
          } else {
            newChars.push(vc);
          }
          set({ visibleCharacters: newChars });
        }
        if (isNew) {
          setTimeout(() => {
            set((s) => ({
              visibleCharacters: s.visibleCharacters.map((c) =>
                c.key === cmd.character ? { ...c, entering: false } : c
              ),
            }));
          }, 500);
        }
        get().advanceCommand();
        break;
      }

      case "hide": {
        set((s) => ({
          visibleCharacters: s.visibleCharacters.filter((c) => c.key !== cmd.character),
        }));
        get().advanceCommand();
        break;
      }

      case "dialog": {
        const charDef = data.characters[cmd.character];
        const easyMode = (data.config?.mode ?? "advanced") === "easy";
        const isVisible = state.visibleCharacters.some((c) => c.key === cmd.character);
        let newVisibleChars: VisibleCharacter[];
        if (easyMode && !isVisible) {
          // Auto-show speaker on the left (hide others), in case script omitted the show command
          const autoVc: VisibleCharacter = {
            key: cmd.character,
            expression: cmd.expression || "normal",
            outfitId: cmd.outfit_id || charDef?.default_outfit || "default",
            position: "left",
            entering: true,
          };
          newVisibleChars = [autoVc];
          setTimeout(() => {
            set((s) => ({
              visibleCharacters: s.visibleCharacters.map((c) =>
                c.key === cmd.character ? { ...c, entering: false } : c
              ),
            }));
          }, 500);
        } else {
          // Update expression of speaking character, keep others in place
          newVisibleChars = state.visibleCharacters.map((c) =>
            c.key === cmd.character
              ? {
                  ...c,
                  expression: cmd.expression || c.expression,
                  outfitId: cmd.outfit_id || c.outfitId || charDef?.default_outfit || "default",
                }
              : c
          );
        }
        set({
          visibleCharacters: newVisibleChars,
          currentText: cmd.text,
          currentCharacter: charDef?.name || cmd.character,
          currentCharacterKey: cmd.character,
          currentCharacterColor: charDef?.color || null,
          currentVoice: resolveUrl(cmd.voice, data._asset_manifest) || null,
          voiceToken: state.voiceToken + 1,
          isTyping: true,
          waitingForClick: false,
          waitingForChoice: false,
        });
        // Add to backlog
        set((s) => ({
          backlog: [
            ...s.backlog,
            {
              character: cmd.character,
              outfitId: newVisibleChars.find((c) => c.key === cmd.character)?.outfitId,
              characterName: charDef?.name || cmd.character,
              characterColor: charDef?.color,
              text: cmd.text,
              voice: resolveUrl(cmd.voice, data._asset_manifest) || undefined,
            },
          ],
        }));
        break;
      }

      case "narration": {
        set({
          currentText: cmd.text,
          currentCharacter: null,
          currentCharacterKey: null,
          currentCharacterColor: null,
          currentVoice: resolveUrl(cmd.voice, data._asset_manifest) || null,
          voiceToken: state.voiceToken + 1,
          isTyping: true,
          waitingForClick: false,
          waitingForChoice: false,
        });
        set((s) => ({
          backlog: [...s.backlog, { text: cmd.text, voice: resolveUrl(cmd.voice, data._asset_manifest) || undefined }],
        }));
        break;
      }

      case "choice": {
        const availableOptions = cmd.options.filter(
          (option) => !option.condition || evaluateCondition(option.condition, state.variables)
        );
        set({
          waitingForChoice: true,
          choiceOptions: availableOptions,
          isTyping: false,
          waitingForClick: false,
        });
        break;
      }

      case "jump": {
        get().jumpToScene(cmd.target);
        break;
      }

      case "bgm": {
        set({ bgmSrc: resolveUrl(cmd.src, data._asset_manifest) });
        get().advanceCommand();
        break;
      }

      case "se": {
        const src = resolveUrl(cmd.src, data._asset_manifest);
        const eventId = state.seToken + 1;
        set({
          seSrc: src,
          seToken: eventId,
          // Keep a small event log so synchronous commands are not collapsed
          // into a single React render. AudioManager consumes every new id.
          soundEffects: [...state.soundEffects, { id: eventId, src }].slice(-32),
        });
        get().advanceCommand();
        break;
      }

      case "set": {
        if (cmd.variable && cmd.value !== undefined) {
          const vars = { ...state.variables };
          const valStr = String(cmd.value);
          if (valStr.startsWith("+") || valStr.startsWith("-")) {
            vars[cmd.variable] = (vars[cmd.variable] || 0) + parseInt(valStr, 10);
          } else {
            vars[cmd.variable] = parseInt(valStr, 10) || 0;
          }
          set({ variables: vars });
        }
        // Also handle expression-change "set" commands (character + expression)
        if (cmd.character && (cmd.expression || cmd.outfit_id)) {
          set((s) => ({
            visibleCharacters: s.visibleCharacters.map((c) =>
              c.key === cmd.character
                ? {
                    ...c,
                    expression: cmd.expression || c.expression,
                    outfitId: cmd.outfit_id || c.outfitId,
                  }
                : c
            ),
          }));
        }
        get().advanceCommand();
        break;
      }

      case "if": {
        const result = evaluateCondition(cmd.condition, state.variables);
        const branch = result ? cmd.then : cmd.else;
        if (branch) {
          const cmds = Array.isArray(branch) ? branch : [branch];
          if (cmds.length > 0) {
            const [first, ...remaining] = cmds;
            set({
              activeInlineCommand: first,
              commandQueue: [...remaining, ...state.commandQueue],
            });
            get().executeCommand(first);
            return;
          }
        }
        get().advanceCommand();
        break;
      }

      case "wait": {
        const duration = cmd.duration || 1000;
        const serial = get().commandSerial;
        setTimeout(() => {
          if (get().commandSerial === serial) get().advanceCommand();
        }, duration);
        break;
      }

      case "shake": {
        set({ shaking: true });
        setTimeout(() => set({ shaking: false }), cmd.duration || 400);
        get().advanceCommand();
        break;
      }

      case "flash": {
        set({ flashing: true, flashColor: cmd.color || "#fff" });
        setTimeout(() => set({ flashing: false }), cmd.duration || 600);
        get().advanceCommand();
        break;
      }

      case "effect": {
        // Effect types: sakura, rain, snow, dark etc.
        set({ effectType: cmd.enable ? (cmd.name || cmd.type) : null });
        get().advanceCommand();
        break;
      }

      case "cg": {
        const resolved = resolveUrl(cmd.src, data._asset_manifest);
        // Skip CG when the asset is missing — otherwise we'd show a black overlay
        // with a broken-image inside, which players experience as "the screen
        // suddenly went black mid-click".
        if (!resolved) {
          get().advanceCommand();
          break;
        }
        set({
          cgSrc: resolved,
          cgMode: cmd.mode === "half" ? "half" : "full",
          isTyping: false,
          waitingForClick: false,
        });
        // CG stays until click
        break;
      }

      case "chapter_title": {
        set({
          showChapterTitle: true,
          chapterTitle: cmd.text,
          chapterSubtitle: cmd.subtitle || "",
        });
        const serial = get().commandSerial;
        setTimeout(() => {
          if (get().commandSerial === serial) get().dismissChapterTitle();
        }, 3000);
        break;
      }

      case "end": {
        const endingId = cmd.ending_id || "";
        if (endingId && data.endings[endingId]) {
          const endings = [...get().reachedEndings];
          if (!endings.includes(endingId)) {
            endings.push(endingId);
            persistEndings(endings);
            set({ reachedEndings: endings });
          }
        }
        // Check all ending conditions
        if (!endingId) {
          const vars = get().variables;
          for (const [eid, edef] of Object.entries(data.endings)) {
            if (evaluateCondition(edef.condition, vars)) {
              const endings = [...get().reachedEndings];
              if (!endings.includes(eid)) {
                endings.push(eid);
                persistEndings(endings);
                set({ reachedEndings: endings });
              }
              break;
            }
          }
        }
        set({
          screen: "title",
          overlayReturnScreen: "title",
          bgmSrc: "",
          currentVoice: null,
          commandQueue: [],
          activeInlineCommand: null,
        });
        break;
      }

      default: {
        // Unknown command type — might be an effect alias (e.g., type="sakura" enable=true)
        const anyCmd = cmd as Record<string, unknown>;
        if (typeof anyCmd.enable === "boolean") {
          set({ effectType: anyCmd.enable ? String(anyCmd.type) : null });
        }
        get().advanceCommand();
        break;
      }
    }
  };

  return {
    // Data
    gameData: null,
    loading: false,
    error: null,

    // Navigation
    screen: "title",
    overlayReturnScreen: "title",
    setScreen: (screen) => set((state) => {
      if (screen === "title" || screen === "game") {
        return { screen, overlayReturnScreen: screen };
      }
      const base = state.screen === "title" || state.screen === "game"
        ? state.screen
        : state.overlayReturnScreen;
      return { screen, overlayReturnScreen: base };
    }),
    closeOverlay: () => set((state) => ({ screen: state.overlayReturnScreen })),

    preloadProgress: 0,
    preloadLabel: "读取游戏数据…",
    preloadFailures: [],

    // Playback
    currentSceneKey: "",
    commandIndex: 0,
    commandSerial: 0,
    commandQueue: [],
    activeInlineCommand: null,
    variables: {},
    visibleCharacters: [],
    background: "",
    backgroundPosition: "center",
    bgmSrc: "",
    currentText: "",
    currentCharacter: null,
    currentCharacterKey: null,
    currentCharacterColor: null,
    currentVoice: null,
    voiceToken: 0,
    isTyping: false,
    waitingForClick: false,
    waitingForChoice: false,
    choiceOptions: [],
    showChapterTitle: false,
    chapterTitle: "",
    chapterSubtitle: "",
    autoMode: false,
    shaking: false,
    flashing: false,
    flashColor: "#fff",
    effectType: null,
    cgSrc: null,
    cgMode: "full",
    seSrc: null,
    seToken: 0,
    soundEffects: [],
    visitedScenes: [],

    // Backlog
    backlog: [],

    // Settings
    settings: loadSettings(),
    updateSettings: (partial) => {
      const newSettings = { ...get().settings, ...partial };
      persistSettings(newSettings);
      set({ settings: newSettings });
    },

    // Saves
    saves: loadSaves(),

    // Endings
    reachedEndings: loadEndings(),

    // Actions
    loadGameData: async (url: string) => {
      set({
        loading: true,
        error: null,
        preloadProgress: 0.05,
        preloadLabel: "读取游戏数据…",
        preloadFailures: [],
      });
      try {
        const token = localStorage.getItem("token");
        const resolvedUrl = new URL(url, window.location.href);
        const sameOrigin = resolvedUrl.origin === window.location.origin;
        const res = await fetch(url, {
          headers: token && sameOrigin ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: GameData = await res.json();
        // Normalize loosely-typed fields so optional/missing values do not crash.
        const anyData = data as unknown as Record<string, unknown>;
        if (anyData.variables == null || typeof anyData.variables !== "object" || Array.isArray(anyData.variables)) {
          // Accept either {name,default}[] or {var:value} dict; coerce to dict
          if (Array.isArray(anyData.variables)) {
            const dict: Record<string, unknown> = {};
            for (const v of anyData.variables as Array<Record<string, unknown>>) {
              const key = String(v?.name ?? v?.key ?? "");
              if (key) dict[key] = v?.default ?? 0;
            }
            anyData.variables = dict;
          } else {
            anyData.variables = {};
          }
        }
        if (Array.isArray(anyData.endings)) {
          const dict: Record<string, unknown> = {};
          for (const e of anyData.endings as Array<Record<string, unknown>>) {
            const key = String(e?.key ?? e?.id ?? "");
            if (key) dict[key] = e;
          }
          anyData.endings = dict;
        } else if (anyData.endings == null || typeof anyData.endings !== "object") {
          anyData.endings = {};
        }
        if (anyData.characters == null || typeof anyData.characters !== "object" || Array.isArray(anyData.characters)) {
          if (Array.isArray(anyData.characters)) {
            const dict: Record<string, unknown> = {};
            for (const c of anyData.characters as Array<Record<string, unknown>>) {
              const key = String(c?.name_key ?? c?.key ?? c?.name ?? "");
              if (key) dict[key] = c;
            }
            anyData.characters = dict;
          } else {
            anyData.characters = {};
          }
        }
        if (anyData.scenes == null || typeof anyData.scenes !== "object" || Array.isArray(anyData.scenes)) {
          anyData.scenes = {};
        }
        set({
          gameData: data,
          preloadProgress: 0.15,
          preloadLabel: "预载首章资源…",
        });
        const report = await preloadStartupAssets(data, (completed, total) => {
          set({
            preloadProgress: total ? 0.15 + (completed / total) * 0.8 : 0.95,
            preloadLabel: total ? `预载首章资源 ${completed}/${total}` : "准备完成",
          });
        });
        set({
          loading: false,
          preloadProgress: 1,
          preloadLabel: "准备完成",
          preloadFailures: report.failed,
        });
        // Warm the remaining images without extending the startup gate.
        void preloadImages(collectImageUrls(data)).then((backgroundReport) => {
          if (backgroundReport.failed.length > 0) {
            set((state) => ({
              preloadFailures: [...new Set([...state.preloadFailures, ...backgroundReport.failed])],
            }));
          }
        });
      } catch (e: unknown) {
        set({
          error: e instanceof Error ? e.message : String(e),
          loading: false,
          preloadLabel: "载入失败",
        });
      }
    },

    startNewGame: () => {
      const data = get().gameData;
      if (!data) return;

      // Initialize variables
      const vars: Record<string, number> = {};
      for (const [k, v] of Object.entries(data.variables)) {
        vars[k] = typeof v === "number" ? v : parseInt(String(v), 10) || 0;
      }

      const firstScene = getStartSceneKey(data);
      const sceneDef = data.scenes[firstScene];
      if (!sceneDef) {
        set({ error: "游戏数据中没有可播放的场景" });
        return;
      }

      set({
        screen: "game",
        overlayReturnScreen: "game",
        currentSceneKey: firstScene,
        commandIndex: 0,
        commandQueue: [],
        activeInlineCommand: null,
        variables: vars,
        visibleCharacters: [],
        background: resolveUrl(sceneDef?.background, data._asset_manifest),
        backgroundPosition: "center",
        bgmSrc: resolveUrl(sceneDef?.bgm, data._asset_manifest),
        currentText: "",
        currentCharacter: null,
        currentCharacterKey: null,
        currentCharacterColor: null,
        currentVoice: null,
        isTyping: false,
        waitingForClick: false,
        waitingForChoice: false,
        choiceOptions: [],
        backlog: [],
        autoMode: false,
        cgSrc: null,
        effectType: null,
        soundEffects: [],
        visitedScenes: [firstScene],
      });

      preloadConnectedScenes(data, firstScene);

      // Execute first command
      const firstCmd = getCommandAt(firstScene, 0);
      if (firstCmd) executeCommand(firstCmd);
    },

    advanceCommand: () => {
      const state = get();
      // Do NOT advance while waiting for a choice selection
      if (state.waitingForChoice) return;
      // Stop voice from previous command when advancing
      set({ currentVoice: null });

      // Conditional branches run as an explicit queue. This keeps branch
      // commands from recursively incrementing the parent scene index and
      // prevents repeated/skipped dialog, audio and jump commands.
      if (state.commandQueue.length > 0) {
        const [nextInline, ...remaining] = state.commandQueue;
        set({ commandQueue: remaining, activeInlineCommand: nextInline });
        executeCommand(nextInline);
        return;
      }

      const nextIndex = state.commandIndex + 1;
      const cmd = getCommandAt(state.currentSceneKey, nextIndex);
      if (cmd) {
        set({ commandIndex: nextIndex, activeInlineCommand: null });
        executeCommand(cmd);
      } else {
        // Scene ended — try advancing to next scene in scene_order
        const data = state.gameData;
        if (!data?.explicit_flow && data?.scene_order) {
          const curIdx = data.scene_order.indexOf(state.currentSceneKey);
          if (curIdx >= 0 && curIdx + 1 < data.scene_order.length) {
            const nextKey = data.scene_order[curIdx + 1];
            if (data.scenes[nextKey]) {
              get().jumpToScene(nextKey);
              return;
            }
          }
        }
        // No more scenes — check endings
        if (data) {
          for (const [eid, edef] of Object.entries(data.endings)) {
            if (evaluateCondition(edef.condition, state.variables)) {
              const endings = [...state.reachedEndings];
              if (!endings.includes(eid)) {
                endings.push(eid);
                persistEndings(endings);
                set({ reachedEndings: endings });
              }
              set({
                screen: "title",
                overlayReturnScreen: "title",
                bgmSrc: "",
                currentVoice: null,
                commandQueue: [],
                activeInlineCommand: null,
              });
              return;
            }
          }
        }
        set({
          screen: "title",
          overlayReturnScreen: "title",
          bgmSrc: "",
          currentVoice: null,
          commandQueue: [],
          activeInlineCommand: null,
        });
      }
    },

    executeCommand,

    selectChoice: (option: ChoiceOption) => {
      const state = get();
      // Apply variable changes
      if (option.set) {
        const vars = { ...state.variables };
        applySet(vars, option.set);
        set({ variables: vars });
      }
      set({ waitingForChoice: false, choiceOptions: [] });
      if (option.jump) {
        get().jumpToScene(option.jump);
      } else {
        get().advanceCommand();
      }
    },

    dismissChapterTitle: () => {
      if (!get().showChapterTitle) return;
      set({ showChapterTitle: false });
      get().advanceCommand();
    },

    jumpToScene: (sceneKey: string) => {
      const data = get().gameData;
      let resolvedKey = sceneKey;
      if (!data) {
        set({ screen: "title", overlayReturnScreen: "title", bgmSrc: "" });
        return;
      }
      if (!data.scenes[sceneKey]) {
        if (data.explicit_flow) {
          console.error(`[runtime] explicit jump target "${sceneKey}" does not exist`);
          set({ screen: "title", overlayReturnScreen: "title", bgmSrc: "" });
          return;
        }
        // Fuzzy match: scripts sometimes reference "scene_name" but the actual
        // packaged scene is "scene_name__variant". Try prefix / contains match
        // before giving up. This avoids "mid-game suddenly returns to title".
        const allKeys = Object.keys(data.scenes);
        const lower = sceneKey.toLowerCase();
        const cand =
          allKeys.find((k) => k.toLowerCase() === lower) ||
          allKeys.find((k) => k.toLowerCase().startsWith(lower + "__")) ||
          allKeys.find((k) => k.toLowerCase().startsWith(lower + "_")) ||
          allKeys.find((k) => k.toLowerCase().startsWith(lower)) ||
          allKeys.find((k) => k.toLowerCase().includes(lower));
        if (cand) {
          console.warn(`[runtime] jump target "${sceneKey}" not found; falling back to "${cand}"`);
          resolvedKey = cand;
        } else {
          // Try scene_order
          if (!data.explicit_flow && data.scene_order) {
            const curIdx = data.scene_order.indexOf(get().currentSceneKey);
            if (curIdx >= 0 && curIdx + 1 < data.scene_order.length) {
              const nextKey = data.scene_order[curIdx + 1];
              if (data.scenes[nextKey]) {
                get().jumpToScene(nextKey);
                return;
              }
            }
          }
          console.error(`[runtime] jump target "${sceneKey}" not found and no fallback`);
          set({ screen: "title", overlayReturnScreen: "title", bgmSrc: "" });
          return;
        }
      }
      const sceneDef = data.scenes[resolvedKey];
      set({
        currentSceneKey: resolvedKey,
        commandIndex: 0,
        commandQueue: [],
        activeInlineCommand: null,
        visibleCharacters: [],
        background: resolveUrl(sceneDef.background, data._asset_manifest) || get().background,
        backgroundPosition: "center",
        bgmSrc: resolveUrl(sceneDef.bgm, data._asset_manifest) || get().bgmSrc,
        currentVoice: null,
        currentCharacterKey: null,
        visitedScenes: [...new Set([...get().visitedScenes, resolvedKey])],
      });
      // Branch-aware preload: warm every legal next scene instead of guessing
      // from scene_order, which is wrong after routes diverge.
      preloadConnectedScenes(data, resolvedKey);
      const firstCmd = sceneDef.commands[0];
      if (firstCmd) executeCommand(firstCmd);
    },

    finishTyping: () => {
      set({ isTyping: false, waitingForClick: true });
    },

    toggleAutoMode: () => set((s) => ({ autoMode: !s.autoMode })),

    dismissCg: () => {
      if (!get().cgSrc) return;
      set({ cgSrc: null });
      get().advanceCommand();
    },

    playVoice: (src: string) => {
      if (!src) return;
      set((state) => ({ currentVoice: src, voiceToken: state.voiceToken + 1 }));
    },

    saveGame: (slotId: number) => {
      const state = get();
      const slot: SaveSlot = {
        id: slotId,
        timestamp: Date.now(),
        sceneKey: state.currentSceneKey,
        commandIndex: state.commandIndex,
        commandQueue: [...state.commandQueue],
        activeInlineCommand: state.activeInlineCommand || undefined,
        variables: { ...state.variables },
        characters: [...state.visibleCharacters],
        background: state.background,
        backgroundPosition: state.backgroundPosition,
        bgmSrc: state.bgmSrc,
        visitedScenes: [...state.visitedScenes],
        title: state.gameData?.meta.title || "",
        description: state.currentText.slice(0, 60),
      };
      const saves = [...state.saves];
      saves[slotId] = slot;
      persistSaves(saves);
      set({ saves });
    },

    loadGame: (slotId: number) => {
      const saves = get().saves;
      const slot = saves[slotId];
      if (!slot) return;
      set({
        screen: "game",
        overlayReturnScreen: "game",
        currentSceneKey: slot.sceneKey,
        commandIndex: slot.commandIndex,
        commandQueue: [...(slot.commandQueue || [])],
        activeInlineCommand: slot.activeInlineCommand || null,
        variables: { ...slot.variables },
        visibleCharacters: [...slot.characters],
        background: slot.background,
        backgroundPosition: slot.backgroundPosition || "center",
        bgmSrc: slot.bgmSrc,
        currentText: "",
        currentCharacter: null,
        currentCharacterKey: null,
        currentCharacterColor: null,
        currentVoice: null,
        isTyping: false,
        waitingForClick: false,
        waitingForChoice: false,
        choiceOptions: [],
        visitedScenes: slot.visitedScenes?.length ? [...slot.visitedScenes] : [slot.sceneKey],
      });
      // Re-execute current command
      const data = get().gameData;
      if (data) {
        const scene = data.scenes[slot.sceneKey];
        const resumedCommand = slot.activeInlineCommand || scene?.commands[slot.commandIndex];
        if (resumedCommand) {
          executeCommand(resumedCommand);
        }
      }
    },

    setShaking: (v) => set({ shaking: v }),
    setFlashing: (v, color) => set({ flashing: v, flashColor: color || "#fff" }),
  };
});

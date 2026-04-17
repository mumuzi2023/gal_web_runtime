import { create } from "zustand";
import type {
  GameData,
  Command,
  VisibleCharacter,
  BacklogEntry,
  SaveSlot,
  Screen,
  ChoiceOption,
} from "./types";
import { evaluateCondition, applySet } from "./engine";

const SAVE_KEY = "galgame_saves";
const SETTINGS_KEY = "galgame_settings";
const MAX_SLOTS = 20;

/** Resolve a relative asset path using the _asset_manifest */
function resolveUrl(path: string | undefined, manifest: Record<string, string> | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (manifest) {
    const resolved = manifest[path];
    if (resolved) return resolved;
  }
  return path;
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

  // Playback state
  currentSceneKey: string;
  commandIndex: number;
  variables: Record<string, number>;
  visibleCharacters: VisibleCharacter[];
  background: string;
  bgmSrc: string;
  currentText: string;
  currentCharacter: string | null;
  currentCharacterColor: string | null;
  currentVoice: string | null;
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
  jumpToScene: (sceneKey: string) => void;
  finishTyping: () => void;
  toggleAutoMode: () => void;
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

  const resolveExpression = (charKey: string, expr: string): string => {
    const data = get().gameData;
    if (!data) return "";
    const charDef = data.characters[charKey];
    if (!charDef) return "";
    // Try exact, then "normal" fallback
    return charDef.expressions[expr] || charDef.expressions["normal"] || Object.values(charDef.expressions)[0] || "";
  };

  const executeCommand = (cmd: Command) => {
    const state = get();
    const data = state.gameData;
    if (!data) return;

    switch (cmd.type) {
      case "bg": {
        set({ background: resolveUrl(cmd.src, data._asset_manifest) });
        get().advanceCommand();
        break;
      }

      case "show": {
        const chars = [...state.visibleCharacters];
        const existing = chars.findIndex((c) => c.key === cmd.character);
        const vc: VisibleCharacter = {
          key: cmd.character,
          expression: cmd.expression || "normal",
          position: cmd.position || "center",
          entering: true,
        };
        if (existing >= 0) {
          chars[existing] = { ...chars[existing], expression: vc.expression, position: vc.position };
        } else {
          chars.push(vc);
        }
        set({ visibleCharacters: chars });
        // Clear entering flag after animation
        setTimeout(() => {
          set((s) => ({
            visibleCharacters: s.visibleCharacters.map((c) =>
              c.key === cmd.character ? { ...c, entering: false } : c
            ),
          }));
        }, 500);
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
        // Update expression if character visible
        set((s) => ({
          visibleCharacters: s.visibleCharacters.map((c) =>
            c.key === cmd.character ? { ...c, expression: cmd.expression || c.expression } : c
          ),
          currentText: cmd.text,
          currentCharacter: charDef?.name || cmd.character,
          currentCharacterColor: charDef?.color || null,
          currentVoice: cmd.voice || null,
          isTyping: true,
          waitingForClick: false,
          waitingForChoice: false,
        }));
        // Add to backlog
        set((s) => ({
          backlog: [
            ...s.backlog,
            {
              character: cmd.character,
              characterName: charDef?.name || cmd.character,
              characterColor: charDef?.color,
              text: cmd.text,
              voice: cmd.voice,
            },
          ],
        }));
        break;
      }

      case "narration": {
        set({
          currentText: cmd.text,
          currentCharacter: null,
          currentCharacterColor: null,
          currentVoice: cmd.voice || null,
          isTyping: true,
          waitingForClick: false,
          waitingForChoice: false,
        });
        set((s) => ({
          backlog: [...s.backlog, { text: cmd.text, voice: cmd.voice }],
        }));
        break;
      }

      case "choice": {
        set({
          waitingForChoice: true,
          choiceOptions: cmd.options,
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
        set({ bgmSrc: cmd.src });
        get().advanceCommand();
        break;
      }

      case "se": {
        // SE handled by AudioManager component
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
        if (cmd.character && cmd.expression) {
          set((s) => ({
            visibleCharacters: s.visibleCharacters.map((c) =>
              c.key === cmd.character ? { ...c, expression: cmd.expression! } : c
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
          // Execute first command of the branch, queue rest
          // For simplicity, execute all non-blocking commands, stop at first blocking one
          for (const c of cmds) {
            get().executeCommand(c as Command);
            // If it produced a dialog/narration/choice, stop
            const afterState = get();
            if (afterState.isTyping || afterState.waitingForClick || afterState.waitingForChoice) {
              return;
            }
          }
        }
        if (!get().isTyping && !get().waitingForClick && !get().waitingForChoice) {
          get().advanceCommand();
        }
        break;
      }

      case "wait": {
        const duration = cmd.duration || 1000;
        setTimeout(() => {
          get().advanceCommand();
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
        set({ cgSrc: resolveUrl(cmd.src, data._asset_manifest) });
        // CG stays until click
        break;
      }

      case "chapter_title": {
        set({
          showChapterTitle: true,
          chapterTitle: cmd.text,
          chapterSubtitle: cmd.subtitle || "",
        });
        setTimeout(() => {
          set({ showChapterTitle: false });
          get().advanceCommand();
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
        set({ screen: "title" });
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
    setScreen: (s) => set({ screen: s }),

    // Playback
    currentSceneKey: "",
    commandIndex: 0,
    variables: {},
    visibleCharacters: [],
    background: "",
    bgmSrc: "",
    currentText: "",
    currentCharacter: null,
    currentCharacterColor: null,
    currentVoice: null,
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
      set({ loading: true, error: null });
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: GameData = await res.json();
        set({ gameData: data, loading: false });
      } catch (e: unknown) {
        set({ error: String(e), loading: false });
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

      // Find first scene: prefer start_scene, then scene_order[0], then first key
      const sceneKeys = Object.keys(data.scenes);
      const firstScene = data.start_scene && data.scenes[data.start_scene]
        ? data.start_scene
        : data.scene_order?.[0] && data.scenes[data.scene_order[0]]
          ? data.scene_order[0]
          : sceneKeys[0] || "";
      const sceneDef = data.scenes[firstScene];

      set({
        screen: "game",
        currentSceneKey: firstScene,
        commandIndex: 0,
        variables: vars,
        visibleCharacters: [],
        background: resolveUrl(sceneDef?.background, data._asset_manifest),
        bgmSrc: resolveUrl(sceneDef?.bgm, data._asset_manifest),
        currentText: "",
        currentCharacter: null,
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
      });

      // Execute first command
      const firstCmd = getCommandAt(firstScene, 0);
      if (firstCmd) executeCommand(firstCmd);
    },

    advanceCommand: () => {
      const state = get();
      // Stop voice from previous command when advancing
      set({ currentVoice: null });
      const nextIndex = state.commandIndex + 1;
      const cmd = getCommandAt(state.currentSceneKey, nextIndex);
      if (cmd) {
        set({ commandIndex: nextIndex });
        executeCommand(cmd);
      } else {
        // Scene ended — try advancing to next scene in scene_order
        const data = state.gameData;
        if (data?.scene_order) {
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
              set({ screen: "title" });
              return;
            }
          }
        }
        set({ screen: "title" });
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

    jumpToScene: (sceneKey: string) => {
      const data = get().gameData;
      if (!data || !data.scenes[sceneKey]) {
        // Scene not found — try next scene in scene_order, or go to title
        if (data?.scene_order) {
          const curIdx = data.scene_order.indexOf(get().currentSceneKey);
          if (curIdx >= 0 && curIdx + 1 < data.scene_order.length) {
            const nextKey = data.scene_order[curIdx + 1];
            if (data.scenes[nextKey]) {
              get().jumpToScene(nextKey);
              return;
            }
          }
        }
        set({ screen: "title" });
        return;
      }
      const sceneDef = data.scenes[sceneKey];
      set({
        currentSceneKey: sceneKey,
        commandIndex: 0,
        visibleCharacters: [],
        background: resolveUrl(sceneDef.background, data._asset_manifest) || get().background,
        bgmSrc: resolveUrl(sceneDef.bgm, data._asset_manifest) || get().bgmSrc,
        currentVoice: null,
      });
      const firstCmd = sceneDef.commands[0];
      if (firstCmd) executeCommand(firstCmd);
    },

    finishTyping: () => {
      set({ isTyping: false, waitingForClick: true });
    },

    toggleAutoMode: () => set((s) => ({ autoMode: !s.autoMode })),

    saveGame: (slotId: number) => {
      const state = get();
      const slot: SaveSlot = {
        id: slotId,
        timestamp: Date.now(),
        sceneKey: state.currentSceneKey,
        commandIndex: state.commandIndex,
        variables: { ...state.variables },
        characters: [...state.visibleCharacters],
        background: state.background,
        bgmSrc: state.bgmSrc,
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
        currentSceneKey: slot.sceneKey,
        commandIndex: slot.commandIndex,
        variables: { ...slot.variables },
        visibleCharacters: [...slot.characters],
        background: slot.background,
        bgmSrc: slot.bgmSrc,
        currentText: "",
        currentCharacter: null,
        currentCharacterColor: null,
        currentVoice: null,
        isTyping: false,
        waitingForClick: false,
        waitingForChoice: false,
        choiceOptions: [],
      });
      // Re-execute current command
      const data = get().gameData;
      if (data) {
        const scene = data.scenes[slot.sceneKey];
        if (scene && scene.commands[slot.commandIndex]) {
          executeCommand(scene.commands[slot.commandIndex]);
        }
      }
    },

    setShaking: (v) => set({ shaking: v }),
    setFlashing: (v, color) => set({ flashing: v, flashColor: color || "#fff" }),
  };
});

/* ── Game Data Types (matches exported game_data.json) ── */

export interface GameData {
  meta: GameMeta;
  config: GameConfig;
  characters: Record<string, CharacterDef>;
  scenes: Record<string, SceneDef>;
  variables: Record<string, string | number | boolean>;
  endings: Record<string, EndingDef>;
  _asset_manifest?: Record<string, string>;
  start_scene?: string;
  scene_order?: string[];
}

export interface GameMeta {
  title: string;
  author: string;
  version: string;
  description: string;
}

export interface GameConfig {
  ui: {
    textbox?: { style?: string; opacity?: number };
    nameplate?: { style?: string; position?: string };
  };
}

export interface CharacterDef {
  name: string;
  color: string;
  expressions: Record<string, string>;
  voice_prefix?: string;
}

export interface SceneDef {
  background?: string;
  bgm?: string;
  commands: Command[];
}

export interface EndingDef {
  name: string;
  condition: string;
}

/* ── Command Types ── */

export type Command =
  | BgCommand
  | ShowCommand
  | HideCommand
  | DialogCommand
  | NarrationCommand
  | ChoiceCommand
  | JumpCommand
  | BgmCommand
  | SeCommand
  | SetCommand
  | IfCommand
  | WaitCommand
  | ShakeCommand
  | FlashCommand
  | EffectCommand
  | CgCommand
  | ChapterTitleCommand
  | EndCommand;

interface BaseCommand {
  type: string;
}

export interface BgCommand extends BaseCommand {
  type: "bg";
  src: string;
  transition?: string;
}

export interface ShowCommand extends BaseCommand {
  type: "show";
  character: string;
  expression?: string;
  position?: string;
  transition?: string;
}

export interface HideCommand extends BaseCommand {
  type: "hide";
  character: string;
  transition?: string;
}

export interface DialogCommand extends BaseCommand {
  type: "dialog";
  character: string;
  expression?: string;
  text: string;
  voice?: string;
}

export interface NarrationCommand extends BaseCommand {
  type: "narration";
  text: string;
  voice?: string;
}

export interface ChoiceOption {
  text: string;
  jump?: string;
  set?: Record<string, string>;
  condition?: string;
}

export interface ChoiceCommand extends BaseCommand {
  type: "choice";
  options: ChoiceOption[];
}

export interface JumpCommand extends BaseCommand {
  type: "jump";
  target: string;
}

export interface BgmCommand extends BaseCommand {
  type: "bgm";
  src: string;
  fadeIn?: number;
  fadeOut?: number;
  loop?: boolean;
}

export interface SeCommand extends BaseCommand {
  type: "se";
  src: string;
}

export interface SetCommand extends BaseCommand {
  type: "set";
  variable?: string;
  value?: string | number | boolean;
  // Also can appear as character expression change
  character?: string;
  expression?: string;
}

export interface IfCommand extends BaseCommand {
  type: "if";
  condition: string;
  then: Command | Command[];
  else?: Command | Command[];
}

export interface WaitCommand extends BaseCommand {
  type: "wait";
  duration: number;
}

export interface ShakeCommand extends BaseCommand {
  type: "shake";
  intensity?: number;
  duration?: number;
}

export interface FlashCommand extends BaseCommand {
  type: "flash";
  color?: string;
  duration?: number;
}

export interface EffectCommand extends BaseCommand {
  type: "effect";
  name?: string;
  enable: boolean;
}

export interface CgCommand extends BaseCommand {
  type: "cg";
  src: string;
  transition?: string;
}

export interface ChapterTitleCommand extends BaseCommand {
  type: "chapter_title";
  text: string;
  subtitle?: string;
}

export interface EndCommand extends BaseCommand {
  type: "end";
  ending_id?: string;
}

/* ── Runtime State Types ── */

export interface VisibleCharacter {
  key: string;
  expression: string;
  position: string;
  entering?: boolean;
  exiting?: boolean;
}

export interface BacklogEntry {
  character?: string;
  characterName?: string;
  characterColor?: string;
  text: string;
  voice?: string;
}

export interface SaveSlot {
  id: number;
  timestamp: number;
  sceneKey: string;
  commandIndex: number;
  variables: Record<string, number>;
  characters: VisibleCharacter[];
  background: string;
  bgmSrc: string;
  title: string;
  description: string;
}

export type Screen = "title" | "game" | "save" | "load" | "settings" | "backlog" | "endings";

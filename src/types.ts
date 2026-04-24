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
  /** "easy" (default): runtime auto-manages show/hide. "advanced": script controls all show/hide manually. */
  mode?: "easy" | "advanced";
  ui?: UiConfig;
}

/* ── UI customization (all fields optional, fall back to defaults) ── */

export interface UiButtonStyle {
  background?: string;            // CSS color (rgba/hex)
  backgroundImage?: string;       // url(...) or full url to image
  borderColor?: string;
  borderWidth?: string;           // e.g. "1px"
  borderRadius?: string;          // e.g. "8px" / "9999px"
  textColor?: string;
  hoverBackground?: string;
  hoverTextColor?: string;
  hoverBorderColor?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  padding?: string;
  shadow?: string;                // CSS box-shadow value
  width?: string;
  /** Optional small icon shown to the left of the label (url or emoji). */
  icon?: string;
}

export interface UiPanelStyle {
  background?: string;            // background color of the panel surface
  backgroundImage?: string;       // url string
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  textColor?: string;
  shadow?: string;
  /** CSS backdrop-filter blur length, e.g. "8px". */
  backdropBlur?: string;
  /** Color overlay drawn on top of the page-level background image. */
  overlay?: string;
  padding?: string;
}

export interface UiTextboxStyle {
  /** Legacy field, no effect now. */
  style?: string;
  /** Legacy alpha (0-1) for the dialog background. */
  opacity?: number;
  background?: string;            // overrides opacity-based background
  backgroundImage?: string;
  borderColor?: string;
  borderRadius?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: string;
  shadow?: string;
}

export interface UiNameplateStyle {
  style?: string;                 // legacy
  position?: string;              // legacy ("top-left" etc.)
  background?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  /** When set, overrides the per-character color. */
  textColor?: string;
  fontFamily?: string;
  fontWeight?: string | number;
}

export interface UiTitleConfig {
  /** Where to place the menu button stack. */
  layout?: "center" | "left" | "right" | "bottom-center";
  titleColor?: string;
  subtitleColor?: string;
  buttons?: UiButtonStyle;
  /** Per-button override keyed by action: newGame|continue|settings|endings */
  buttonOverrides?: Record<string, UiButtonStyle>;
}

export interface UiConfig {
  textbox?: UiTextboxStyle;
  nameplate?: UiNameplateStyle;
  title?: UiTitleConfig;
  /** Style for the small auto/log/save/progress/menu buttons above the dialog. */
  menuButtons?: UiButtonStyle;
  /** Per-button override keyed by action: auto|backlog|save|progress|menu */
  menuButtonOverrides?: Record<string, UiButtonStyle>;
  settingsPanel?: UiPanelStyle;
  saveLoadPanel?: UiPanelStyle;
  backlogPanel?: UiPanelStyle;
  /** Optional inline style for choice buttons. */
  choiceButtons?: UiButtonStyle;
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
  /** "full" (default) covers entire viewport; "half" centers the image and keeps background/characters visible. */
  mode?: "full" | "half";
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

export type Screen = "title" | "game" | "save" | "load" | "settings" | "backlog" | "endings" | "progress";

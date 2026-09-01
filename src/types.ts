/* ── Game Data Types (matches exported game_data.json) ── */

export interface GameData {
  meta: GameMeta;
  config: GameConfig;
  /** Generator persists creator-owned UI here; config.ui remains accepted for older packages. */
  ui?: UiConfig;
  characters: Record<string, CharacterDef>;
  scenes: Record<string, SceneDef>;
  variables: Record<string, string | number | boolean>;
  endings: Record<string, EndingDef>;
  chapters?: ChapterDef[];
  side_chapters?: SideChapterDef[];
  _asset_manifest?: Record<string, string>;
  start_scene?: string;
  scene_order?: string[];
  /** New generated projects contain explicit jump/choice/end commands for
   * every narrative node. Legacy projects omit this and retain linear
   * scene_order fallback behavior. */
  explicit_flow?: boolean;
}

export interface ChapterDef {
  key: string;
  number?: string | number;
  title?: string;
  name?: string;
  summary?: string;
  key_points?: string[];
  characters?: string[];
  parents?: string[];
  scenes?: string[];
  branch_points?: Array<Record<string, unknown>>;
  kind?: "common" | "route" | "ending";
  chapter_type?: "common" | "route" | "ending";
  route_id?: string | null;
  ending_id?: string | null;
  terminal?: boolean;
  origin?: "main" | string;
}

export interface SideChapterDef {
  key: string;
  title?: string;
  name?: string;
  summary?: string;
  scenes?: string[];
  insert_between?: Record<string, unknown>;
  origin?: "side_chapter" | string;
}

export interface GameMeta {
  title: string;
  author: string;
  version: string;
  description: string;
}

export interface GameConfig {
  /** "advanced" (default): script controls show/hide. "easy": keep one character on stage. */
  mode?: "easy" | "advanced";
  ui?: UiConfig;
}

/* ── UI customization (all fields optional, fall back to defaults) ── */

export type UiThemeMode = "light" | "dark";
export type UiSkinFit = "cover" | "contain";

export interface UiInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface UiContentBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A generated or uploaded skin can use different artwork on wide and narrow screens. */
export interface UiResponsiveSkin {
  desktop?: string;
  mobile?: string;
  fit?: UiSkinFit;
  position?: string;
  opacity?: number;
  /** Content-safe inset authored together with the artwork. */
  safeArea?: UiInsets;
  /** Decoded dimensions of the final rendered asset, e.g. 2048x512. */
  sourceSize?: string;
  mobileSourceSize?: string;
  /** Normalized visible-alpha bounds within each untrimmed source canvas. */
  contentBounds?: UiContentBounds;
  mobileContentBounds?: UiContentBounds;
  /**
   * Normalized rectangle reserved for Runtime-owned text and controls.
   * Unlike safeArea (legacy pixel padding), this remains correct when a
   * contained source bitmap is rendered smaller than its DOM box.
   */
  safeBounds?: UiContentBounds;
  mobileSafeBounds?: UiContentBounds;
  sourcePrompt?: string;
  /** Seed used by the latest generated desktop/mobile skin. */
  sourceSeed?: number;
  mobileSourceSeed?: number;
  cutout?: "none" | "alpha" | "white-key" | "flat-frame" | "center-icon" | "ai";
}

export type UiRenderMode = "html" | "image";
export type UiReferenceRegion =
  | "top-left"
  | "top-edge"
  | "top-right"
  | "left-edge"
  | "right-edge"
  | "bottom-left"
  | "bottom-edge"
  | "bottom-right";

export interface UiImageDesign {
  prompt?: string;
  promptMode?: "auto" | "custom";
  referenceImage?: string;
  referenceSource?: "auto" | "upload";
  referenceKind?: "generated" | "uploaded";
  referenceSignature?: string;
  regions?: UiReferenceRegion[];
}

export interface UiFontSystem {
  body?: string;
  display?: string;
  dialogue?: string;
  ui?: string;
  baseSize?: string;
  scale?: number;
  captionSize?: string;
  uiSize?: string;
  bodySize?: string;
  headingSize?: string;
  displaySize?: string;
}

export interface UiSemanticColors {
  accent?: string;
  accentStrong?: string;
  page?: string;
  pageRaised?: string;
  surface?: string;
  surfaceRaised?: string;
  line?: string;
  controlLine?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
  titleText?: string;
  titleSecondary?: string;
  success?: string;
  warning?: string;
  danger?: string;
  common?: string;
  route?: string;
  ending?: string;
  side?: string;
  locked?: string;
}

export interface UiRadiusSystem {
  small?: string;
  medium?: string;
  large?: string;
  panel?: string;
  pill?: string;
}

export interface UiShadowSystem {
  small?: string;
  panel?: string;
  elevated?: string;
}

export interface UiGlobalConfig {
  /** Project default; the player can still select another mode in Settings. */
  defaultTheme?: UiThemeMode;
  allowPlayerThemeChoice?: boolean;
  imageStylePrompt?: string;
  imageMotifs?: string;
  fonts?: UiFontSystem;
  colors?: UiSemanticColors;
  radii?: UiRadiusSystem;
  shadows?: UiShadowSystem;
}

export interface UiToolbarLayout {
  anchor?: "top-right" | "top-left" | "above-right" | "bottom-right" | "right-vertical" | "custom";
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width?: string;
  gap?: string;
  direction?: "row" | "column";
  justify?: "start" | "center" | "end" | "space-between";
}

export interface UiButtonStyle {
  renderMode?: UiRenderMode;
  imageDesign?: UiImageDesign;
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
  height?: string;
  /** Optional small icon shown to the left of the label (url or emoji). */
  icon?: string;
  /** Optional per-button label override. */
  label?: string;
  /** Hide the visible label while keeping its accessible name and tooltip. */
  showLabel?: boolean;
  tooltip?: string;
  hidden?: boolean;
  /** Used by the in-game quick-menu base style to place the button group. */
  toolbar?: UiToolbarLayout;
  skin?: UiResponsiveSkin;
}

export interface UiPanelStyle {
  renderMode?: UiRenderMode;
  imageDesign?: UiImageDesign;
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
  skin?: UiResponsiveSkin;
}

export interface UiTextboxStyle {
  renderMode?: UiRenderMode;
  imageDesign?: UiImageDesign;
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
  padding?: string;
  width?: string;
  height?: string;
  minHeight?: string;
  /** Distance from the bottom edge of the game viewport. */
  bottom?: string;
  /** Horizontal offset from the centered position. */
  offsetX?: string;
  skin?: UiResponsiveSkin;
}

export interface UiNameplateStyle {
  renderMode?: UiRenderMode;
  imageDesign?: UiImageDesign;
  style?: string;                 // legacy
  position?: string;              // legacy ("top-left" etc.)
  /** Semantic attachment point used by the UI designer; custom keeps explicit offsets. */
  anchor?: "top-left" | "top-center" | "top-right" | "inside-left" | "inside-right" | "custom";
  background?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  /** When set, overrides the per-character color. */
  textColor?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  backgroundImage?: string;
  padding?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  skin?: UiResponsiveSkin;
}

export interface UiTitleConfig {
  /** Where to place the menu button stack. */
  layout?: "center" | "left" | "right" | "bottom-center";
  titleColor?: string;
  subtitleColor?: string;
  buttons?: UiButtonStyle;
  /** Per-button override keyed by action: newGame|continue|settings|endings */
  buttonOverrides?: Record<string, UiButtonStyle>;
  /** Dedicated title artwork; no longer forced to the first story background. */
  background?: UiResponsiveSkin;
  veil?: string;
  kicker?: string;
}

export interface UiGamePageConfig {
  textbox?: UiTextboxStyle;
  nameplate?: UiNameplateStyle;
  menuButtons?: UiButtonStyle;
  menuButtonOverrides?: Record<string, UiButtonStyle>;
  choiceButtons?: UiButtonStyle;
}

export interface UiPanelPageConfig {
  surface?: UiPanelStyle;
  pageBackground?: UiResponsiveSkin;
}

export interface UiSaveLoadPageConfig extends UiPanelPageConfig {
  slot?: UiPanelStyle;
  desktopColumns?: number;
  mobileColumns?: number;
  thumbnailRatio?: string;
}

export interface UiBacklogPageConfig extends UiPanelPageConfig {
  /** Legacy per-line card skin. Runtime now renders a continuous transcript. */
  entry?: UiPanelStyle;
  layout?: UiBacklogLayout;
}

export interface UiBacklogLayout {
  contentInset?: string;
  rowGap?: string;
  avatarSize?: string;
  showAvatars?: boolean;
  speakerLayout?: "stacked" | "inline";
}

export interface UiEndingsPageConfig extends UiPanelPageConfig {
  card?: UiPanelStyle;
  reachedAccent?: string;
  lockedAccent?: string;
}

export type UiFlowNodeShape = "rounded-rect" | "rect" | "pill" | "diamond";
export type UiFlowEdgeCurve = "smooth" | "straight" | "step";

export interface UiFlowNodeStyle {
  renderMode?: UiRenderMode;
  imageDesign?: UiImageDesign;
  shape?: UiFlowNodeShape;
  width?: number;
  height?: number;
  radius?: number;
  background?: string;
  borderColor?: string;
  textColor?: string;
  commonColor?: string;
  routeColor?: string;
  endingColor?: string;
  sideColor?: string;
  lockedColor?: string;
  skin?: UiResponsiveSkin;
}

export interface UiFlowEdgeStyle {
  curve?: UiFlowEdgeCurve;
  line?: "solid" | "dashed";
  width?: number;
  color?: string;
  choiceColor?: string;
  arrow?: "arrow" | "dot" | "none";
}

export interface UiFlowPageConfig extends UiPanelPageConfig {
  canvasBackground?: string;
  node?: UiFlowNodeStyle;
  edge?: UiFlowEdgeStyle;
}

export interface UiSystemPageConfig {
  loading?: UiPanelStyle;
  error?: UiPanelStyle;
  chapterCard?: UiPanelStyle;
}

export interface UiPageConfig {
  title?: UiTitleConfig;
  game?: UiGamePageConfig;
  saveLoad?: UiSaveLoadPageConfig;
  backlog?: UiBacklogPageConfig;
  endings?: UiEndingsPageConfig;
  flow?: UiFlowPageConfig;
  settings?: UiPanelPageConfig;
  system?: UiSystemPageConfig;
}

export interface UiConfig {
  schemaVersion?: 2;
  global?: UiGlobalConfig;
  pages?: UiPageConfig;
  /** Legacy flat keys remain readable so existing projects do not change appearance. */
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
  default_outfit?: string;
  outfits?: Record<string, OutfitDef>;
  voice_prefix?: string;
}

export interface OutfitDef {
  name: string;
  expressions: Record<string, string>;
  multiview?: string;
  scene_keys?: string[];
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
  position?: "left" | "center" | "right";
}

export interface ShowCommand extends BaseCommand {
  type: "show";
  character: string;
  expression?: string;
  outfit_id?: string;
  position?: string;
  anchor?: "top-left" | "top-center" | "top-right" | "inside-left" | "inside-right" | "custom";
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
  outfit_id?: string;
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
  outfit_id?: string;
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
  outfitId?: string;
  position: string;
  entering?: boolean;
  exiting?: boolean;
}

export interface BacklogEntry {
  character?: string;
  outfitId?: string;
  characterName?: string;
  characterColor?: string;
  text: string;
  voice?: string;
}

export interface SoundEffectEvent {
  id: number;
  src: string;
}

export interface SaveSlot {
  id: number;
  timestamp: number;
  sceneKey: string;
  commandIndex: number;
  /** Remaining commands inside a conditional branch, if the save was made
   * while that branch was playing. */
  commandQueue?: Command[];
  activeInlineCommand?: Command;
  variables: Record<string, number>;
  characters: VisibleCharacter[];
  background: string;
  backgroundPosition?: "left" | "center" | "right";
  bgmSrc: string;
  /** Scenes the player has actually entered; older saves omit this field. */
  visitedScenes?: string[];
  title: string;
  description: string;
}

export type Screen = "title" | "game" | "save" | "load" | "settings" | "backlog" | "endings" | "progress";
export type BaseScreen = "title" | "game";

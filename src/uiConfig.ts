import type { CSSProperties } from "react";
import type {
  UiButtonStyle,
  UiConfig,
  UiGlobalConfig,
  UiPanelStyle,
  UiResponsiveSkin,
  UiTextboxStyle,
  UiNameplateStyle,
  UiTitleConfig,
} from "./types";

/* ── Defaults (match runtime hard-coded look) ── */

export const defaultMenuButton: UiButtonStyle = {
  background: "var(--runtime-button-bg)",
  textColor: "var(--runtime-text-secondary)",
  borderColor: "var(--runtime-control-line)",
  borderRadius: "calc(var(--runtime-panel-radius) * 0.52)",
  padding: "7px 11px",
  hoverBackground: "var(--runtime-button-hover)",
  hoverBorderColor: "var(--runtime-accent)",
};

export const defaultTitleButton: UiButtonStyle = {
  background: "var(--runtime-title-button-bg)",
  borderColor: "var(--runtime-control-line)",
  borderWidth: "1px",
  borderRadius: "calc(var(--runtime-panel-radius) * 0.6)",
  textColor: "var(--runtime-title-text)",
  hoverBackground: "var(--runtime-title-button-hover)",
  hoverBorderColor: "var(--runtime-accent)",
  padding: "12px 24px",
  width: "100%",
};

export const defaultLightPanel: UiPanelStyle = {
  background: "var(--runtime-surface)",
  borderColor: "var(--runtime-line)",
  borderWidth: "1px",
  borderRadius: "var(--runtime-panel-radius)",
  textColor: "var(--runtime-text-primary)",
  shadow: "var(--runtime-panel-shadow)",
  backdropBlur: "16px",
  overlay: "var(--runtime-scrim)",
  padding: "0",
};

export const defaultTextbox: UiTextboxStyle = {
  opacity: 0.9,
  borderColor: "var(--runtime-line)",
  borderRadius: "var(--runtime-panel-radius)",
  textColor: "var(--runtime-text-primary)",
};

export const defaultNameplate: UiNameplateStyle = {
  background: "var(--runtime-surface-raised)",
  borderRadius: "calc(var(--runtime-panel-radius) * 0.55) calc(var(--runtime-panel-radius) * 0.55) 0 0",
  fontWeight: 700,
};

export const defaultChoiceButton: UiButtonStyle = {
  background: "var(--runtime-choice-bg)",
  textColor: "var(--runtime-text-primary)",
  borderColor: "var(--runtime-control-line)",
  borderWidth: "1px",
  borderRadius: "calc(var(--runtime-panel-radius) * 0.7)",
  padding: "14px 24px",
  hoverBackground: "var(--runtime-choice-hover)",
  hoverBorderColor: "var(--runtime-accent)",
};

/* ── Style builders ── */

type UiCssProperties = CSSProperties & Record<`--${string}`, string | number | undefined>;

export function uiImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^(s3|local):\/\//.test(value)) return `/api/assets/preview?uri=${encodeURIComponent(value)}`;
  if (/^(?:https?:|data:|blob:|\/|var\()/i.test(value)) return value;
  // CSS custom properties declared from an inline style are substituted into
  // rules in the external stylesheet.  Relative URLs inside those properties
  // are then resolved against `/assets/index-*.css`, producing
  // `/assets/assets/...` in standalone packages.  Pin them to the document
  // URL before wrapping them in url(...).
  if (typeof window !== "undefined") return new URL(value, window.location.href).href;
  return value;
}

function imageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const wrapped = value.match(/^url\(["']?(.*?)["']?\)$/i);
  if (wrapped) {
    const resolvedInner = uiImageUrl(wrapped[1]);
    return resolvedInner ? `url("${resolvedInner}")` : undefined;
  }
  const resolved = uiImageUrl(value);
  return resolved ? `url("${resolved}")` : undefined;
}

/**
 * Add responsive artwork without removing the parameter-based surface.
 * `.ui-responsive-skin` switches the variables at the mobile breakpoint.
 */
export function responsiveSkinStyle(
  skin: UiResponsiveSkin | undefined,
  legacyImage?: string,
): UiCssProperties {
  const desktop = imageUrl(skin?.desktop || legacyImage);
  const mobile = imageUrl(skin?.mobile || skin?.desktop || legacyImage);
  if (!desktop && !mobile) return {};
  const css: UiCssProperties = {
    "--ui-skin-desktop": desktop,
    "--ui-skin-mobile": mobile || desktop,
  };
  const fit = skin?.fit || "cover";
  if (fit === "nine-slice") {
    css["--ui-skin-background-desktop"] = "none";
    css["--ui-skin-background-mobile"] = "none";
    css["--ui-skin-border-desktop"] = desktop;
    css["--ui-skin-border-mobile"] = mobile || desktop;
    const slice = skin?.nineSlice || {};
    const values = [slice.top ?? 24, slice.right ?? 24, slice.bottom ?? 24, slice.left ?? 24];
    const border = skin?.borderWidth || {};
    const widths = [border.top ?? 18, border.right ?? 24, border.bottom ?? 18, border.left ?? 24];
    css.borderStyle = "solid";
    css.borderWidth = widths.map((value) => `${value}px`).join(" ");
    css.borderImageSlice = `${values.join(" ")}${slice.fill ? " fill" : ""}`;
    css.borderImageWidth = widths.map((value) => `${value}px`).join(" ");
    const outset = skin?.outset;
    if (outset && [outset.top, outset.right, outset.bottom, outset.left].some((value) => value !== undefined)) {
      css.borderImageOutset = [outset.top, outset.right, outset.bottom, outset.left]
        .map((value) => `${value ?? 0}px`)
        .join(" ");
    }
    css.borderImageRepeat = "stretch";
  } else {
    css["--ui-skin-background-desktop"] = desktop;
    css["--ui-skin-background-mobile"] = mobile || desktop;
    css["--ui-skin-border-desktop"] = "none";
    css["--ui-skin-border-mobile"] = "none";
    css.backgroundPosition = skin?.position || "center";
    css.backgroundSize = fit === "stretch" ? "100% 100%" : fit;
    css.backgroundRepeat = fit === "tile" ? "repeat" : "no-repeat";
  }
  if (skin?.opacity !== undefined) css.opacity = skin.opacity;
  const safe = skin?.safeArea;
  if (safe && [safe.top, safe.right, safe.bottom, safe.left].some((value) => value !== undefined)) {
    css["--ui-skin-safe-top"] = `${safe.top ?? 0}px`;
    css["--ui-skin-safe-right"] = `${safe.right ?? 0}px`;
    css["--ui-skin-safe-bottom"] = `${safe.bottom ?? 0}px`;
    css["--ui-skin-safe-left"] = `${safe.left ?? 0}px`;
  }
  return css;
}

export function globalThemeStyle(global: UiGlobalConfig | undefined): UiCssProperties {
  const colors = global?.colors || {};
  const fonts = global?.fonts || {};
  const radii = global?.radii || {};
  const shadows = global?.shadows || {};
  const css: UiCssProperties = {};
  const vars: Array<[string, string | number | undefined]> = [
    ["--runtime-accent", colors.accent],
    ["--runtime-accent-strong", colors.accentStrong],
    ["--runtime-page", colors.page],
    ["--runtime-page-raised", colors.pageRaised],
    ["--runtime-surface", colors.surface],
    ["--runtime-surface-raised", colors.surfaceRaised],
    ["--runtime-line", colors.line],
    ["--runtime-control-line", colors.controlLine],
    ["--runtime-text-primary", colors.textPrimary],
    ["--runtime-text-secondary", colors.textSecondary],
    ["--runtime-text-muted", colors.textMuted],
    ["--runtime-title-text", colors.titleText],
    ["--runtime-title-secondary", colors.titleSecondary],
    ["--runtime-success", colors.success],
    ["--runtime-warning", colors.warning],
    ["--runtime-danger", colors.danger],
    ["--runtime-flow-common", colors.common],
    ["--runtime-flow-route", colors.route],
    ["--runtime-flow-ending", colors.ending],
    ["--runtime-flow-side", colors.side],
    ["--runtime-flow-locked", colors.locked],
    ["--runtime-font-body", fonts.body],
    ["--runtime-font-display", fonts.display],
    ["--runtime-font-dialogue", fonts.dialogue],
    ["--runtime-font-ui", fonts.ui],
    ["--runtime-text-caption", fonts.captionSize],
    ["--runtime-text-ui", fonts.uiSize],
    ["--runtime-text-body", fonts.bodySize],
    ["--runtime-text-heading", fonts.headingSize],
    ["--runtime-text-display", fonts.displaySize],
    ["--runtime-radius-sm", radii.small],
    ["--runtime-radius-md", radii.medium],
    ["--runtime-radius-lg", radii.large],
    ["--runtime-panel-radius", radii.panel],
    ["--runtime-radius-pill", radii.pill],
    ["--runtime-shadow-sm", shadows.small],
    ["--runtime-panel-shadow", shadows.panel],
    ["--runtime-shadow-elevated", shadows.elevated],
  ];
  for (const [key, value] of vars) if (value !== undefined && value !== "") css[key as `--${string}`] = value;
  if (fonts.baseSize) css.fontSize = fonts.baseSize;
  if (fonts.scale !== undefined) css["--runtime-user-font-scale"] = Math.max(0.75, Math.min(1.5, fonts.scale));
  if (fonts.body) css.fontFamily = fonts.body;
  return css;
}

export function resolveTitleConfig(ui: UiConfig | undefined): UiTitleConfig | undefined {
  return ui?.pages?.title || ui?.title;
}

export function resolveGameUi(ui: UiConfig | undefined) {
  const page = ui?.pages?.game;
  return {
    textbox: page?.textbox || ui?.textbox,
    nameplate: page?.nameplate || ui?.nameplate,
    menuButtons: page?.menuButtons || ui?.menuButtons,
    menuButtonOverrides: page?.menuButtonOverrides || ui?.menuButtonOverrides,
    choiceButtons: page?.choiceButtons || ui?.choiceButtons,
  };
}

export function resolvePanelUi(
  ui: UiConfig | undefined,
  page: "settings" | "saveLoad" | "backlog" | "endings" | "flow",
): UiPanelStyle | undefined {
  const configured = ui?.pages?.[page]?.surface;
  if (configured) return configured;
  if (page === "settings") return ui?.settingsPanel;
  if (page === "saveLoad") return ui?.saveLoadPanel;
  if (page === "backlog") return ui?.backlogPanel;
  return undefined;
}

export function buttonStyle(
  override: UiButtonStyle | undefined,
  fallback: UiButtonStyle,
): CSSProperties {
  const s: UiButtonStyle = { ...fallback, ...(override || {}) };
  const css: CSSProperties = {};
  if (s.background) css.backgroundColor = s.background;
  Object.assign(css, responsiveSkinStyle(s.skin, s.backgroundImage));
  if (s.skin) {
    // The skin already owns the visual surface. CSS blur and the default panel
    // shadow would otherwise create additional translucent layers around it.
    css.backdropFilter = "none";
    css.boxShadow = s.shadow || "none";
  }
  if (s.textColor) css.color = s.textColor;
  if (s.skin?.fit !== "nine-slice" && (s.borderColor || s.borderWidth)) {
    css.border = `${s.borderWidth || "1px"} solid ${s.borderColor || "transparent"}`;
  }
  if (s.borderRadius) css.borderRadius = s.borderRadius;
  if (s.padding) css.padding = s.padding;
  if (s.shadow) css.boxShadow = s.shadow;
  if (s.fontFamily) css.fontFamily = s.fontFamily;
  if (s.fontWeight !== undefined) css.fontWeight = s.fontWeight;
  if (s.width) css.width = s.width;
  if (s.height) css.height = s.height;
  return css;
}

export function buttonHoverStyle(
  override: UiButtonStyle | undefined,
  fallback: UiButtonStyle,
): CSSProperties {
  const s: UiButtonStyle = { ...fallback, ...(override || {}) };
  const css: CSSProperties = {};
  // Do not use the `background` shorthand here: it resets a generated icon's
  // background-image, making the mark disappear as soon as the button hovers.
  if (s.hoverBackground) css.backgroundColor = s.hoverBackground;
  if (s.hoverTextColor) css.color = s.hoverTextColor;
  if (s.hoverBorderColor || s.borderWidth) {
    css.border = `${s.borderWidth || "1px"} solid ${s.hoverBorderColor || s.borderColor || "transparent"}`;
  }
  return css;
}

export function panelStyle(
  override: UiPanelStyle | undefined,
  fallback: UiPanelStyle,
): CSSProperties {
  const s: UiPanelStyle = { ...fallback, ...(override || {}) };
  const css: CSSProperties = {};
  if (s.background) css.backgroundColor = s.background;
  Object.assign(css, responsiveSkinStyle(s.skin, s.backgroundImage));
  if (s.skin) css.boxShadow = "none";
  if (s.textColor) css.color = s.textColor;
  if (s.skin?.fit !== "nine-slice" && (s.borderColor || s.borderWidth)) {
    css.border = `${s.borderWidth || "1px"} solid ${s.borderColor || "transparent"}`;
  }
  if (s.borderRadius) css.borderRadius = s.borderRadius;
  if (s.shadow) css.boxShadow = s.shadow;
  if (s.padding) css.padding = s.padding;
  return css;
}

export function panelOverlayStyle(
  override: UiPanelStyle | undefined,
  fallback: UiPanelStyle,
): CSSProperties {
  const s: UiPanelStyle = { ...fallback, ...(override || {}) };
  const css: CSSProperties = {};
  if (s.overlay) css.background = s.overlay;
  if (s.backdropBlur) css.backdropFilter = `blur(${s.backdropBlur})`;
  return css;
}

export function textboxStyle(
  override: UiTextboxStyle | undefined,
): UiCssProperties {
  const s: UiTextboxStyle = { ...defaultTextbox, ...(override || {}) };
  const css: UiCssProperties = {};
  if (s.background || s.backgroundImage) {
    if (s.background) css.backgroundColor = s.background;
  } else {
    css.backgroundColor = `rgba(var(--runtime-dialog-rgb), ${s.opacity ?? 0.82})`;
  }
  // Never infer a border-image outset. The generated artwork should align to
  // the editable dialogue rectangle; an implicit expansion creates a second
  // ghost frame outside the selection and makes resize handles misleading.
  // Projects that deliberately need decoration outside the box can still set
  // skin.outset explicitly in the Studio inspector.
  Object.assign(css, responsiveSkinStyle(s.skin, s.backgroundImage));
  if (s.skin) {
    css.backdropFilter = "none";
    css.boxShadow = s.shadow || "none";
  }
  // Absolutely positioned children (nameplate and quick menu) are laid out
  // from the dialogue panel's padding box.  A nine-slice border moves that
  // origin inward, so expose the border thickness and compensate in CSS.
  css["--runtime-dialog-frame-top"] = s.skin?.fit === "nine-slice"
    ? `${s.skin.borderWidth?.top ?? 18}px`
    : "0px";
  css["--runtime-dialog-frame-right"] = s.skin?.fit === "nine-slice"
    ? `${s.skin.borderWidth?.right ?? 24}px`
    : "0px";
  css["--runtime-dialog-frame-left"] = s.skin?.fit === "nine-slice"
    ? `${s.skin.borderWidth?.left ?? 24}px`
    : "0px";
  if (s.skin?.fit !== "nine-slice" && s.borderColor) css.border = `1px solid ${s.borderColor}`;
  if (s.borderRadius) css.borderRadius = s.borderRadius;
  if (s.textColor) css.color = s.textColor;
  if (s.fontFamily) css.fontFamily = s.fontFamily;
  if (s.fontSize) css.fontSize = s.fontSize;
  if (s.shadow) css.boxShadow = s.shadow;
  if (s.padding) css.padding = s.padding;
  if (s.width) css.width = s.width;
  if (s.height) css.height = s.height;
  if (s.minHeight) css.minHeight = s.minHeight;
  if (s.bottom) css.bottom = s.bottom;
  if (s.offsetX) css.marginLeft = s.offsetX;
  return css;
}

export function nameplateStyle(
  override: UiNameplateStyle | undefined,
  characterColor: string | null,
): CSSProperties {
  const s: UiNameplateStyle = { ...defaultNameplate, ...(override || {}) };
  const color = s.textColor || characterColor || "var(--runtime-text-primary)";
  const css: CSSProperties = { color };
  if (s.skin?.fit !== "nine-slice") css.borderTop = `2px solid ${color}`;
  if (s.background) css.backgroundColor = s.background;
  else css.backgroundColor = "var(--runtime-surface-raised)";
  Object.assign(css, responsiveSkinStyle(s.skin, s.backgroundImage));
  if (s.skin) css.boxShadow = "none";
  if (s.skin?.fit !== "nine-slice" && s.borderColor && s.borderWidth)
    css.border = `${s.borderWidth} solid ${s.borderColor}`;
  if (s.borderRadius) css.borderRadius = s.borderRadius;
  if (s.fontFamily) css.fontFamily = s.fontFamily;
  if (s.fontWeight !== undefined) css.fontWeight = s.fontWeight;
  if (s.padding) css.padding = s.padding;
  if (s.anchor && s.anchor !== "custom") {
    css.bottom = "auto";
    css.transform = "none";
    if (s.anchor === "top-left") {
      css.top = "calc(-1 * var(--runtime-dialog-frame-top, 0px) - 22px)";
      css.left = "calc(-1 * var(--runtime-dialog-frame-left, 0px) + 54px)";
      css.right = "auto";
    } else if (s.anchor === "top-center") {
      css.top = "calc(-1 * var(--runtime-dialog-frame-top, 0px) - 22px)";
      css.left = "50%";
      css.right = "auto";
      css.transform = "translateX(-50%)";
    } else if (s.anchor === "top-right") {
      css.top = "calc(-1 * var(--runtime-dialog-frame-top, 0px) - 22px)";
      css.left = "auto";
      css.right = "calc(-1 * var(--runtime-dialog-frame-right, 0px) + 54px)";
    } else if (s.anchor === "inside-left") {
      css.top = "12px";
      css.left = "24px";
      css.right = "auto";
    } else if (s.anchor === "inside-right") {
      css.top = "12px";
      css.left = "auto";
      css.right = "24px";
    }
  }
  if (s.top) css.top = s.top === "auto" ? "auto" : `calc(-1 * var(--runtime-dialog-frame-top, 0px) + ${s.top})`;
  if (s.bottom) css.bottom = s.bottom;
  if (s.left) css.left = s.left === "auto" ? "auto" : `calc(-1 * var(--runtime-dialog-frame-left, 0px) + ${s.left})`;
  if (s.right) css.right = s.right === "auto" ? "auto" : `calc(-1 * var(--runtime-dialog-frame-right, 0px) + ${s.right})`;
  if (s.top && !s.bottom) css.bottom = "auto";
  if (s.bottom && !s.top) css.top = "auto";
  if (s.left && !s.right) css.right = "auto";
  if (s.right && !s.left) css.left = "auto";
  if (s.width) css.width = s.width;
  if (s.height) css.height = s.height;
  if (s.minWidth) css.minWidth = s.minWidth;
  if (s.maxWidth) css.maxWidth = s.maxWidth;
  return css;
}

export function toolbarStyle(override: UiButtonStyle | undefined): CSSProperties {
  const layout = override?.toolbar;
  if (!layout) return {};
  const css: CSSProperties = {};
  if (layout.anchor && layout.anchor !== "custom") {
    css.bottom = "auto";
    css.width = "max-content";
    css.flexDirection = "row";
    css.justifyContent = "flex-end";
    if (layout.anchor === "top-right") {
      css.top = "calc(-1 * var(--runtime-dialog-frame-top, 0px) + 10px)";
      css.left = "auto";
      css.right = "calc(-1 * var(--runtime-dialog-frame-right, 0px) + 14px)";
    } else if (layout.anchor === "top-left") {
      css.top = "calc(-1 * var(--runtime-dialog-frame-top, 0px) + 10px)";
      css.left = "calc(-1 * var(--runtime-dialog-frame-left, 0px) + 14px)";
      css.right = "auto";
      css.justifyContent = "flex-start";
    } else if (layout.anchor === "above-right") {
      css.top = "calc(-1 * var(--runtime-dialog-frame-top, 0px) - 54px)";
      css.left = "auto";
      css.right = "calc(-1 * var(--runtime-dialog-frame-right, 0px) + 14px)";
    } else if (layout.anchor === "bottom-right") {
      css.top = "auto";
      css.bottom = "18px";
      css.left = "auto";
      css.right = "14px";
    } else if (layout.anchor === "right-vertical") {
      css.top = "calc(-1 * var(--runtime-dialog-frame-top, 0px) + 10px)";
      css.left = "auto";
      css.right = "calc(-1 * var(--runtime-dialog-frame-right, 0px) + 14px)";
      css.flexDirection = "column";
    }
  }
  if (layout.top) css.top = layout.top === "auto" ? "auto" : `calc(-1 * var(--runtime-dialog-frame-top, 0px) + ${layout.top})`;
  if (layout.bottom) css.bottom = layout.bottom;
  if (layout.left) css.left = layout.left === "auto" ? "auto" : `calc(-1 * var(--runtime-dialog-frame-left, 0px) + ${layout.left})`;
  if (layout.right) css.right = layout.right === "auto" ? "auto" : `calc(-1 * var(--runtime-dialog-frame-right, 0px) + ${layout.right})`;
  if (layout.top && !layout.bottom) css.bottom = "auto";
  if (layout.bottom && !layout.top) css.top = "auto";
  if (layout.left && !layout.right) css.right = "auto";
  if (layout.right && !layout.left) css.left = "auto";
  if (layout.width) css.width = layout.width;
  if (layout.gap) css.gap = layout.gap;
  if (layout.direction) css.flexDirection = layout.direction;
  if (layout.justify) {
    css.justifyContent = layout.justify === "start"
      ? "flex-start"
      : layout.justify === "end"
        ? "flex-end"
        : layout.justify;
  }
  return css;
}

export function titleLayoutClass(layout: UiTitleConfig["layout"]): string {
  switch (layout) {
    case "left":
      return "items-start justify-center pl-24";
    case "right":
      return "items-end justify-center pr-24";
    case "bottom-center":
      return "items-center justify-end pb-24";
    case "center":
    default:
      return "items-center justify-center";
  }
}

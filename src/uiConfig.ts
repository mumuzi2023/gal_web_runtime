import type { CSSProperties } from "react";
import type {
  UiButtonStyle,
  UiPanelStyle,
  UiTextboxStyle,
  UiNameplateStyle,
  UiTitleConfig,
} from "./types";

/* ── Defaults (match runtime hard-coded look) ── */

export const defaultMenuButton: UiButtonStyle = {
  background: "rgba(255, 255, 255, 0.035)",
  textColor: "rgba(239, 244, 255, 0.72)",
  borderColor: "rgba(190, 210, 255, 0.14)",
  borderRadius: "9px",
  padding: "7px 11px",
  hoverBackground: "rgba(103, 139, 215, 0.16)",
  hoverBorderColor: "rgba(145, 184, 255, 0.42)",
};

export const defaultTitleButton: UiButtonStyle = {
  background: "rgba(11, 18, 33, 0.56)",
  borderColor: "rgba(196, 216, 255, 0.20)",
  borderWidth: "1px",
  borderRadius: "12px",
  textColor: "rgba(255, 255, 255, 0.90)",
  hoverBackground: "rgba(255, 255, 255, 0.20)",
  hoverBorderColor: "rgba(255, 255, 255, 0.40)",
  padding: "12px 24px",
  width: "16rem",
};

export const defaultLightPanel: UiPanelStyle = {
  background: "rgba(9, 15, 28, 0.91)",
  borderColor: "rgba(196, 216, 255, 0.20)",
  borderWidth: "1px",
  borderRadius: "20px",
  textColor: "rgba(239, 244, 255, 0.92)",
  shadow: "0 30px 100px rgba(0, 0, 0, 0.52)",
  backdropBlur: "16px",
  overlay: "rgba(3, 7, 15, 0.70)",
  padding: "0",
};

export const defaultTextbox: UiTextboxStyle = {
  opacity: 0.9,
  borderColor: "rgba(190, 210, 255, 0.20)",
  borderRadius: "18px",
  textColor: "rgba(245, 248, 255, 0.92)",
};

export const defaultNameplate: UiNameplateStyle = {
  background: "rgba(0, 0, 0, 0.9)",
  borderRadius: "6px 6px 0 0",
  fontWeight: 700,
};

export const defaultChoiceButton: UiButtonStyle = {
  background: "rgba(18, 28, 49, 0.92)",
  textColor: "#fff",
  borderColor: "rgba(255, 255, 255, 0.20)",
  borderWidth: "1px",
  borderRadius: "14px",
  padding: "14px 24px",
  hoverBorderColor: "rgba(255, 255, 255, 0.60)",
};

/* ── Style builders ── */

function bgValue(style: {
  background?: string;
  backgroundImage?: string;
}): string | undefined {
  if (style.backgroundImage) {
    const url = /^url\(/i.test(style.backgroundImage)
      ? style.backgroundImage
      : `url("${style.backgroundImage}")`;
    return style.background
      ? `${style.background} ${url} center/cover no-repeat`
      : `${url} center/cover no-repeat`;
  }
  return style.background;
}

export function buttonStyle(
  override: UiButtonStyle | undefined,
  fallback: UiButtonStyle,
): CSSProperties {
  const s: UiButtonStyle = { ...fallback, ...(override || {}) };
  const css: CSSProperties = {};
  const bg = bgValue(s);
  if (bg) css.background = bg;
  if (s.textColor) css.color = s.textColor;
  if (s.borderColor || s.borderWidth) {
    css.border = `${s.borderWidth || "1px"} solid ${s.borderColor || "transparent"}`;
  }
  if (s.borderRadius) css.borderRadius = s.borderRadius;
  if (s.padding) css.padding = s.padding;
  if (s.shadow) css.boxShadow = s.shadow;
  if (s.fontFamily) css.fontFamily = s.fontFamily;
  if (s.fontWeight !== undefined) css.fontWeight = s.fontWeight;
  if (s.width) css.width = s.width;
  return css;
}

export function buttonHoverStyle(
  override: UiButtonStyle | undefined,
  fallback: UiButtonStyle,
): CSSProperties {
  const s: UiButtonStyle = { ...fallback, ...(override || {}) };
  const css: CSSProperties = {};
  if (s.hoverBackground) css.background = s.hoverBackground;
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
  const bg = bgValue(s);
  if (bg) css.background = bg;
  if (s.textColor) css.color = s.textColor;
  if (s.borderColor || s.borderWidth) {
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
): CSSProperties {
  const s: UiTextboxStyle = { ...defaultTextbox, ...(override || {}) };
  const css: CSSProperties = {};
  if (s.background || s.backgroundImage) {
    const bg = bgValue(s);
    if (bg) css.background = bg;
  } else {
    css.backgroundColor = `rgba(0, 0, 0, ${s.opacity ?? 0.82})`;
  }
  if (s.borderColor) css.border = `1px solid ${s.borderColor}`;
  if (s.borderRadius) css.borderRadius = s.borderRadius;
  if (s.textColor) css.color = s.textColor;
  if (s.fontFamily) css.fontFamily = s.fontFamily;
  if (s.fontSize) css.fontSize = s.fontSize;
  if (s.shadow) css.boxShadow = s.shadow;
  return css;
}

export function nameplateStyle(
  override: UiNameplateStyle | undefined,
  characterColor: string | null,
): CSSProperties {
  const s: UiNameplateStyle = { ...defaultNameplate, ...(override || {}) };
  const color = s.textColor || characterColor || "#fff";
  const css: CSSProperties = {
    color,
    borderTop: `2px solid ${color}`,
  };
  if (s.background) css.backgroundColor = s.background;
  else css.backgroundColor = "rgba(0, 0, 0, 0.9)";
  if (s.borderColor && s.borderWidth)
    css.border = `${s.borderWidth} solid ${s.borderColor}`;
  if (s.borderRadius) css.borderRadius = s.borderRadius;
  if (s.fontFamily) css.fontFamily = s.fontFamily;
  if (s.fontWeight !== undefined) css.fontWeight = s.fontWeight;
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

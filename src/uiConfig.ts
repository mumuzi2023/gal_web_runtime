import type { CSSProperties } from "react";
import type {
  UiButtonStyle,
  UiPanelStyle,
  UiTextboxStyle,
  UiNameplateStyle,
  UiTitleConfig,
} from "./types";

/* ── Defaults — match the previous hard-coded look ── */

export const defaultMenuButton: UiButtonStyle = {
  background: "rgba(0, 0, 0, 0.6)",
  textColor: "rgba(255, 255, 255, 0.6)",
  borderRadius: "4px",
  padding: "2px 8px",
  hoverBackground: "rgba(255, 255, 255, 0.2)",
};

export const defaultTitleButton: UiButtonStyle = {
  background: "rgba(255, 255, 255, 0.10)",
  borderColor: "rgba(255, 255, 255, 0.20)",
  borderWidth: "1px",
  borderRadius: "6px",
  textColor: "rgba(255, 255, 255, 0.90)",
  hoverBackground: "rgba(255, 255, 255, 0.20)",
  hoverBorderColor: "rgba(255, 255, 255, 0.40)",
  padding: "12px 24px",
  width: "16rem",
};

export const defaultLightPanel: UiPanelStyle = {
  background: "rgba(255, 255, 255, 0.90)",
  borderColor: "rgba(229, 231, 235, 1)",
  borderWidth: "1px",
  borderRadius: "12px",
  textColor: "rgba(31, 41, 55, 1)",
  shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  backdropBlur: "12px",
  overlay: "rgba(255, 255, 255, 0.40)",
  padding: "24px",
};

export const defaultTextbox: UiTextboxStyle = {
  opacity: 0.82,
  borderColor: "rgba(255, 255, 255, 0.15)",
  borderRadius: "8px 8px 0 0",
  textColor: "rgba(255, 255, 255, 0.90)",
};

export const defaultNameplate: UiNameplateStyle = {
  background: "rgba(0, 0, 0, 0.9)",
  borderRadius: "6px 6px 0 0",
  fontWeight: 700,
};

export const defaultChoiceButton: UiButtonStyle = {
  background: "rgba(20, 20, 40, 0.92)",
  textColor: "#fff",
  borderColor: "rgba(255, 255, 255, 0.20)",
  borderWidth: "1px",
  borderRadius: "6px",
  padding: "16px 24px",
  hoverBorderColor: "rgba(255, 255, 255, 0.60)",
};

/* ── Style builders ── */

function bgValue(style: { background?: string; backgroundImage?: string }): string | undefined {
  if (style.backgroundImage) {
    const url = /^url\(/i.test(style.backgroundImage)
      ? style.backgroundImage
      : `url("${style.backgroundImage}")`;
    return style.background ? `${style.background} ${url} center/cover no-repeat` : `${url} center/cover no-repeat`;
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

/** Hover style applied via inline mouseenter/leave handlers. */
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

export function panelOverlayStyle(override: UiPanelStyle | undefined, fallback: UiPanelStyle): CSSProperties {
  const s: UiPanelStyle = { ...fallback, ...(override || {}) };
  const css: CSSProperties = {};
  if (s.overlay) css.background = s.overlay;
  if (s.backdropBlur) css.backdropFilter = `blur(${s.backdropBlur})`;
  return css;
}

export function textboxStyle(override: UiTextboxStyle | undefined): CSSProperties {
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
  if (s.borderColor && s.borderWidth) css.border = `${s.borderWidth} solid ${s.borderColor}`;
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

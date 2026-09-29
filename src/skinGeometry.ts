import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import type { UiContentBounds, UiResponsiveSkin } from "./types";

export type SkinGeometryVariables = CSSProperties & Record<`--${string}`, string>;

const FULL_BOUNDS: UiContentBounds = { left: 0, top: 0, right: 1, bottom: 1 };

/**
 * Conservative normalized content rectangles for generated assets that were
 * saved before safeBounds metadata existed.  New/edited assets override these
 * with their measured and author-marked bounds.
 */
export const SKIN_SAFE_PRESETS = {
  dialog: { left: 0.16, top: 0.34, right: 0.94, bottom: 0.86 },
  panel: { left: 0.06, top: 0.14, right: 0.88, bottom: 0.90 },
  settings: { left: 0.10, top: 0.12, right: 0.90, bottom: 0.90 },
  saveSlot: { left: 0.06, top: 0.06, right: 0.94, bottom: 0.94 },
  backlogEntry: { left: 0.06, top: 0.14, right: 0.94, bottom: 0.86 },
  endingCard: { left: 0.10, top: 0.10, right: 0.90, bottom: 0.90 },
  systemCard: { left: 0.10, top: 0.14, right: 0.90, bottom: 0.86 },
} satisfies Record<string, UiContentBounds>;

function clamp(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function normalizedBounds(
  value: UiContentBounds | undefined,
  fallback: UiContentBounds = FULL_BOUNDS,
): UiContentBounds {
  const left = clamp(value?.left ?? fallback.left, fallback.left);
  const top = clamp(value?.top ?? fallback.top, fallback.top);
  const right = clamp(value?.right ?? fallback.right, fallback.right);
  const bottom = clamp(value?.bottom ?? fallback.bottom, fallback.bottom);
  return {
    left: Math.min(left, right),
    top: Math.min(top, bottom),
    right: Math.max(left, right),
    bottom: Math.max(top, bottom),
  };
}

function parseSourceSize(value: string | undefined): [number, number] | undefined {
  const match = value?.match(/^(\d+)x(\d+)$/);
  if (!match) return undefined;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? [width, height] : undefined;
}

function backgroundOffset(
  position: string | undefined,
  freeWidth: number,
  freeHeight: number,
): [number, number] {
  const normalized = (position || "center").toLowerCase();
  const x = normalized.includes("left") ? 0 : normalized.includes("right") ? freeWidth : freeWidth / 2;
  const y = normalized.includes("top") ? 0 : normalized.includes("bottom") ? freeHeight : freeHeight / 2;
  return [x, y];
}

function px(value: number): string {
  return `${Math.max(0, value).toFixed(2)}px`;
}

export function useSkinGeometryVariables(
  elementRef: RefObject<HTMLElement | null>,
  skin: UiResponsiveSkin | undefined,
  refreshKey?: unknown,
  fallbackSafeBounds?: UiContentBounds,
): SkinGeometryVariables {
  const [variables, setVariables] = useState<SkinGeometryVariables>({});

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !skin) {
      // Geometry is a layout measurement: clear/measure before the browser
      // paints. Deferring a frame exposes the fallback nameplate position.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVariables({});
      return;
    }
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => {
      const mobile = media.matches;
      const sourceSize = parseSourceSize(mobile ? skin.mobileSourceSize : skin.sourceSize);
      const rect = element.getBoundingClientRect();
      if (!sourceSize || rect.width <= 0 || rect.height <= 0) {
        setVariables({});
        return;
      }
      const [sourceWidth, sourceHeight] = sourceSize;
      const scale = skin.fit === "cover"
        ? Math.max(rect.width / sourceWidth, rect.height / sourceHeight)
        : Math.min(rect.width / sourceWidth, rect.height / sourceHeight);
      const renderedWidth = sourceWidth * scale;
      const renderedHeight = sourceHeight * scale;
      const [offsetX, offsetY] = backgroundOffset(
        skin.position,
        rect.width - renderedWidth,
        rect.height - renderedHeight,
      );
      const visible = normalizedBounds(
        mobile ? (skin.mobileContentBounds || skin.contentBounds) : skin.contentBounds,
      );
      const safe = normalizedBounds(
        mobile ? (skin.mobileSafeBounds || skin.safeBounds || fallbackSafeBounds) : (skin.safeBounds || fallbackSafeBounds),
        fallbackSafeBounds || visible,
      );
      const visibleLeft = offsetX + renderedWidth * visible.left;
      const visibleTop = offsetY + renderedHeight * visible.top;
      const visibleRight = rect.width - (offsetX + renderedWidth * visible.right);
      const visibleBottom = rect.height - (offsetY + renderedHeight * visible.bottom);
      const safeLeft = offsetX + renderedWidth * safe.left;
      const safeTop = offsetY + renderedHeight * safe.top;
      const safeRight = rect.width - (offsetX + renderedWidth * safe.right);
      const safeBottom = rect.height - (offsetY + renderedHeight * safe.bottom);
      setVariables({
        "--ui-skin-visible-top": px(visibleTop),
        "--ui-skin-visible-right": px(visibleRight),
        "--ui-skin-visible-bottom": px(visibleBottom),
        "--ui-skin-visible-left": px(visibleLeft),
        "--runtime-dialog-visible-top": px(visibleTop),
        "--runtime-dialog-visible-right": px(visibleRight),
        "--runtime-dialog-visible-bottom": px(visibleBottom),
        "--runtime-dialog-visible-left": px(visibleLeft),
        // Generated decorations occasionally extend farther into the top-right
        // corner than the author marker.  Keep the independent toolbar out of
        // that corner without resizing or stretching the bitmap.
        "--runtime-dialog-toolbar-right": px(Math.max(safeRight, rect.width * (mobile ? 0.18 : 0.24))),
        "--ui-skin-safe-top": px(Math.max(visibleTop, safeTop)),
        "--ui-skin-safe-right": px(Math.max(visibleRight, safeRight)),
        "--ui-skin-safe-bottom": px(Math.max(visibleBottom, safeBottom)),
        "--ui-skin-safe-left": px(Math.max(visibleLeft, safeLeft)),
        "--ui-skin-aspect": `${sourceWidth} / ${sourceHeight}`,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    media.addEventListener("change", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, [elementRef, fallbackSafeBounds, refreshKey, skin]);

  return variables;
}

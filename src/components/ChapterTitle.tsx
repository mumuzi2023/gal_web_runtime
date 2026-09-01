import { useRef } from "react";
import { useGameStore } from "../store";
import { panelStyle } from "../uiConfig";
import { SKIN_SAFE_PRESETS, useSkinGeometryVariables } from "../skinGeometry";

export default function ChapterTitle() {
  const show = useGameStore((s) => s.showChapterTitle);
  const title = useGameStore((s) => s.chapterTitle);
  const subtitle = useGameStore((s) => s.chapterSubtitle);
  const dismiss = useGameStore((s) => s.dismissChapterTitle);
  const chapterStyle = useGameStore((s) => (s.gameData?.ui || s.gameData?.config?.ui)?.pages?.system?.chapterCard);
  const cardRef = useRef<HTMLDivElement>(null);
  const geometry = useSkinGeometryVariables(cardRef, chapterStyle?.skin, show, SKIN_SAFE_PRESETS.systemCard);

  if (!show) return null;

  return (
    <button
      type="button"
      className="chapter-card-layer animate-[fadeIn_0.5s_ease-out]"
      onClick={dismiss}
      aria-label="关闭章节标题"
    >
      <div ref={cardRef} className={`chapter-card ui-responsive-skin ${chapterStyle?.skin ? "has-ui-skin" : ""}`} style={{ ...panelStyle(chapterStyle, {}), ...geometry }}>
        <h1 className="animate-[fadeSlideIn_0.8s_ease-out]">
          {title}
        </h1>
        {subtitle && (
          <p className="animate-[fadeSlideIn_1s_ease-out]">
            {subtitle}
          </p>
        )}
      </div>
    </button>
  );
}

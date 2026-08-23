import { useGameStore } from "../store";

export default function ChapterTitle() {
  const show = useGameStore((s) => s.showChapterTitle);
  const title = useGameStore((s) => s.chapterTitle);
  const subtitle = useGameStore((s) => s.chapterSubtitle);
  const dismiss = useGameStore((s) => s.dismissChapterTitle);

  if (!show) return null;

  return (
    <button
      type="button"
      className="chapter-card-layer animate-[fadeIn_0.5s_ease-out]"
      onClick={dismiss}
      aria-label="关闭章节标题"
    >
      <div className="chapter-card">
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

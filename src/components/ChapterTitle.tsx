import { useGameStore } from "../store";

export default function ChapterTitle() {
  const show = useGameStore((s) => s.showChapterTitle);
  const title = useGameStore((s) => s.chapterTitle);
  const subtitle = useGameStore((s) => s.chapterSubtitle);
  const dismiss = useGameStore((s) => s.dismissChapterTitle);

  if (!show) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 animate-[fadeIn_0.5s_ease-out]"
      onClick={dismiss}
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white tracking-wider mb-2 animate-[fadeSlideIn_0.8s_ease-out]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg text-white/70 tracking-wide animate-[fadeSlideIn_1s_ease-out]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

import { useRef, useEffect } from "react";
import { useGameStore } from "../store";

export default function BacklogPanel() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const backlog = useGameStore((s) => s.backlog);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [backlog.length]);

  if (screen !== "backlog") return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">对话记录</h2>
        <button
          onClick={() => setScreen("game")}
          className="text-white/60 hover:text-white transition text-sm"
        >
          ✕ 关闭
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 backlog-scroll">
        {backlog.length === 0 ? (
          <p className="text-white/30 text-center mt-8">暂无记录</p>
        ) : (
          <div className="space-y-3">
            {backlog.map((entry, i) => (
              <div key={i} className="text-sm">
                {entry.characterName ? (
                  <>
                    <span
                      className="font-bold mr-2"
                      style={{ color: entry.characterColor || "#fff" }}
                    >
                      {entry.characterName}
                    </span>
                    <span className="text-white/80">{entry.text}</span>
                  </>
                ) : (
                  <span className="text-white/60 italic">{entry.text}</span>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

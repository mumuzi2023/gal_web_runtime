import { useRef, useEffect } from "react";
import { useGameStore } from "../store";

export default function BacklogPanel() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const backlog = useGameStore((s) => s.backlog);
  const background = useGameStore((s) => s.background);
  const gameData = useGameStore((s) => s.gameData);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [backlog.length]);

  if (screen !== "backlog") return null;

  const resolveAvatar = (charKey: string | undefined): string => {
    if (!charKey || !gameData) return "";
    const charDef = gameData.characters[charKey];
    if (!charDef) return "";
    const manifest = gameData._asset_manifest;
    const raw =
      charDef.expressions["normal"] ||
      Object.values(charDef.expressions)[0] ||
      "";
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    return manifest?.[raw] || raw;
  };

  // Determine if we need a separator between entries
  const needsSeparator = (i: number): boolean => {
    if (i === 0) return false;
    const prev = backlog[i - 1];
    const curr = backlog[i];
    // Different character, or one is narration
    return prev.character !== curr.character || !prev.character || !curr.character;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      {/* Background image */}
      {background && (
        <img src={background} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" />

      <div className="relative flex flex-col h-full">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">对话记录</h2>
          <button
            onClick={() => setScreen("game")}
            className="text-gray-500 hover:text-gray-800 transition text-sm"
          >
            ✕ 关闭
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 backlog-scroll">
          {backlog.length === 0 ? (
            <p className="text-gray-400 text-center mt-8">暂无记录</p>
          ) : (
            <div className="space-y-1">
              {backlog.map((entry, i) => (
                <div key={i}>
                  {needsSeparator(i) && (
                    <div className="flex items-center my-3">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    </div>
                  )}
                  <div className="flex items-start gap-3 py-1.5">
                    {/* Avatar */}
                    {entry.character ? (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                        {resolveAvatar(entry.character) ? (
                          <img
                            src={resolveAvatar(entry.character)}
                            alt={entry.characterName || ""}
                            className="w-full h-full object-cover object-top"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            {(entry.characterName || "?")[0]}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                        ✦
                      </div>
                    )}

                    {/* Text content */}
                    <div className="flex-1 text-sm min-w-0">
                      {entry.characterName ? (
                        <>
                          <span
                            className="font-bold mr-2"
                            style={{ color: entry.characterColor || "#333" }}
                          >
                            {entry.characterName}
                          </span>
                          <span className="text-gray-700">{entry.text}</span>
                        </>
                      ) : (
                        <span className="text-gray-500 italic">{entry.text}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

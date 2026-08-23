import { useRef, useEffect } from "react";
import { useGameStore } from "../store";

export default function BacklogPanel() {
  const screen = useGameStore((s) => s.screen);
  const closeOverlay = useGameStore((s) => s.closeOverlay);
  const playVoice = useGameStore((s) => s.playVoice);
  const backlog = useGameStore((s) => s.backlog);
  const gameData = useGameStore((s) => s.gameData);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [backlog.length]);

  if (screen !== "backlog") return null;

  const resolveAvatar = (charKey: string | undefined, outfitId?: string): string => {
    if (!charKey || !gameData) return "";
    const charDef = gameData.characters[charKey];
    if (!charDef) return "";
    const manifest = gameData._asset_manifest;
    const outfit = charDef.outfits?.[outfitId || charDef.default_outfit || "default"];
    const expressions = outfit?.expressions || charDef.expressions;
    const raw =
      expressions["normal"] ||
      Object.values(expressions)[0] ||
      "";
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    return manifest?.[raw] || raw;
  };

  const needsSeparator = (i: number): boolean => {
    if (i === 0) return false;
    const prev = backlog[i - 1];
    const curr = backlog[i];
    return prev.character !== curr.character || !prev.character || !curr.character;
  };

  return (
    <div className="runtime-overlay" role="dialog" aria-modal="true" aria-labelledby="backlog-title">
      <div className="runtime-overlay__scrim" />
      <section className="runtime-overlay__surface backlog-surface">
        <header className="runtime-overlay__header">
          <div>
            <h2 id="backlog-title" className="runtime-overlay__title">对话记录</h2>
            <div className="runtime-overlay__subtitle">回看已经播放过的台词和旁白</div>
          </div>
          <button onClick={closeOverlay} className="runtime-overlay__close" aria-label="关闭记录">✕</button>
        </header>

        <div className="runtime-overlay__body backlog-scroll backlog-list">
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
                  <article className="backlog-entry">
                    {entry.character ? (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                        {resolveAvatar(entry.character, entry.outfitId) ? (
                          <img
                            src={resolveAvatar(entry.character, entry.outfitId)}
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

                    <div className="backlog-entry__copy">
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
                    {entry.voice && (
                      <button
                        type="button"
                        className="backlog-entry__voice"
                        onClick={() => playVoice(entry.voice || "")}
                        aria-label={`重播${entry.characterName || "旁白"}的语音`}
                      >
                        ▶
                      </button>
                    )}
                  </article>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

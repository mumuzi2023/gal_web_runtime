import { useRef, useEffect, type CSSProperties } from "react";
import { useGameStore } from "../store";
import { resolveAssetUrl } from "../assets";
import { SKIN_SAFE_PRESETS, useSkinGeometryVariables } from "../skinGeometry";
import {
  defaultLightPanel,
  panelOverlayStyle,
  panelStyle,
  resolvePanelUi,
  responsiveSkinStyle,
} from "../uiConfig";

export default function BacklogPanel() {
  const screen = useGameStore((s) => s.screen);
  const closeOverlay = useGameStore((s) => s.closeOverlay);
  const playVoice = useGameStore((s) => s.playVoice);
  const backlog = useGameStore((s) => s.backlog);
  const gameData = useGameStore((s) => s.gameData);
  const bottomRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [backlog.length]);

  const ui = gameData?.ui || gameData?.config?.ui;
  const pageCfg = ui?.pages?.backlog;
  const surfaceCfg = resolvePanelUi(ui, "backlog");
  const surfaceGeometry = useSkinGeometryVariables(surfaceRef, surfaceCfg?.skin, screen, SKIN_SAFE_PRESETS.panel);

  if (screen !== "backlog") return null;
  const surfaceCss = panelStyle(surfaceCfg, defaultLightPanel);
  const overlayCss = panelOverlayStyle(surfaceCfg, defaultLightPanel);
  const pageCss = responsiveSkinStyle(pageCfg?.pageBackground);
  const backlogLayout = pageCfg?.layout;
  const listCss = {
    "--backlog-list-inset": backlogLayout?.contentInset || "0px",
    "--backlog-row-gap": backlogLayout?.rowGap || "4px",
    "--backlog-avatar-size": backlogLayout?.avatarSize || "36px",
  } as CSSProperties;
  const showAvatars = backlogLayout?.showAvatars !== false;
  const inlineSpeaker = backlogLayout?.speakerLayout === "inline";

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
    return resolveAssetUrl(raw, manifest);
  };

  const needsSeparator = (i: number): boolean => {
    if (i === 0) return false;
    const prev = backlog[i - 1];
    const curr = backlog[i];
    return prev.character !== curr.character || !prev.character || !curr.character;
  };

  return (
    <div className="runtime-overlay ui-responsive-skin" style={pageCss} role="dialog" aria-modal="true" aria-labelledby="backlog-title">
      <div className="runtime-overlay__scrim" style={overlayCss} />
      <section ref={surfaceRef} className={`runtime-overlay__surface backlog-surface ui-responsive-skin ${surfaceCfg?.skin || surfaceCfg?.backgroundImage ? "has-ui-skin" : ""}`} style={{ ...surfaceCss, ...surfaceGeometry }}>
        <header className="runtime-overlay__header">
          <div>
            <h2 id="backlog-title" className="runtime-overlay__title">对话记录</h2>
            <div className="runtime-overlay__subtitle">回看已经播放过的台词和旁白</div>
          </div>
          <button onClick={closeOverlay} className="runtime-overlay__close" aria-label="关闭记录">✕</button>
        </header>

        <div className="runtime-overlay__body backlog-scroll backlog-list" style={listCss}>
          {backlog.length === 0 ? (
            <p className="text-gray-400 text-center mt-8">暂无记录</p>
          ) : (
            <div className="backlog-entries">
              {backlog.map((entry, i) => (
                <div key={i} className="backlog-entry-wrap">
                  {needsSeparator(i) && (
                    <div className="backlog-separator" aria-hidden="true" />
                  )}
                  <article className="backlog-entry">
                    {showAvatars && (entry.character ? (
                      <div className="backlog-entry__avatar">
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
                      <div className="backlog-entry__avatar backlog-entry__avatar--narration">
                        ✦
                      </div>
                    ))}

                    <div className={`backlog-entry__copy ${inlineSpeaker ? "is-inline" : ""}`}>
                      {entry.characterName ? (
                        <>
                          <span
                            className="backlog-entry__speaker"
                            style={{ color: entry.characterColor || "#333" }}
                          >
                            {entry.characterName}
                          </span>
                          <span className="backlog-entry__text">{entry.text}</span>
                        </>
                      ) : (
                        <span className="backlog-entry__text backlog-entry__text--narration">{entry.text}</span>
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

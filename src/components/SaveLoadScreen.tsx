import { useGameStore } from "../store";
import {
  defaultLightPanel,
  panelOverlayStyle,
  panelStyle,
  resolvePanelUi,
  responsiveSkinStyle,
} from "../uiConfig";
import type { CSSProperties } from "react";
import { resolveAssetUrl } from "../assets";

export default function SaveLoadScreen() {
  const screen = useGameStore((s) => s.screen);
  const closeOverlay = useGameStore((s) => s.closeOverlay);
  const saves = useGameStore((s) => s.saves);
  const saveGame = useGameStore((s) => s.saveGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const gameData = useGameStore((s) => s.gameData);

  if (screen !== "save" && screen !== "load") return null;

  const isSave = screen === "save";
  const ui = gameData?.ui || gameData?.config?.ui;
  const pageCfg = ui?.pages?.saveLoad;
  const surfaceCfg = resolvePanelUi(ui, "saveLoad");
  const surfaceCss = panelStyle(surfaceCfg, defaultLightPanel);
  const overlayCss = panelOverlayStyle(surfaceCfg, defaultLightPanel);
  const pageCss = responsiveSkinStyle(pageCfg?.pageBackground);
  const slotCss = pageCfg?.slot ? panelStyle(pageCfg.slot, {}) : undefined;
  const layoutCss = {
    "--save-columns-desktop": String(pageCfg?.desktopColumns || 4),
    "--save-columns-mobile": String(pageCfg?.mobileColumns || 2),
    "--save-thumbnail-ratio": pageCfg?.thumbnailRatio || "16 / 9",
  } as CSSProperties;
  const handleSlotClick = (slotId: number) => {
    if (isSave) {
      saveGame(slotId);
    } else if (saves[slotId]) {
      loadGame(slotId);
    }
  };

  const resolveExpression = (charKey: string, expr: string, outfitId?: string): string => {
    if (!gameData) return "";
    const charDef = gameData.characters[charKey];
    if (!charDef) return "";
    const manifest = gameData._asset_manifest;
    const outfit = charDef.outfits?.[outfitId || charDef.default_outfit || "default"];
    const expressions = outfit?.expressions || charDef.expressions;
    const raw =
      expressions[expr] ||
      expressions["normal"] ||
      Object.values(expressions)[0] ||
      "";
    return resolveAssetUrl(raw, manifest);
  };

  return (
    <div className="runtime-overlay ui-responsive-skin" style={pageCss} role="dialog" aria-modal="true" aria-labelledby="save-load-title">
      <div className="runtime-overlay__scrim" style={overlayCss} />
      <section className={`runtime-overlay__surface save-load-surface ui-responsive-skin ${surfaceCfg?.skin || surfaceCfg?.backgroundImage ? "has-ui-skin" : ""}`} style={surfaceCss}>
        <header className="runtime-overlay__header">
          <div>
            <h2 id="save-load-title" className="runtime-overlay__title">{isSave ? "保存进度" : "读取进度"}</h2>
            <div className="runtime-overlay__subtitle">{isSave ? "选择一个位置保存当前场景" : "从已有记录继续故事"}</div>
          </div>
          <button onClick={closeOverlay} className="runtime-overlay__close" aria-label="关闭">✕</button>
        </header>

        <div className="runtime-overlay__body save-slot-grid backlog-scroll" style={layoutCss}>
          {saves.map((slot, i) => (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              className={`save-slot ui-responsive-skin ${
                slot
                  ? "save-slot--filled"
                  : "save-slot--empty"
              } ${!slot && !isSave ? "save-slot--disabled" : ""}`}
              style={slotCss}
              disabled={!slot && !isSave}
            >
              {/* Thumbnail area */}
              <div className="save-slot__preview">
                {slot?.background ? (
                  <>
                    <img
                      src={slot.background}
                      alt=""
                      className="w-full h-full object-cover opacity-80"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="absolute inset-0">
                      {slot.characters.map((vc) => {
                        const spriteUrl = resolveExpression(vc.key, vc.expression, vc.outfitId);
                        if (!spriteUrl) return null;
                        const posStyle: React.CSSProperties = {
                          position: "absolute",
                          bottom: 0,
                          height: "90%",
                        };
                        if (vc.position === "right") posStyle.right = "10%";
                        else posStyle.left = "10%";
                        return (
                          <img
                            key={vc.key}
                            src={spriteUrl}
                            alt=""
                            style={posStyle}
                            className="object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-lg">
                    {slot ? "" : ""}
                  </div>
                )}
              </div>

              {/* Slot info */}
              <div className="save-slot__info">
                <div className="save-slot__meta">
                  <span>No.{i + 1}</span>
                  {slot && (
                    <time>
                      {new Date(slot.timestamp).toLocaleString("zh-CN", {
                        month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </time>
                  )}
                </div>
                {slot ? (
                  <div>
                    <div className="save-slot__scene">{slot.title || slot.sceneKey}</div>
                    <div className="save-slot__description">{slot.description || "已保存的剧情位置"}</div>
                  </div>
                ) : (
                  <div className="save-slot__empty-label">空位置</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

import { useGameStore } from "../store";
import {
  defaultLightPanel,
  panelOverlayStyle,
  panelStyle,
  resolvePanelUi,
  responsiveSkinStyle,
} from "../uiConfig";

export default function EndingsScreen() {
  const screen = useGameStore((s) => s.screen);
  const closeOverlay = useGameStore((s) => s.closeOverlay);
  const gameData = useGameStore((s) => s.gameData);
  const reachedEndings = useGameStore((s) => s.reachedEndings);

  if (screen !== "endings" || !gameData) return null;

  const allEndings = Object.entries(gameData.endings);
  const ui = gameData.ui || gameData.config?.ui;
  const pageCfg = ui?.pages?.endings;
  const surfaceCfg = resolvePanelUi(ui, "endings");
  const surfaceCss = panelStyle(surfaceCfg, defaultLightPanel);
  const overlayCss = panelOverlayStyle(surfaceCfg, defaultLightPanel);
  const pageCss = responsiveSkinStyle(pageCfg?.pageBackground);
  const cardCss = pageCfg?.card ? panelStyle(pageCfg.card, {}) : undefined;
  return (
    <div className="runtime-overlay ui-responsive-skin" style={pageCss} role="dialog" aria-modal="true" aria-labelledby="endings-title">
      <div className="runtime-overlay__scrim" style={overlayCss} />
      <section className={`runtime-overlay__surface endings-surface ui-responsive-skin ${surfaceCfg?.skin || surfaceCfg?.backgroundImage ? "has-ui-skin" : ""}`} style={surfaceCss}>
        <header className="runtime-overlay__header">
          <div>
            <h2 id="endings-title" className="runtime-overlay__title">结局收藏</h2>
            <div className="runtime-overlay__subtitle">{reachedEndings.length} / {allEndings.length} 已达成</div>
          </div>
          <button onClick={closeOverlay} className="runtime-overlay__close" aria-label="关闭结局列表">✕</button>
        </header>

        <div className="runtime-overlay__body endings-grid">
            {allEndings.map(([id, def]) => {
              const reached = reachedEndings.includes(id);
              return (
                <article
                  key={id}
                  className={`ending-card ui-responsive-skin ${reached ? "ending-card--reached" : "ending-card--locked"}`}
                  style={{
                    ...cardCss,
                    borderColor: reached ? pageCfg?.reachedAccent : pageCfg?.lockedAccent,
                  }}
                >
                  <div className="ending-card__icon">
                      {reached ? "★" : "☆"}
                  </div>
                  <div>
                    <div className="ending-card__label">{reached ? "已达成" : "尚未解锁"}</div>
                    <div className="ending-card__name">
                      {reached ? def.name : "？？？"}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>
    </div>
  );
}

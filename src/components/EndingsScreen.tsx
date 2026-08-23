import { useGameStore } from "../store";

export default function EndingsScreen() {
  const screen = useGameStore((s) => s.screen);
  const closeOverlay = useGameStore((s) => s.closeOverlay);
  const gameData = useGameStore((s) => s.gameData);
  const reachedEndings = useGameStore((s) => s.reachedEndings);

  if (screen !== "endings" || !gameData) return null;

  const allEndings = Object.entries(gameData.endings);
  return (
    <div className="runtime-overlay" role="dialog" aria-modal="true" aria-labelledby="endings-title">
      <div className="runtime-overlay__scrim" />
      <section className="runtime-overlay__surface endings-surface">
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
                  className={`ending-card ${reached ? "ending-card--reached" : "ending-card--locked"}`}
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

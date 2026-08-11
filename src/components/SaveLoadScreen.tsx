import { useGameStore, resolveOverlayBackground } from "../store";
import { panelOverlayStyle, defaultLightPanel } from "../uiConfig";

export default function SaveLoadScreen() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const saves = useGameStore((s) => s.saves);
  const saveGame = useGameStore((s) => s.saveGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const background = useGameStore((s) => s.background);
  const gameData = useGameStore((s) => s.gameData);

  if (screen !== "save" && screen !== "load") return null;

  const isSave = screen === "save";
  const panelCfg = gameData?.config?.ui?.saveLoadPanel;
  const overlayCss = panelOverlayStyle(panelCfg, defaultLightPanel);
  const bgUrl = resolveOverlayBackground(background, gameData);

  const handleSlotClick = (slotId: number) => {
    if (isSave) {
      saveGame(slotId);
    } else if (saves[slotId]) {
      loadGame(slotId);
    }
  };

  const resolveExpression = (charKey: string, expr: string): string => {
    if (!gameData) return "";
    const charDef = gameData.characters[charKey];
    if (!charDef) return "";
    const manifest = gameData._asset_manifest;
    const raw =
      charDef.expressions[expr] ||
      charDef.expressions["normal"] ||
      Object.values(charDef.expressions)[0] ||
      "";
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    return manifest?.[raw] || raw;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center">
      {bgUrl && (
        <img src={bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
      )}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" style={overlayCss} />

      <div className="relative w-full max-w-4xl px-6 py-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white/90">{isSave ? "存档" : "读档"}</h2>
          <button onClick={() => setScreen("game")} className="text-white/50 hover:text-white/90 transition text-sm cursor-pointer">
            ✕ 关闭
          </button>
        </div>

        {/* Grid — 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 overflow-y-auto backlog-scroll">
          {saves.map((slot, i) => (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              className={`text-left rounded-lg transition overflow-hidden flex flex-col ${
                slot
                  ? "bg-black/50 border border-white/15 hover:border-white/40 hover:bg-black/60"
                  : "bg-black/30 border border-dashed border-white/10 hover:border-white/30"
              } ${!slot && !isSave ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              disabled={!slot && !isSave}
            >
              {/* Thumbnail area */}
              <div className="relative w-full h-20 bg-black/40 overflow-hidden">
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
                        const spriteUrl = resolveExpression(vc.key, vc.expression);
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
              <div className="p-2.5 flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/70 text-xs font-medium">No.{i + 1}</span>
                  {slot && (
                    <span className="text-white/40 text-[10px]">
                      {new Date(slot.timestamp).toLocaleString("zh-CN", {
                        month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                {slot ? (
                  <div>
                    <div className="text-white/50 text-[11px] truncate">{slot.sceneKey}</div>
                    <div className="text-white/30 text-[10px] truncate mt-0.5">{slot.description}</div>
                  </div>
                ) : (
                  <div className="text-white/20 text-[11px]">— 空 —</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

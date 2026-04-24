import { useGameStore } from "../store";
import { panelStyle, panelOverlayStyle, defaultLightPanel } from "../uiConfig";

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
  const panelCss = panelStyle(panelCfg, defaultLightPanel);
  const overlayCss = panelOverlayStyle(panelCfg, defaultLightPanel);

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
      {background && (
        <img src={background} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0" style={overlayCss} />

      <div className="relative w-full max-w-3xl px-6 py-8">
        <div style={panelCss}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{isSave ? "存档" : "读档"}</h2>
            <button onClick={() => setScreen("game")} className="opacity-60 hover:opacity-100 transition text-sm">
              ✕ 关闭
            </button>
          </div>

          {/* Use a fixed height tied to the virtual canvas — was previously 70vh which leaked the real viewport */}
          <div className="grid grid-cols-2 gap-3 max-h-[760px] overflow-y-auto backlog-scroll">
            {saves.map((slot, i) => (
              <button
                key={i}
                onClick={() => handleSlotClick(i)}
                className={`text-left rounded-lg border transition overflow-hidden ${
                  slot
                    ? "border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                } ${!slot && !isSave ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                disabled={!slot && !isSave}
              >
                <div className="relative w-full h-24 bg-gray-100 overflow-hidden">
                  {slot?.background ? (
                    <>
                      <img
                        src={slot.background}
                        alt=""
                        className="w-full h-full object-cover"
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
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
                      {slot ? "📷" : ""}
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-700 text-sm font-medium">存档位 {i + 1}</span>
                    {slot && (
                      <span className="text-gray-400 text-xs">
                        {new Date(slot.timestamp).toLocaleString("zh-CN", {
                          month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  {slot ? (
                    <div>
                      <div className="text-gray-600 text-xs truncate">{slot.sceneKey}</div>
                      <div className="text-gray-400 text-xs truncate mt-0.5">{slot.description}</div>
                    </div>
                  ) : (
                    <div className="text-gray-300 text-xs">— 空 —</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

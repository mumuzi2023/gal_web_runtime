import { useGameStore } from "../store";

export default function SaveLoadScreen() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const saves = useGameStore((s) => s.saves);
  const saveGame = useGameStore((s) => s.saveGame);
  const loadGame = useGameStore((s) => s.loadGame);

  if (screen !== "save" && screen !== "load") return null;

  const isSave = screen === "save";

  const handleSlotClick = (slotId: number) => {
    if (isSave) {
      saveGame(slotId);
    } else {
      if (saves[slotId]) {
        loadGame(slotId);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {isSave ? "存档" : "读档"}
          </h2>
          <button
            onClick={() => setScreen("game")}
            className="text-white/60 hover:text-white transition text-sm"
          >
            ✕ 关闭
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto backlog-scroll">
          {saves.map((slot, i) => (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              className={`text-left p-3 rounded border transition ${
                slot
                  ? "border-white/20 bg-white/5 hover:bg-white/10"
                  : "border-white/10 bg-white/2 hover:bg-white/5"
              } ${!slot && !isSave ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              disabled={!slot && !isSave}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-white/80 text-sm font-medium">
                  Slot {i + 1}
                </span>
                {slot && (
                  <span className="text-white/40 text-xs">
                    {new Date(slot.timestamp).toLocaleString("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {slot ? (
                <div>
                  <div className="text-white/60 text-xs truncate">
                    {slot.sceneKey}
                  </div>
                  <div className="text-white/40 text-xs truncate mt-0.5">
                    {slot.description}
                  </div>
                </div>
              ) : (
                <div className="text-white/30 text-xs">— 空 —</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

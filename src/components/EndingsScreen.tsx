import { useGameStore } from "../store";

export default function EndingsScreen() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const gameData = useGameStore((s) => s.gameData);
  const reachedEndings = useGameStore((s) => s.reachedEndings);

  if (screen !== "endings" || !gameData) return null;

  const allEndings = Object.entries(gameData.endings);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-lg px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">结局列表</h2>
          <button
            onClick={() => setScreen("title")}
            className="text-white/60 hover:text-white transition text-sm"
          >
            ✕ 关闭
          </button>
        </div>

        <div className="space-y-3">
          {allEndings.map(([id, def]) => {
            const reached = reachedEndings.includes(id);
            return (
              <div
                key={id}
                className={`p-4 rounded border ${
                  reached
                    ? "border-yellow-400/40 bg-yellow-400/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={reached ? "text-yellow-400" : "text-white/30"}>
                    {reached ? "★" : "☆"}
                  </span>
                  <span
                    className={`font-medium ${
                      reached ? "text-white" : "text-white/40"
                    }`}
                  >
                    {reached ? def.name : "？？？"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center text-white/40 text-sm">
          {reachedEndings.length} / {allEndings.length} 已达成
        </div>
      </div>
    </div>
  );
}

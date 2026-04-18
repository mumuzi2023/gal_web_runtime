import { useGameStore } from "../store";

export default function EndingsScreen() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const gameData = useGameStore((s) => s.gameData);
  const reachedEndings = useGameStore((s) => s.reachedEndings);
  const background = useGameStore((s) => s.background);

  if (screen !== "endings" || !gameData) return null;

  const allEndings = Object.entries(gameData.endings);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center">
      {/* Background image */}
      {background && (
        <img src={background} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" />

      <div className="relative w-full max-w-lg px-6 py-8">
        <div className="bg-white/90 rounded-xl border border-gray-200 shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">结局列表</h2>
            <button
              onClick={() => setScreen("title")}
              className="text-gray-500 hover:text-gray-800 transition text-sm"
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
                  className={`p-4 rounded-lg border ${
                    reached
                      ? "border-amber-300 bg-amber-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={reached ? "text-amber-500" : "text-gray-300"}>
                      {reached ? "★" : "☆"}
                    </span>
                    <span
                      className={`font-medium ${
                        reached ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {reached ? def.name : "？？？"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center text-gray-500 text-sm">
            {reachedEndings.length} / {allEndings.length} 已达成
          </div>
        </div>
      </div>
    </div>
  );
}

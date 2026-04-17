import { useGameStore } from "../store";

export default function TitleScreen() {
  const gameData = useGameStore((s) => s.gameData);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const saves = useGameStore((s) => s.saves);

  if (!gameData) return null;

  const hasSaves = saves.some((s) => s !== null);
  const meta = gameData.meta;

  // Use the first scene's background as title background if available
  const firstScene = Object.values(gameData.scenes)[0];
  const titleBg = firstScene?.background || "";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Background */}
      {titleBg && (
        <img
          src={titleBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />

      {/* Title content */}
      <div className="relative z-10 text-center mb-12">
        <h1 className="text-5xl font-bold text-white tracking-widest drop-shadow-lg mb-4">
          {meta.title}
        </h1>
        {meta.description && (
          <p className="text-white/60 text-sm max-w-md mx-auto leading-relaxed line-clamp-3">
            {meta.description.slice(0, 120)}
            {meta.description.length > 120 ? "..." : ""}
          </p>
        )}
      </div>

      {/* Menu buttons */}
      <div className="relative z-10 flex flex-col gap-3 w-64">
        <MenuButton onClick={startNewGame}>新游戏</MenuButton>
        {hasSaves && (
          <MenuButton onClick={() => setScreen("load")}>继续游戏</MenuButton>
        )}
        <MenuButton onClick={() => setScreen("settings")}>设置</MenuButton>
        <MenuButton onClick={() => setScreen("endings")}>结局列表</MenuButton>
      </div>

      {/* Version */}
      <div className="absolute bottom-4 right-4 text-white/30 text-xs">
        v{meta.version} | {meta.author}
      </div>
    </div>
  );
}

function MenuButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="py-3 px-6 text-white/90 text-lg tracking-wider rounded-md
        bg-white/10 border border-white/20 backdrop-blur-sm
        hover:bg-white/20 hover:border-white/40 hover:scale-105
        transition-all duration-300 cursor-pointer"
    >
      {children}
    </button>
  );
}

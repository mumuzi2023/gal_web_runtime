import { useGameStore } from "../store";

// Characters are restricted to two anchors. Everything else collapses to "left".
const positionMap: Record<string, string> = {
  left: "left-[8%]",
  right: "right-[8%]",
};

export default function BackgroundLayer() {
  const background = useGameStore((s) => s.background);
  const visibleCharacters = useGameStore((s) => s.visibleCharacters);
  const gameData = useGameStore((s) => s.gameData);
  const currentCharacter = useGameStore((s) => s.currentCharacter);
  const shaking = useGameStore((s) => s.shaking);
  const flashing = useGameStore((s) => s.flashing);
  const flashColor = useGameStore((s) => s.flashColor);
  const effectType = useGameStore((s) => s.effectType);
  const cgSrc = useGameStore((s) => s.cgSrc);
  const cgMode = useGameStore((s) => s.cgMode);

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

  // Determine speaking character key from display name
  const speakingKey = currentCharacter
    ? Object.entries(gameData?.characters || {}).find(
        ([, v]) => v.name === currentCharacter
      )?.[0]
    : null;

  return (
    <div className={`absolute inset-0 ${shaking ? "screen-shake" : ""}`}>
      {/* Background image */}
      {background && (
        <img
          key={background}
          src={background}
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-[fadeIn_0.8s_ease-out]"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Effect particles */}
      {effectType && <EffectParticles type={effectType} />}

      {/* Character sprites — left or right only, leaves the centre clear for CG */}
      <div className="absolute inset-0">
        {visibleCharacters.map((vc) => {
          const spriteUrl = resolveExpression(vc.key, vc.expression);
          const side = vc.position === "right" ? "right" : "left";
          const pos = positionMap[side];
          const isSpeaking = vc.key === speakingKey;

          return (
            <div
              key={vc.key}
              className={`absolute bottom-[12%] ${pos} h-[78%] transition-all duration-300 origin-bottom
                ${vc.entering ? "character-enter" : ""}
                ${!isSpeaking && speakingKey ? "brightness-50 opacity-70 scale-95" : "brightness-110 opacity-100 scale-100"}
              `}
            >
              {spriteUrl && (
                <img
                  src={spriteUrl}
                  alt={vc.key}
                  className="h-full w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* CG overlay */}
      {cgSrc && cgMode === "full" && (
        <div className="absolute inset-0 z-30 bg-black flex items-center justify-center">
          <img src={cgSrc} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
      {cgSrc && cgMode === "half" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40" />
          <img
            src={cgSrc}
            alt=""
            className="relative max-w-[60%] max-h-[70%] object-contain rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/20"
          />
        </div>
      )}

      {/* Flash overlay */}
      {flashing && (
        <div
          className="absolute inset-0 z-40 flash-overlay pointer-events-none"
          style={{ backgroundColor: flashColor }}
        />
      )}
    </div>
  );
}

function EffectParticles({ type }: { type: string }) {
  const count = type === "rain" ? 80 : 30;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = type === "rain" ? 0.8 + Math.random() * 0.4 : 4 + Math.random() * 4;
        const size = type === "rain" ? 2 : type === "snow" ? 4 + Math.random() * 4 : 8 + Math.random() * 8;

        const style: React.CSSProperties = {
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          animationIterationCount: "infinite",
          width: type === "rain" ? `${size}px` : `${size}px`,
          height: type === "rain" ? `${size * 8}px` : `${size}px`,
        };

        let className = "absolute ";
        if (type === "rain") {
          className += "bg-blue-200/30 animate-[rain-fall_linear]";
          style.animationName = "rain-fall";
          style.animationTimingFunction = "linear";
        } else if (type === "snow") {
          className += "bg-white/60 rounded-full";
          style.animationName = "snow-fall";
          style.animationTimingFunction = "ease-in-out";
        } else {
          // sakura / default
          className += "text-pink-300/80";
          style.animationName = "sakura-fall";
          style.animationTimingFunction = "ease-in-out";
        }

        return type === "sakura" || (type !== "rain" && type !== "snow") ? (
          <span key={i} className={className} style={style}>
            🌸
          </span>
        ) : (
          <span key={i} className={className} style={style} />
        );
      })}
    </div>
  );
}

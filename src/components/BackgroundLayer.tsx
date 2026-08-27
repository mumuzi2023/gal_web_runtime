import { useGameStore } from "../store";
import { resolveAssetUrl } from "../assets";

const positionPercent: Record<string, number> = {
  "far-left": 10,
  left: 22,
  "center-left": 36,
  center: 50,
  "center-right": 64,
  right: 78,
  "far-right": 90,
};

export default function BackgroundLayer() {
  const background = useGameStore((s) => s.background);
  const backgroundPosition = useGameStore((s) => s.backgroundPosition);
  const visibleCharacters = useGameStore((s) => s.visibleCharacters);
  const gameData = useGameStore((s) => s.gameData);
  const currentCharacterKey = useGameStore((s) => s.currentCharacterKey);
  const shaking = useGameStore((s) => s.shaking);
  const flashing = useGameStore((s) => s.flashing);
  const flashColor = useGameStore((s) => s.flashColor);
  const effectType = useGameStore((s) => s.effectType);
  const cgSrc = useGameStore((s) => s.cgSrc);
  const cgMode = useGameStore((s) => s.cgMode);
  const dismissCg = useGameStore((s) => s.dismissCg);

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
    <div className={`scene-layer ${shaking ? "screen-shake" : ""}`}>
      <div className="scene-fallback" aria-hidden="true" />
      {/* Background image */}
      {background && (
        <img
          key={background}
          src={background}
          alt=""
          className="scene-background animate-[fadeIn_0.8s_ease-out]"
          style={{ objectPosition: backgroundPosition }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      {/* Dark overlay for readability */}
      <div className="scene-vignette" />

      {/* Effect particles */}
      {effectType && <EffectParticles type={effectType} />}

      {/* Character sprites — left/center/right positions */}
      <div className="character-stage">
        {visibleCharacters.map((vc, index) => {
          const spriteUrl = resolveExpression(vc.key, vc.expression, vc.outfitId);
          const fallbackPercent = visibleCharacters.length <= 1
            ? 50
            : 20 + (index * 60) / Math.max(1, visibleCharacters.length - 1);
          const x = positionPercent[vc.position] ?? fallbackPercent;
          const isSpeaking = vc.key === currentCharacterKey;

          return (
            <div
              key={vc.key}
              className={`character-sprite transition-all duration-500 ease-out origin-bottom
                ${vc.entering ? "character-enter" : ""}
                ${!isSpeaking && currentCharacterKey ? "is-listening" : "is-speaking"}
              `}
              style={{ left: `${x}%`, zIndex: isSpeaking ? 4 : index + 1 }}
            >
              {spriteUrl && (
                <img
                  key={spriteUrl}
                  src={spriteUrl}
                  alt={vc.key}
                  className="h-full w-full object-contain object-bottom drop-shadow-[0_12px_30px_rgba(0,0,0,0.52)]"
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
        <button
          type="button"
          className="cg-overlay cg-overlay--full"
          onClick={dismissCg}
          aria-label="继续剧情"
        >
          <img
            src={cgSrc}
            alt=""
            className="cg-overlay__image"
            onError={() => {
              // A missing CG must not trap the story on a command that can no
              // longer receive clicks. Skip it and continue the script.
              dismissCg();
            }}
          />
          <span className="cg-overlay__hint">点击继续</span>
        </button>
      )}
      {cgSrc && cgMode === "half" && (
        <button
          type="button"
          className="cg-overlay cg-overlay--card"
          onClick={dismissCg}
          aria-label="继续剧情"
        >
          <span className="cg-overlay__scrim" />
          <img
            src={cgSrc}
            alt=""
            className="cg-overlay__card-image"
            onError={() => {
              dismissCg();
            }}
          />
          <span className="cg-overlay__hint">点击继续</span>
        </button>
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
        const seeded = (salt: number) => {
          const value = Math.sin((i + 1) * 9283.13 + salt * 77.31) * 43758.5453;
          return value - Math.floor(value);
        };
        const left = seeded(1) * 100;
        const delay = seeded(2) * 5;
        const duration = type === "rain" ? 0.8 + seeded(3) * 0.4 : 4 + seeded(3) * 4;
        const size = type === "rain" ? 2 : type === "snow" ? 4 + seeded(4) * 4 : 8 + seeded(4) * 8;

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

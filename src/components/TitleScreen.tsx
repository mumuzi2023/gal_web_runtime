import { useState } from "react";
import { useGameStore } from "../store";
import {
  buttonStyle,
  buttonHoverStyle,
  defaultTitleButton,
  titleLayoutClass,
} from "../uiConfig";
import type { UiButtonStyle } from "../types";

export default function TitleScreen() {
  const gameData = useGameStore((s) => s.gameData);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const saves = useGameStore((s) => s.saves);

  if (!gameData) return null;

  const hasSaves = saves.some((s) => s !== null);
  const meta = gameData.meta;
  const titleCfg = gameData.config?.ui?.title;
  const layoutCls = titleLayoutClass(titleCfg?.layout);

  const firstScene = Object.values(gameData.scenes)[0];
  const titleBg = firstScene?.background || "";

  const baseBtn: UiButtonStyle | undefined = titleCfg?.buttons;
  const overrides = titleCfg?.buttonOverrides || {};

  const buttons: { key: string; label: string; onClick: () => void; show: boolean }[] = [
    { key: "newGame", label: "新游戏", onClick: startNewGame, show: true },
    { key: "continue", label: "继续游戏", onClick: () => setScreen("load"), show: hasSaves },
    { key: "settings", label: "设置", onClick: () => setScreen("settings"), show: true },
    { key: "endings", label: "结局列表", onClick: () => setScreen("endings"), show: true },
  ];

  return (
    <div className={`absolute inset-0 flex flex-col ${layoutCls}`}>
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

      <div className="relative z-10 text-center mb-12">
        <h1
          className="text-5xl font-bold tracking-widest drop-shadow-lg mb-4"
          style={{ color: titleCfg?.titleColor || "#fff" }}
        >
          {meta.title}
        </h1>
        {meta.description && (
          <p
            className="text-sm max-w-md mx-auto leading-relaxed line-clamp-3"
            style={{ color: titleCfg?.subtitleColor || "rgba(255,255,255,0.6)" }}
          >
            {meta.description.slice(0, 120)}
            {meta.description.length > 120 ? "..." : ""}
          </p>
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        {buttons
          .filter((b) => b.show)
          .map((b) => (
            <MenuButton
              key={b.key}
              label={b.label}
              onClick={b.onClick}
              override={overrides[b.key]}
              base={baseBtn}
            />
          ))}
      </div>

      <div className="absolute bottom-4 right-4 text-white/30 text-xs">
        v{meta.version} | {meta.author}
      </div>
    </div>
  );
}

function MenuButton({
  label,
  onClick,
  override,
  base,
}: {
  label: string;
  onClick: () => void;
  override?: UiButtonStyle;
  base?: UiButtonStyle;
}) {
  const merged: UiButtonStyle = { ...defaultTitleButton, ...(base || {}), ...(override || {}) };
  const normal = buttonStyle(undefined, merged);
  const hover = buttonHoverStyle(undefined, merged);
  const [hovered, setHovered] = useState(false);
  const labelText = merged.icon ? `${merged.icon}  ${label}` : label;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...normal, ...(hovered ? hover : {}) }}
      className="text-lg tracking-wider backdrop-blur-sm transition-all duration-300 cursor-pointer"
    >
      {labelText}
    </button>
  );
}

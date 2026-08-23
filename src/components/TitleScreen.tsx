import { useState } from "react";
import { useGameStore } from "../store";
import {
  buttonStyle,
  buttonHoverStyle,
  defaultTitleButton,
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
  const layout = titleCfg?.layout || "left";

  const firstKey = gameData.start_scene || gameData.scene_order?.[0] || Object.keys(gameData.scenes)[0];
  const rawTitleBg = firstKey ? gameData.scenes[firstKey]?.background || "" : "";
  const titleBg = gameData._asset_manifest?.[rawTitleBg] || rawTitleBg;

  const baseBtn: UiButtonStyle | undefined = titleCfg?.buttons;
  const overrides = titleCfg?.buttonOverrides || {};

  const buttons: { key: string; label: string; onClick: () => void; show: boolean }[] = [
    { key: "newGame", label: "新游戏", onClick: startNewGame, show: true },
    { key: "continue", label: "继续游戏", onClick: () => setScreen("load"), show: hasSaves },
    { key: "settings", label: "设置", onClick: () => setScreen("settings"), show: true },
    { key: "endings", label: "结局列表", onClick: () => setScreen("endings"), show: true },
  ];

  return (
    <section className={`title-screen title-screen--${layout} title-fade-in`}>
      <div className="title-screen__fallback" aria-hidden="true" />
      {titleBg && (
        <img
          src={titleBg}
          alt=""
          className="title-screen__background"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="title-screen__veil" />

      <div className="title-screen__content">
        <div className="title-screen__kicker">INTERACTIVE STORY</div>
        <h1
          className="title-screen__heading"
          style={{
            color: titleCfg?.titleColor || "#fff",
          }}
        >
          {meta.title}
        </h1>
        {meta.description && (
          <p
            className="title-screen__description"
            style={{ color: titleCfg?.subtitleColor || "rgba(255,255,255,0.6)" }}
          >
            {meta.description}
          </p>
        )}

        <nav className="title-screen__menu" aria-label="标题菜单">
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
        </nav>
      </div>

      <div className="title-screen__footer">
        v{meta.version} | {meta.author}
      </div>
    </section>
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
      className="title-menu-button text-lg tracking-wider"
    >
      {labelText}
    </button>
  );
}

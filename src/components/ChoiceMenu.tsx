import { useState } from "react";
import { useGameStore } from "../store";
import { buttonStyle, buttonHoverStyle, defaultChoiceButton, resolveGameUi } from "../uiConfig";
import type { UiButtonStyle } from "../types";

export default function ChoiceMenu() {
  const waitingForChoice = useGameStore((s) => s.waitingForChoice);
  const choiceOptions = useGameStore((s) => s.choiceOptions);
  const selectChoice = useGameStore((s) => s.selectChoice);
  const gameData = useGameStore((s) => s.gameData);

  if (!waitingForChoice || choiceOptions.length === 0) return null;

  const cfg = resolveGameUi(gameData?.ui || gameData?.config?.ui).choiceButtons;

  return (
    <div className="choice-layer" role="dialog" aria-label="请选择接下来的行动">
      <div className="choice-scrim" />
      <div className="choice-list">
        {choiceOptions.map((option, i) => (
          <ChoiceButton key={i} label={option.text} onClick={() => selectChoice(option)} cfg={cfg} index={i} />
        ))}
      </div>
    </div>
  );
}

function ChoiceButton({
  label,
  onClick,
  cfg,
  index,
}: {
  label: string;
  onClick: () => void;
  cfg?: UiButtonStyle;
  index: number;
}) {
  const merged: UiButtonStyle = { ...defaultChoiceButton, ...(cfg || {}) };
  const normal = buttonStyle(undefined, merged);
  const hover = buttonHoverStyle(undefined, merged);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...normal, ...(hovered ? hover : {}), animationDelay: `${index * 100}ms` }}
      className="choice-btn choice-stagger ui-responsive-skin"
    >
      {label}
    </button>
  );
}

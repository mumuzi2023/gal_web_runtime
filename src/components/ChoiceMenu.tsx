import { useState } from "react";
import { useGameStore } from "../store";
import { buttonStyle, buttonHoverStyle, defaultChoiceButton } from "../uiConfig";
import type { UiButtonStyle } from "../types";

export default function ChoiceMenu() {
  const waitingForChoice = useGameStore((s) => s.waitingForChoice);
  const choiceOptions = useGameStore((s) => s.choiceOptions);
  const selectChoice = useGameStore((s) => s.selectChoice);
  const gameData = useGameStore((s) => s.gameData);

  if (!waitingForChoice || choiceOptions.length === 0) return null;

  const cfg = gameData?.config?.ui?.choiceButtons;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 flex flex-col gap-3 w-full max-w-lg px-6">
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
      className="w-full text-base text-center backdrop-blur-md cursor-pointer transition-all duration-300 choice-stagger bg-black/60 border border-white/20 hover:bg-white/10 hover:border-white/50"
    >
      {label}
    </button>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "../store";
import {
  buttonStyle,
  buttonHoverStyle,
  defaultMenuButton,
  textboxStyle,
  nameplateStyle,
} from "../uiConfig";
import type { UiButtonStyle } from "../types";

export default function DialogBox() {
  const currentText = useGameStore((s) => s.currentText);
  const currentCharacter = useGameStore((s) => s.currentCharacter);
  const currentCharacterColor = useGameStore((s) => s.currentCharacterColor);
  const isTyping = useGameStore((s) => s.isTyping);
  const waitingForClick = useGameStore((s) => s.waitingForClick);
  const waitingForChoice = useGameStore((s) => s.waitingForChoice);
  const finishTyping = useGameStore((s) => s.finishTyping);
  const advanceCommand = useGameStore((s) => s.advanceCommand);
  const textSpeed = useGameStore((s) => s.settings.textSpeed);
  const autoMode = useGameStore((s) => s.autoMode);
  const autoSpeed = useGameStore((s) => s.settings.autoSpeed);
  const toggleAutoMode = useGameStore((s) => s.toggleAutoMode);
  const setScreen = useGameStore((s) => s.setScreen);
  const gameData = useGameStore((s) => s.gameData);

  const ui = gameData?.config?.ui;
  const textboxCss = textboxStyle(ui?.textbox);
  const nameplateCss = nameplateStyle(ui?.nameplate, currentCharacterColor);
  const menuOverrides = ui?.menuButtonOverrides || {};

  const [displayedText, setDisplayedText] = useState(isTyping ? "" : currentText);
  const [typingComplete, setTypingComplete] = useState(!isTyping);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const charIndexRef = useRef(0);

  // Typewriter effect
  useEffect(() => {
    if (!isTyping || !currentText) return;

    const interval = Math.max(10, 1000 / textSpeed);
    timerRef.current = setInterval(() => {
      charIndexRef.current++;
      if (charIndexRef.current >= currentText.length) {
        clearInterval(timerRef.current);
        setDisplayedText(currentText);
        setTypingComplete(true);
        finishTyping();
      } else {
        setDisplayedText(currentText.slice(0, charIndexRef.current));
      }
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [currentText, isTyping, textSpeed, finishTyping]);

  // Auto mode
  useEffect(() => {
    if (autoMode && waitingForClick && typingComplete) {
      autoTimerRef.current = setTimeout(() => advanceCommand(), autoSpeed * 1000);
      return () => clearTimeout(autoTimerRef.current);
    }
  }, [autoMode, waitingForClick, typingComplete, autoSpeed, advanceCommand]);

  const handleClick = useCallback(() => {
    if (isTyping) {
      clearInterval(timerRef.current);
      setDisplayedText(currentText);
      setTypingComplete(true);
      finishTyping();
    } else if (waitingForClick) {
      advanceCommand();
    }
  }, [isTyping, waitingForClick, currentText, finishTyping, advanceCommand]);

  if (waitingForChoice || (!currentText && !waitingForClick)) return null;

  const menuActions: { key: string; label: string; onClick: () => void; activeOverride?: UiButtonStyle }[] = [
    {
      key: "auto",
      label: prefixIcon(menuOverrides.auto, "自动"),
      onClick: toggleAutoMode,
      activeOverride: autoMode ? { background: "rgba(59, 130, 246, 0.85)", textColor: "#fff" } : undefined,
    },
    { key: "backlog", label: prefixIcon(menuOverrides.backlog, "记录"), onClick: () => setScreen("backlog") },
    { key: "save", label: prefixIcon(menuOverrides.save, "存档"), onClick: () => setScreen("save") },
    { key: "progress", label: prefixIcon(menuOverrides.progress, "进度"), onClick: () => setScreen("progress") },
    { key: "menu", label: prefixIcon(menuOverrides.menu, "菜单"), onClick: () => setScreen("settings") },
  ];

  return (
    <div className="dialog-click-layer" onClick={handleClick}>
      <section className="dialog-panel" style={textboxCss} aria-live="polite">
        {/* Name plate — floating above the dialog box */}
        {currentCharacter && (
          <div
            className="dialog-nameplate"
            style={nameplateCss}
          >
            {currentCharacter}
          </div>
        )}

        {/* Menu buttons — top-right corner of dialog box */}
        <nav className="dialog-toolbar" aria-label="游戏菜单">
          {menuActions.map((a) => (
            <MenuButton
              key={a.key}
              label={a.label}
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
              }}
              override={{ ...(menuOverrides[a.key] || {}), ...(a.activeOverride || {}) }}
              base={ui?.menuButtons}
            />
          ))}
        </nav>

        {/* Text area */}
        <div
          className="dialog-copy"
          style={{ color: ui?.textbox?.textColor || "rgba(255,255,255,0.9)" }}
        >
          {displayedText}
          {isTyping && <span className="typewriter-cursor ml-0.5 text-white/70">|</span>}
        </div>

        {/* CTC indicator — bottom-right, bouncing triangle */}
        {waitingForClick && !autoMode && (
          <div className="dialog-continue ctc-bounce" aria-hidden="true">⌄</div>
        )}
      </section>
    </div>
  );
}

function prefixIcon(o: UiButtonStyle | undefined, label: string): string {
  return o?.icon ? `${o.icon} ${label}` : label;
}

function MenuButton({
  label,
  onClick,
  override,
  base,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  override?: UiButtonStyle;
  base?: UiButtonStyle;
}) {
  const merged: UiButtonStyle = { ...defaultMenuButton, ...(base || {}), ...(override || {}) };
  const normal = buttonStyle(undefined, merged);
  const hover = buttonHoverStyle(undefined, merged);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...normal, ...(hovered ? hover : {}) }}
      className="dialog-tool-button"
    >
      {label}
    </button>
  );
}

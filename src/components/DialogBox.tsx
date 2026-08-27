import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "../store";
import {
  buttonStyle,
  buttonHoverStyle,
  defaultMenuButton,
  resolveGameUi,
  toolbarStyle,
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

  const ui = gameData?.ui || gameData?.config?.ui;
  const gameUi = resolveGameUi(ui);
  const textboxCss = textboxStyle(gameUi.textbox);
  const nameplateCss = nameplateStyle(gameUi.nameplate, currentCharacterColor);
  const toolbarCss = toolbarStyle(gameUi.menuButtons);
  const menuOverrides = gameUi.menuButtonOverrides || {};

  const [displayedText, setDisplayedText] = useState(isTyping ? "" : currentText);
  const [typingComplete, setTypingComplete] = useState(!isTyping);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const charIndexRef = useRef(0);

  // Studio previews can replace the sample line without advancing the script.
  // Keep the rendered copy in sync when no typewriter animation is active.
  useEffect(() => {
    if (isTyping) return;
    setDisplayedText(currentText);
    setTypingComplete(true);
    charIndexRef.current = currentText.length;
  }, [currentText, isTyping]);

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
      label: "自动",
      onClick: toggleAutoMode,
      activeOverride: autoMode ? { background: "var(--runtime-active-bg)", textColor: "var(--runtime-active-text)" } : undefined,
    },
    { key: "backlog", label: "记录", onClick: () => setScreen("backlog") },
    { key: "save", label: "存档", onClick: () => setScreen("save") },
    { key: "progress", label: "进度", onClick: () => setScreen("progress") },
    { key: "menu", label: "菜单", onClick: () => setScreen("settings") },
  ];

  return (
    <div className="dialog-click-layer" onClick={handleClick}>
      <section className="dialog-panel ui-responsive-skin" style={textboxCss} aria-live="polite">
        {/* Name plate — floating above the dialog box */}
        {currentCharacter && (
          <div
            className="dialog-nameplate ui-responsive-skin"
            style={nameplateCss}
          >
            {currentCharacter}
          </div>
        )}

        {/* Menu buttons — top-right corner of dialog box */}
        <nav className="dialog-toolbar" style={toolbarCss} aria-label="游戏菜单">
          {menuActions.filter((a) => menuOverrides[a.key]?.hidden !== true).map((a) => (
            <MenuButton
              key={a.key}
              actionKey={a.key}
              label={prefixIcon(menuOverrides[a.key], menuOverrides[a.key]?.label || a.label)}
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
              }}
              override={{ ...(menuOverrides[a.key] || {}), ...(a.activeOverride || {}) }}
              base={gameUi.menuButtons}
            />
          ))}
        </nav>

        {/* Text area */}
        <div
          className="dialog-copy"
          style={{ color: gameUi.textbox?.textColor || "var(--runtime-text-primary)" }}
        >
          {displayedText}
          {isTyping && <span className="typewriter-cursor dialog-cursor ml-0.5">|</span>}
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
  actionKey,
  label,
  onClick,
  override,
  base,
}: {
  actionKey: string;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  override?: UiButtonStyle;
  base?: UiButtonStyle;
}) {
  const merged: UiButtonStyle = { ...defaultMenuButton, ...(base || {}), ...(override || {}) };
  const normal = buttonStyle(undefined, merged);
  const hover = buttonHoverStyle(undefined, merged);
  const [hovered, setHovered] = useState(false);
  const accessibleLabel = merged.tooltip || merged.label || label;
  return (
    <button
      data-menu-key={actionKey}
      data-tooltip={accessibleLabel}
      data-tooltip-visible={hovered ? "true" : undefined}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      style={{ ...normal, ...(hovered ? hover : {}) }}
      className="dialog-tool-button ui-responsive-skin"
    >
      {merged.showLabel === false ? null : (merged.label || label)}
    </button>
  );
}

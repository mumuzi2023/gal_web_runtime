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
  const cgSrc = useGameStore((s) => s.cgSrc);
  const gameData = useGameStore((s) => s.gameData);

  const ui = gameData?.config?.ui;
  const textboxCss = textboxStyle(ui?.textbox);
  const nameplateCss = nameplateStyle(ui?.nameplate, currentCharacterColor);
  const menuOverrides = ui?.menuButtonOverrides || {};

  const [displayedText, setDisplayedText] = useState("");
  const [typingComplete, setTypingComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const charIndexRef = useRef(0);

  // Typewriter effect
  useEffect(() => {
    if (!isTyping || !currentText) return;

    setDisplayedText("");
    setTypingComplete(false);
    charIndexRef.current = 0;

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
    if (cgSrc) {
      useGameStore.setState({ cgSrc: null });
      useGameStore.getState().advanceCommand();
      return;
    }
    if (isTyping) {
      clearInterval(timerRef.current);
      setDisplayedText(currentText);
      setTypingComplete(true);
      finishTyping();
    } else if (waitingForClick) {
      advanceCommand();
    }
  }, [isTyping, waitingForClick, currentText, finishTyping, advanceCommand, cgSrc]);

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
    <div className="absolute inset-0 z-20" onClick={handleClick}>
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
        <div className="relative mx-auto max-w-4xl backdrop-blur-sm" style={textboxCss}>
          {currentCharacter && (
            <div className="absolute -top-8 left-4 px-4 py-1 text-sm" style={nameplateCss}>
              {currentCharacter}
            </div>
          )}

          <div
            className="px-6 py-5 min-h-[100px] text-base leading-relaxed"
            style={{ color: ui?.textbox?.textColor || "rgba(255,255,255,0.9)" }}
          >
            {displayedText}
            {isTyping && <span className="typewriter-cursor ml-0.5">▊</span>}
          </div>

          {waitingForClick && !autoMode && (
            <div className="absolute bottom-2 right-4 text-white/40 text-xs animate-pulse">▼</div>
          )}

          <div className="absolute -top-8 right-4 flex gap-2">
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
          </div>
        </div>
      </div>
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
      style={{ ...normal, ...(hovered ? hover : {}), fontSize: "12px" }}
      className="transition cursor-pointer"
    >
      {label}
    </button>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "../store";

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

  // Read textbox opacity from game config (default 0.82)
  const textboxOpacity = gameData?.config?.ui?.textbox?.opacity ?? 0.82;

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

  // Auto mode - advance after typing complete
  useEffect(() => {
    if (autoMode && waitingForClick && typingComplete) {
      autoTimerRef.current = setTimeout(() => {
        advanceCommand();
      }, autoSpeed * 1000);
      return () => clearTimeout(autoTimerRef.current);
    }
  }, [autoMode, waitingForClick, typingComplete, autoSpeed, advanceCommand]);

  const handleClick = useCallback(() => {
    // Dismiss CG first
    if (cgSrc) {
      useGameStore.setState({ cgSrc: null });
      useGameStore.getState().advanceCommand();
      return;
    }

    if (isTyping) {
      // Skip typewriter — show full text instantly
      clearInterval(timerRef.current);
      setDisplayedText(currentText);
      setTypingComplete(true);
      finishTyping();
    } else if (waitingForClick) {
      advanceCommand();
    }
  }, [isTyping, waitingForClick, currentText, finishTyping, advanceCommand, cgSrc]);

  // Don't show dialog box during choices or when no text
  if (waitingForChoice || (!currentText && !waitingForClick)) return null;

  return (
    <div className="absolute inset-0 z-20" onClick={handleClick}>
      {/* Dialog text box at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
        <div
          className="relative mx-auto max-w-4xl rounded-t-lg border border-dialog-border backdrop-blur-sm"
          style={{ backgroundColor: `rgba(0, 0, 0, ${textboxOpacity})` }}
        >
          {/* Character name plate */}
          {currentCharacter && (
            <div
              className="absolute -top-8 left-4 px-4 py-1 rounded-t-md text-sm font-bold"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                color: currentCharacterColor || "#fff",
                borderTop: `2px solid ${currentCharacterColor || "#fff"}`,
              }}
            >
              {currentCharacter}
            </div>
          )}

          {/* Text area */}
          <div className="px-6 py-5 min-h-[100px] text-white/90 text-base leading-relaxed">
            {displayedText}
            {isTyping && <span className="typewriter-cursor ml-0.5">▊</span>}
          </div>

          {/* Click indicator */}
          {waitingForClick && !autoMode && (
            <div className="absolute bottom-2 right-4 text-white/40 text-xs animate-pulse">
              ▼
            </div>
          )}

          {/* Control buttons */}
          <div className="absolute -top-8 right-4 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleAutoMode();
              }}
              className={`px-2 py-0.5 text-xs rounded ${
                autoMode ? "bg-blue-500/80 text-white" : "bg-black/60 text-white/60"
              } hover:bg-white/20 transition`}
            >
              自动
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScreen("backlog");
              }}
              className="px-2 py-0.5 text-xs rounded bg-black/60 text-white/60 hover:bg-white/20 transition"
            >
              记录
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScreen("save");
              }}
              className="px-2 py-0.5 text-xs rounded bg-black/60 text-white/60 hover:bg-white/20 transition"
            >
              存档
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScreen("progress");
              }}
              className="px-2 py-0.5 text-xs rounded bg-black/60 text-white/60 hover:bg-white/20 transition"
            >
              进度
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScreen("settings");
              }}
              className="px-2 py-0.5 text-xs rounded bg-black/60 text-white/60 hover:bg-white/20 transition"
            >
              菜单
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

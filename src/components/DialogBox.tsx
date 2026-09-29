import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "../store";
import { SKIN_SAFE_PRESETS, useSkinGeometryVariables } from "../skinGeometry";
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
  const screen = useGameStore((s) => s.screen);
  const commandSerial = useGameStore((s) => s.commandSerial);
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
  const panelRef = useRef<HTMLElement>(null);
  const cgPreview = useGameStore((s) => s.cg?.phase === "preview");
  const visible = !cgPreview && !waitingForChoice && Boolean(currentText || waitingForClick);
  const visibleSkinVariables = useSkinGeometryVariables(panelRef, gameUi.textbox?.skin, visible, SKIN_SAFE_PRESETS.dialog);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto mode
  useEffect(() => {
    if (screen === "game" && autoMode && waitingForClick && !isTyping) {
      autoTimerRef.current = setTimeout(() => advanceCommand(), autoSpeed * 1000);
      return () => clearTimeout(autoTimerRef.current);
    }
  }, [screen, commandSerial, autoMode, waitingForClick, isTyping, autoSpeed, advanceCommand]);

  const handleClick = useCallback(() => {
    if (isTyping) {
      finishTyping();
    } else if (waitingForClick) {
      advanceCommand();
    }
  }, [isTyping, waitingForClick, finishTyping, advanceCommand]);

  if (!visible) return null;

  const menuActions: { key: string; label: string; onClick: () => void; pressed?: boolean; activeOverride?: UiButtonStyle }[] = [
    {
      key: "auto",
      label: "自动",
      onClick: toggleAutoMode,
      pressed: autoMode,
      activeOverride: autoMode ? { background: "var(--runtime-active-bg)", textColor: "var(--runtime-active-text)" } : undefined,
    },
    { key: "backlog", label: "记录", onClick: () => setScreen("backlog") },
    { key: "save", label: "存档", onClick: () => setScreen("save") },
    { key: "progress", label: "进度", onClick: () => setScreen("progress") },
    { key: "menu", label: "菜单", onClick: () => setScreen("settings") },
  ];

  return (
    <div className="dialog-click-layer" onClick={handleClick}>
      <section ref={panelRef} className="dialog-panel ui-responsive-skin" style={{ ...textboxCss, ...visibleSkinVariables }} aria-live="polite">
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
              pressed={a.pressed}
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
          <DialogText key={`${commandSerial}:${currentText}`} text={currentText}
            active={screen === "game"} typing={isTyping} speed={textSpeed} onComplete={finishTyping} />
        </div>

        {/* CTC indicator — bottom-right, bouncing triangle */}
        {waitingForClick && !autoMode && (
          <div className="dialog-continue ctc-bounce" aria-hidden="true">⌄</div>
        )}
      </section>
    </div>
  );
}

/** Reset only the per-command text, retaining the panel's measured skin geometry. */
function DialogText({ text, active, typing, speed, onComplete }: {
  text: string; active: boolean; typing: boolean; speed: number; onComplete: () => void;
}) {
  const [displayedText, setDisplayedText] = useState(typing ? "" : text);
  const charIndex = useRef(0);

  useEffect(() => {
    if (!active || !typing || !text) return;
    const timer = setInterval(() => {
      charIndex.current++;
      if (charIndex.current >= text.length) {
        clearInterval(timer);
        setDisplayedText(text);
        onComplete();
      } else {
        setDisplayedText(text.slice(0, charIndex.current));
      }
    }, Math.max(10, 1000 / speed));
    return () => clearInterval(timer);
  }, [active, typing, text, speed, onComplete]);

  return <>{typing ? displayedText : text}
    {typing && <span className="typewriter-cursor dialog-cursor ml-0.5">|</span>}
  </>;
}

function prefixIcon(o: UiButtonStyle | undefined, label: string): string {
  return o?.icon ? `${o.icon} ${label}` : label;
}

function MenuButton({
  actionKey,
  label,
  pressed,
  onClick,
  override,
  base,
}: {
  actionKey: string;
  label: string;
  pressed?: boolean;
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
      aria-pressed={pressed}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      style={{ ...normal, ...(hovered ? hover : {}) }}
      className={`dialog-tool-button ui-responsive-skin ${pressed ? "is-active" : ""} ${merged.showLabel === false ? "dialog-tool-button--icon-only" : ""}`}
    >
      <span className="dialog-tool-button__icon" aria-hidden="true"><MenuActionIcon actionKey={actionKey} /></span>
      {merged.showLabel === false ? null : <span className="dialog-tool-button__label">{merged.label || label}</span>}
    </button>
  );
}

function MenuActionIcon({ actionKey }: { actionKey: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" role="presentation" focusable="false" {...common}>
    {actionKey === "auto" && <><path d="M7 5.5 18 12 7 18.5Z" /><path d="M20.5 6v12" /></>}
    {actionKey === "backlog" && <><path d="M5 6.5h14M5 11.5h14M5 16.5h9" /><path d="M3 6.5h.01M3 11.5h.01M3 16.5h.01" /></>}
    {actionKey === "save" && <><path d="M5 4h12l2 2v14H5Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></>}
    {actionKey === "progress" && <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="12" cy="18" r="2" /><path d="M7.8 6.8 16 7.7M7.2 7.7l3.7 8.5M17 9.7l-3.8 6.6" /></>}
    {actionKey === "menu" && <><path d="M5 7h14M5 12h14M5 17h14" /><circle cx="9" cy="7" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="11" cy="17" r="1.5" fill="currentColor" stroke="none" /></>}
  </svg>;
}

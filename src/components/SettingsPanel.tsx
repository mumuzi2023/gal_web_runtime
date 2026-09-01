import { useRef } from "react";
import { useGameStore } from "../store";
import { SKIN_SAFE_PRESETS, useSkinGeometryVariables } from "../skinGeometry";
import { panelOverlayStyle, panelStyle, defaultLightPanel, resolvePanelUi, responsiveSkinStyle } from "../uiConfig";

export default function SettingsPanel() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const closeOverlay = useGameStore((s) => s.closeOverlay);
  const overlayReturnScreen = useGameStore((s) => s.overlayReturnScreen);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const gameData = useGameStore((s) => s.gameData);
  const ui = gameData?.ui || gameData?.config?.ui;
  const panelCfg = resolvePanelUi(ui, "settings");
  const panelRef = useRef<HTMLElement>(null);
  const panelGeometry = useSkinGeometryVariables(panelRef, panelCfg?.skin, screen, SKIN_SAFE_PRESETS.settings);

  if (screen !== "settings") return null;
  const panelCss = panelStyle(panelCfg, defaultLightPanel);
  const overlayCss = panelOverlayStyle(panelCfg, defaultLightPanel);
  const allowThemeChoice = ui?.global?.allowPlayerThemeChoice !== false;
  const pageCss = responsiveSkinStyle(ui?.pages?.settings?.pageBackground);

  return (
    <div className="runtime-overlay ui-responsive-skin" style={pageCss} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="runtime-overlay__scrim" style={overlayCss} />
      <section ref={panelRef} className={`runtime-overlay__surface settings-surface ui-responsive-skin ${panelCfg?.skin || panelCfg?.backgroundImage ? "has-ui-skin" : ""}`} style={{ ...panelCss, ...panelGeometry }}>
        <header className="runtime-overlay__header">
          <div>
            <h2 id="settings-title" className="runtime-overlay__title">设置</h2>
            <div className="runtime-overlay__subtitle">调整显示、阅读节奏与声音</div>
          </div>
          <button onClick={closeOverlay} className="runtime-overlay__close" aria-label="关闭设置">✕</button>
        </header>

        <div className="runtime-overlay__body settings-list">
          {allowThemeChoice && <fieldset className="settings-appearance">
            <legend>界面外观</legend>
            <div className="settings-appearance__options">
              <button
                type="button"
                aria-pressed={settings.appearance === "project"}
                onClick={() => updateSettings({ appearance: "project" })}
              >
                <span aria-hidden="true">◒</span>
                作品默认
              </button>
              <button
                type="button"
                aria-pressed={settings.appearance === "light"}
                onClick={() => updateSettings({ appearance: "light" })}
              >
                <span aria-hidden="true">☀</span>
                浅色
              </button>
              <button
                type="button"
                aria-pressed={settings.appearance === "dark"}
                onClick={() => updateSettings({ appearance: "dark" })}
              >
                <span aria-hidden="true">◐</span>
                深色
              </button>
            </div>
          </fieldset>}
          <SliderSetting label="文字速度" value={settings.textSpeed} min={10} max={100} step={5}
            displayValue={`${settings.textSpeed} 字/秒`} onChange={(v) => updateSettings({ textSpeed: v })} />
          <SliderSetting label="自动播放速度" value={settings.autoSpeed} min={1} max={10} step={0.5}
            displayValue={`${settings.autoSpeed} 秒`} onChange={(v) => updateSettings({ autoSpeed: v })} />
          <SliderSetting label="主音量" value={settings.masterVolume} min={0} max={1} step={0.05}
            displayValue={`${Math.round(settings.masterVolume * 100)}%`}
            onChange={(v) => updateSettings({ masterVolume: v })} />
          <SliderSetting label="BGM 音量" value={settings.bgmVolume} min={0} max={1} step={0.05}
            displayValue={`${Math.round(settings.bgmVolume * 100)}%`}
            onChange={(v) => updateSettings({ bgmVolume: v })} />
          <SliderSetting label="语音音量" value={settings.voiceVolume} min={0} max={1} step={0.05}
            displayValue={`${Math.round(settings.voiceVolume * 100)}%`}
            onChange={(v) => updateSettings({ voiceVolume: v })} />
          <SliderSetting label="音效音量" value={settings.seVolume} min={0} max={1} step={0.05}
            displayValue={`${Math.round(settings.seVolume * 100)}%`}
            onChange={(v) => updateSettings({ seVolume: v })} />
        </div>

        <footer className="settings-actions">
          {overlayReturnScreen === "game" && (
            <button className="settings-actions__danger" onClick={() => setScreen("title")}>返回标题</button>
          )}
          <button className="settings-actions__primary" onClick={closeOverlay}>
            {overlayReturnScreen === "game" ? "继续游戏" : "返回标题"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function SliderSetting({
  label, value, min, max, step, displayValue, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  displayValue: string; onChange: (v: number) => void;
}) {
  return (
    <label className="settings-row">
      <div className="settings-row__label">
        <span>{label}</span>
        <span>{displayValue}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="settings-row__range"
      />
    </label>
  );
}

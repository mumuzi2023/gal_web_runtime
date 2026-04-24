import { useGameStore } from "../store";
import { panelStyle, panelOverlayStyle, defaultLightPanel } from "../uiConfig";

export default function SettingsPanel() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const background = useGameStore((s) => s.background);
  const gameData = useGameStore((s) => s.gameData);

  if (screen !== "settings") return null;

  const panelCfg = gameData?.config?.ui?.settingsPanel;
  const panelCss = panelStyle(panelCfg, defaultLightPanel);
  const overlayCss = panelOverlayStyle(panelCfg, defaultLightPanel);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {background && (
        <img src={background} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0" style={overlayCss} />

      <div className="relative w-full max-w-md" style={panelCss}>
        <h2 className="text-xl font-bold mb-6 text-center">设置</h2>

        <div className="space-y-5">
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

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => setScreen("title")}
            className="px-6 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-medium"
          >
            返回标题
          </button>
          <button
            onClick={() => setScreen("game")}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            返回游戏
          </button>
        </div>
      </div>
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
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="opacity-70">{displayValue}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer"
      />
    </div>
  );
}

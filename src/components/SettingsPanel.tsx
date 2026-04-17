import { useGameStore } from "../store";

export default function SettingsPanel() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);

  if (screen !== "settings") return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900/95 border border-white/10 rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-6 text-center">设置</h2>

        <div className="space-y-5">
          <SliderSetting
            label="文字速度"
            value={settings.textSpeed}
            min={10}
            max={100}
            step={5}
            displayValue={`${settings.textSpeed} 字/秒`}
            onChange={(v) => updateSettings({ textSpeed: v })}
          />

          <SliderSetting
            label="自动播放速度"
            value={settings.autoSpeed}
            min={1}
            max={10}
            step={0.5}
            displayValue={`${settings.autoSpeed} 秒`}
            onChange={(v) => updateSettings({ autoSpeed: v })}
          />

          <SliderSetting
            label="主音量"
            value={settings.masterVolume}
            min={0}
            max={1}
            step={0.05}
            displayValue={`${Math.round(settings.masterVolume * 100)}%`}
            onChange={(v) => updateSettings({ masterVolume: v })}
          />

          <SliderSetting
            label="BGM 音量"
            value={settings.bgmVolume}
            min={0}
            max={1}
            step={0.05}
            displayValue={`${Math.round(settings.bgmVolume * 100)}%`}
            onChange={(v) => updateSettings({ bgmVolume: v })}
          />

          <SliderSetting
            label="语音音量"
            value={settings.voiceVolume}
            min={0}
            max={1}
            step={0.05}
            displayValue={`${Math.round(settings.voiceVolume * 100)}%`}
            onChange={(v) => updateSettings({ voiceVolume: v })}
          />

          <SliderSetting
            label="音效音量"
            value={settings.seVolume}
            min={0}
            max={1}
            step={0.05}
            displayValue={`${Math.round(settings.seVolume * 100)}%`}
            onChange={(v) => updateSettings({ seVolume: v })}
          />
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => setScreen("title")}
            className="px-6 py-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/40 transition"
          >
            返回标题
          </button>
          <button
            onClick={() => setScreen("game")}
            className="px-6 py-2 bg-white/10 text-white/80 rounded hover:bg-white/20 transition"
          >
            返回游戏
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderSetting({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-400 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
      />
    </div>
  );
}

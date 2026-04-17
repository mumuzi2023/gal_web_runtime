import { useGameStore } from "../store";

export default function ChoiceMenu() {
  const waitingForChoice = useGameStore((s) => s.waitingForChoice);
  const choiceOptions = useGameStore((s) => s.choiceOptions);
  const selectChoice = useGameStore((s) => s.selectChoice);

  if (!waitingForChoice || choiceOptions.length === 0) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Choice buttons */}
      <div className="relative z-10 flex flex-col gap-3 w-full max-w-lg px-6">
        {choiceOptions.map((option, i) => (
          <button
            key={i}
            onClick={() => selectChoice(option)}
            className="choice-btn w-full py-4 px-6 text-white text-base text-center rounded-md backdrop-blur-sm cursor-pointer"
            style={{ backgroundColor: "rgba(20, 20, 40, 0.92)" }}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}

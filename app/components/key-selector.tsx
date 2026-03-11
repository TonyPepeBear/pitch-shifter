import { KEYS } from "~/utils/helpers";

interface KeySelectorProps {
  title: string;
  selectedKey: string;
  onChange: (next: string) => void;
  activeClassName: string;
}

export function KeySelector({ title, selectedKey, onChange, activeClassName }: KeySelectorProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((keyName) => (
          <button
            key={keyName}
            type="button"
            onClick={() => onChange(keyName)}
            className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
              selectedKey === keyName
                ? `${activeClassName} shadow-sm`
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {keyName}
          </button>
        ))}
      </div>
    </section>
  );
}

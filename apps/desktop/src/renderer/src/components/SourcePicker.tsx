import type { DesktopSource } from "@meeting-copilot/contracts";
import { useEffect, useState } from "react";

export function SourcePicker({ label }: { label: string }) {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState(false);

  const refresh = () => {
    setError(false);
    void window.copilot.desktopSources
      .list()
      .then((items) => {
        setSources(items);
        if (items[0]) {
          const next = items.some((item) => item.id === selected) ? selected : items[0].id;
          setSelected(next);
          void window.copilot.desktopSources.select(next);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  };

  useEffect(() => {
    refresh();
    // Source discovery intentionally runs once; refresh remains an explicit user action.
  }, []);

  return (
    <div className="source-picker">
      {label && <span>{label}</span>}
      <select
        value={selected}
        aria-label={label || "Meeting audio source"}
        disabled={sources.length === 0}
        onChange={(event) => {
          setSelected(event.target.value);
          void window.copilot.desktopSources.select(event.target.value);
        }}
      >
        {sources.length === 0 && <option value="">No audio source</option>}
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
      <button type="button" className="text-button" onClick={refresh}>
        {error ? "Try again" : "Refresh"}
      </button>
    </div>
  );
}

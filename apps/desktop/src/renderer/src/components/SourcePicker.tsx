import type { DesktopSource } from "@meeting-copilot/contracts";
import { useEffect, useState } from "react";

export function SourcePicker() {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    void window.copilot.desktopSources.list().then((items) => {
      setSources(items);
      if (items[0]) {
        setSelected(items[0].id);
        void window.copilot.desktopSources.select(items[0].id);
      }
    });
  }, []);

  return (
    <label className="field">
      Meeting audio source
      <select
        value={selected}
        onChange={(event) => {
          setSelected(event.target.value);
          void window.copilot.desktopSources.select(event.target.value);
        }}
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
    </label>
  );
}

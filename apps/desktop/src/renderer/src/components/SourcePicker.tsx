import type { DesktopSource } from "@meeting-copilot/contracts";
import { useEffect, useState } from "react";

interface SourcePickerProps {
  label: string;
  disabled?: boolean;
  requireExplicitSelection?: boolean;
  showPreview?: boolean;
  emptyLabel?: string;
  unavailableLabel?: string;
  onSelectionChange?: (source: DesktopSource | null) => void;
}

export function SourcePicker({
  label,
  disabled = false,
  requireExplicitSelection = false,
  showPreview = false,
  emptyLabel = "Select a screen or window",
  unavailableLabel = "No screens or windows found",
  onSelectionChange
}: SourcePickerProps) {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [selected, setSelected] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSelectionChange?.(null);
    void window.copilot.desktopSources
      .list()
      .then(async (items) => {
        setSources(items);
        if (!requireExplicitSelection && items[0]) {
          await window.copilot.desktopSources.select(items[0].id);
          setSelected(items[0].id);
          onSelectionChange?.(items[0]);
        }
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : unavailableLabel);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const selectSource = async (id: string) => {
    setError(null);
    if (!id) {
      setSelected("");
      onSelectionChange?.(null);
      return;
    }

    const source = sources.find((item) => item.id === id);
    if (!source) return;
    try {
      await window.copilot.desktopSources.select(id);
      setSelected(id);
      onSelectionChange?.(source);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : unavailableLabel);
      setSelected("");
      onSelectionChange?.(null);
    }
  };

  const selectedSource = sources.find((source) => source.id === selected) ?? null;

  return (
    <div className={`source-picker ${showPreview ? "source-picker-with-preview" : ""}`}>
      <label className="field">
        {label}
        <select
          value={selected}
          disabled={disabled || isLoading || sources.length === 0}
          onChange={(event) => void selectSource(event.target.value)}
        >
          {requireExplicitSelection && <option value="">{emptyLabel}</option>}
          {!isLoading && sources.length === 0 && <option value="">{unavailableLabel}</option>}
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
      </label>
      {showPreview && selectedSource && (
        <div className="source-preview">
          <img src={selectedSource.thumbnailDataUrl} alt="" />
          <span>{selectedSource.name}</span>
        </div>
      )}
      {error && (
        <span className="source-picker-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

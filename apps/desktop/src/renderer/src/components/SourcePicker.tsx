import type { AudioDevice } from "@meeting-copilot/contracts";
import { useEffect, useState } from "react";

interface SourcePickerProps {
  label: string;
  disabled?: boolean;
  requireExplicitSelection?: boolean;
  emptyLabel?: string;
  unavailableLabel?: string;
  onSelectionChange?: (source: AudioDevice | null) => void;
}

export function SourcePicker({
  label,
  disabled = false,
  requireExplicitSelection = false,
  emptyLabel = "Select a Windows output device",
  unavailableLabel = "No audio output devices found",
  onSelectionChange
}: SourcePickerProps) {
  const [sources, setSources] = useState<AudioDevice[]>([]);
  const [selected, setSelected] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSelectionChange?.(null);
    void window.copilot.systemAudio
      .listDevices()
      .then(async (items) => {
        setSources(items);
        if (!requireExplicitSelection && items[0]) {
          await window.copilot.systemAudio.select(items[0].id);
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
      await window.copilot.systemAudio.select(id);
      setSelected(id);
      onSelectionChange?.(source);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : unavailableLabel);
      setSelected("");
      onSelectionChange?.(null);
    }
  };

  return (
    <div className="source-picker">
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
      {error && (
        <span className="source-picker-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

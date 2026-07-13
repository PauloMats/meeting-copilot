import type { ReactNode } from "react";

export function AsyncIconButton({
  label,
  children,
  onClick,
  pressed,
  disabled = false,
  className = ""
}: {
  label: string;
  children: ReactNode;
  onClick: () => void | Promise<void>;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={disabled}
      onClick={() => void onClick()}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

export function ReviewSurface({
  value,
  title,
  hint,
  sendLabel,
  discardLabel,
  onChange,
  onSubmit,
  onDiscard
}: {
  value: string;
  title: string;
  hint: string;
  sendLabel: string;
  discardLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onDiscard: () => void;
}) {
  return (
    <section className="review-surface" aria-labelledby="review-title">
      <h2 id="review-title">{title}</h2>
      <p>{hint}</p>
      <textarea
        value={value}
        aria-label={title}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || !event.shiftKey)) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="review-actions">
        <button type="button" className="secondary-button" onClick={onDiscard}>
          {discardLabel}
        </button>
        <button type="button" onClick={onSubmit}>
          {sendLabel}
        </button>
      </div>
    </section>
  );
}

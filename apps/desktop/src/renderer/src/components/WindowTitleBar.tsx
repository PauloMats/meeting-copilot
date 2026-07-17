export function WindowTitleBar() {
  return (
    <div
      className="window-titlebar"
      onDoubleClick={() => void window.copilot.window.toggleMaximize()}
    >
      <div className="window-titlebar-brand">
        <span className="window-titlebar-mark" aria-hidden="true" />
        <span>Meeting Copilot</span>
      </div>
      <div className="window-controls">
        <button
          type="button"
          aria-label="Minimizar"
          title="Minimizar"
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={() => void window.copilot.window.minimize()}
        >
          <span className="window-minimize-icon" />
        </button>
        <button
          type="button"
          aria-label="Maximizar ou restaurar"
          title="Maximizar ou restaurar"
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={() => void window.copilot.window.toggleMaximize()}
        >
          <span className="window-maximize-icon" />
        </button>
        <button
          type="button"
          className="window-close-button"
          aria-label="Fechar"
          title="Fechar"
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={() => void window.copilot.window.close()}
        >
          <span className="window-close-icon" />
        </button>
      </div>
    </div>
  );
}

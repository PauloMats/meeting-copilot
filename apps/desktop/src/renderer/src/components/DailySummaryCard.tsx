import type { DailySummary } from "@meeting-copilot/contracts";

export function DailySummaryCard({
  summary,
  portuguese
}: {
  summary: DailySummary;
  portuguese: boolean;
}) {
  return (
    <article className="meeting-summary-card daily-summary-card">
      <p className="eyebrow">
        {portuguese ? "RELATÓRIO DA DAILY COM IA" : "AI DAILY STATUS REPORT"}
      </p>
      <h2 className="summary-title">{summary.title}</h2>
      <p className="summary-overview">{summary.overview}</p>

      <section className="summary-section">
        <h3>{portuguese ? "Atualizações individuais" : "Participant updates"}</h3>
        <div className="participant-update-list">
          {summary.participant_updates.map((update, index) => (
            <article
              className="participant-update"
              key={`${update.participant || "unresolved"}-${index}`}
            >
              <header>
                <div>
                  <span className="participant-avatar" aria-hidden="true">
                    {(update.participant || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <strong>
                    {update.participant ||
                      (portuguese ? "Participante não identificado" : "Unidentified participant")}
                  </strong>
                </div>
                <span className={`confidence-badge confidence-${update.attribution_confidence}`}>
                  {confidenceLabel(update.attribution_confidence, portuguese)}
                </span>
              </header>
              <p>{update.summary}</p>
              <div className="participant-update-grid">
                <StatusList
                  title={portuguese ? "Concluído" : "Completed"}
                  items={update.completed}
                  tone="complete"
                />
                <StatusList
                  title={portuguese ? "Em andamento" : "In progress"}
                  items={update.in_progress}
                  tone="progress"
                />
                <StatusList
                  title={portuguese ? "Bloqueios" : "Blockers"}
                  items={update.blockers}
                  tone="blocked"
                />
                <StatusList
                  title={portuguese ? "Próximos passos" : "Next steps"}
                  items={update.next_steps}
                  tone="next"
                />
              </div>
              {update.dependencies.length > 0 && (
                <div className="dependency-list">
                  <h4>{portuguese ? "Dependências" : "Dependencies"}</h4>
                  {update.dependencies.map((dependency, dependencyIndex) => (
                    <div
                      className="dependency-item"
                      key={`${dependency.person_or_team}-${dependencyIndex}`}
                    >
                      <strong>
                        {portuguese ? "Aguardando" : "Waiting for"}:{" "}
                        {dependency.person_or_team ||
                          (portuguese ? "não informado" : "not specified")}
                      </strong>
                      <span>{dependency.dependency}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="summary-lists">
        <StatusSection
          title={portuguese ? "Bloqueios do time" : "Team blockers"}
          items={summary.team_blockers}
        />
        <StatusSection
          title={portuguese ? "Próximos passos do time" : "Team next steps"}
          items={summary.team_next_steps}
        />
        <StatusSection
          title={portuguese ? "Participantes ausentes" : "Absent participants"}
          items={summary.absent_participants}
        />
      </div>

      {summary.unresolved_attributions.length > 0 && (
        <section className="summary-section unresolved-section">
          <h3>{portuguese ? "Atribuições não resolvidas" : "Unresolved attributions"}</h3>
          {summary.unresolved_attributions.map((item, index) => (
            <div className="unresolved-item" key={`${item.summary}-${index}`}>
              <p>{item.summary}</p>
              {item.possible_participants.length > 0 && (
                <small>
                  {portuguese ? "Possíveis participantes" : "Possible participants"}:{" "}
                  {item.possible_participants.join(", ")}
                </small>
              )}
            </div>
          ))}
        </section>
      )}
    </article>
  );
}

function StatusList({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone: "complete" | "progress" | "blocked" | "next";
}) {
  if (!items.length) return null;
  return (
    <div className={`participant-status status-${tone}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function StatusSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="summary-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function confidenceLabel(
  confidence: DailySummary["participant_updates"][number]["attribution_confidence"],
  portuguese: boolean
): string {
  if (!portuguese) return `${confidence} confidence`;
  return { high: "alta confiança", medium: "média confiança", low: "baixa confiança" }[confidence];
}

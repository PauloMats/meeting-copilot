import type { MeetingSummary } from "@meeting-copilot/contracts";

export function MeetingSummaryCard({
  summary,
  portuguese
}: {
  summary: MeetingSummary;
  portuguese: boolean;
}) {
  return (
    <article className="meeting-summary-card">
      <p className="eyebrow">{portuguese ? "ATA DA REUNIÃO COM IA" : "AI MEETING NOTES"}</p>
      <h2 className="summary-title">{summary.title}</h2>
      <p className="summary-overview">{summary.overview}</p>

      {summary.action_items.length > 0 && (
        <section className="summary-section action-section">
          <h3>{portuguese ? "Tarefas" : "Action items"}</h3>
          <ul className="action-list">
            {summary.action_items.map((item, index) => (
              <li key={`${item.task}-${index}`}>
                <span className="task-checkbox" aria-hidden="true" />
                <div>
                  <strong>{item.task}</strong>
                  <small>
                    {item.owner || (portuguese ? "Sem responsável" : "Unassigned")} ·{" "}
                    {item.due_date || (portuguese ? "Sem prazo" : "No due date")} ·{" "}
                    {priorityLabel(item.priority, portuguese)}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.decisions.length > 0 && (
        <section className="summary-section">
          <h3>{portuguese ? "Decisões" : "Decisions"}</h3>
          <ul>
            {summary.decisions.map((item, index) => (
              <li key={`${item.decision}-${index}`}>
                <strong>{item.decision}</strong>
                {item.context && <span> — {item.context}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.key_topics.length > 0 && (
        <section className="summary-section">
          <h3>{portuguese ? "Principais tópicos" : "Key topics"}</h3>
          {summary.key_topics.map((item, index) => (
            <div className="topic-item" key={`${item.topic}-${index}`}>
              <strong>{item.topic}</strong>
              <p>{item.summary}</p>
            </div>
          ))}
        </section>
      )}

      <div className="summary-lists">
        {summary.next_steps.length > 0 && (
          <section className="summary-section">
            <h3>{portuguese ? "Próximos passos" : "Next steps"}</h3>
            <ul>
              {summary.next_steps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}
        {summary.open_questions.length > 0 && (
          <section className="summary-section">
            <h3>{portuguese ? "Questões em aberto" : "Open questions"}</h3>
            <ul>
              {summary.open_questions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

function priorityLabel(priority: "high" | "medium" | "low", portuguese: boolean): string {
  if (!portuguese) return priority;
  return { high: "alta", medium: "média", low: "baixa" }[priority];
}

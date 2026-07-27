import {
  simplifyDailyResult,
  type DailyResult,
  type SimplifiedDailyUpdate
} from "@meeting-copilot/contracts";

export function DailySummaryCard({
  summary,
  portuguese
}: {
  summary: DailyResult;
  portuguese: boolean;
}) {
  const report = simplifyDailyResult(summary);

  return (
    <article className="meeting-summary-card daily-summary-card daily-summary-simple">
      <p className="eyebrow">{portuguese ? "RESUMO DA DAILY COM IA" : "AI DAILY SUMMARY"}</p>
      <h2 className="summary-title">{report.title}</h2>

      <div className="simple-daily-list">
        {report.participantUpdates.map((update, index) => (
          <ParticipantUpdate
            key={`${update.participant || "unresolved"}-${index}`}
            update={update}
            portuguese={portuguese}
          />
        ))}
      </div>
    </article>
  );
}

function ParticipantUpdate({
  update,
  portuguese
}: {
  update: SimplifiedDailyUpdate;
  portuguese: boolean;
}) {
  const participant =
    update.participant ||
    (portuguese ? "Participante não identificado" : "Unidentified participant");

  return (
    <section className="simple-daily-participant">
      <h3>{participant}</h3>
      <ul>
        {update.updates.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
      {update.possibleParticipants.length > 0 && (
        <p className="daily-possible-participants">
          <strong>{portuguese ? "Possíveis participantes:" : "Possible participants:"}</strong>{" "}
          {update.possibleParticipants.join(", ")}
        </p>
      )}
      <DailyHighlight
        label={highlightLabel("blocker", update.blockers.length, portuguese)}
        items={update.blockers}
        tone="blocker"
      />
      <DailyHighlight
        label={highlightLabel("next", update.nextSteps.length, portuguese)}
        items={update.nextSteps}
        tone="next"
      />
    </section>
  );
}

function DailyHighlight({
  label,
  items,
  tone
}: {
  label: string;
  items: string[];
  tone: "blocker" | "next";
}) {
  if (!items.length) return null;
  return (
    <p className={`simple-daily-highlight is-${tone}`}>
      <strong>{label}</strong> {joinItems(items)}
    </p>
  );
}

function highlightLabel(kind: "blocker" | "next", itemCount: number, portuguese: boolean): string {
  if (kind === "blocker") {
    if (!portuguese) return itemCount === 1 ? "Blocker:" : "Blockers:";
    return itemCount === 1 ? "Bloqueio:" : "Bloqueios:";
  }
  if (!portuguese) return itemCount === 1 ? "Next step:" : "Next steps:";
  return itemCount === 1 ? "Próximo passo:" : "Próximos passos:";
}

function joinItems(items: string[]): string {
  return items.join(" ");
}

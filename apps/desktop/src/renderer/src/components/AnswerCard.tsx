import type { Answer } from "@meeting-copilot/contracts";

export function AnswerCard({
  answer,
  labels
}: {
  answer: Answer;
  labels: {
    answer: string;
    why: string;
    example: string;
    assumptions: string;
    confidence: (value: string) => string;
  };
}) {
  return (
    <article className="answer-card">
      <header>
        <span className={`confidence confidence-${answer.confidence}`}>
          {labels.confidence(answer.confidence)}
        </span>
      </header>
      <section className="direct-answer">
        <h2>{labels.answer}</h2>
        <p>{answer.sayThis}</p>
      </section>
      {answer.keyPoints.length > 0 && (
        <ul className="key-points">
          {answer.keyPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <details open>
        <summary>{labels.why}</summary>
        <p>{answer.details || answer.sayThis}</p>
      </details>
      {answer.example && (
        <details open>
          <summary>{labels.example}</summary>
          <pre>
            <code>{answer.example}</code>
          </pre>
        </details>
      )}
      {answer.assumptions.length > 0 && (
        <details>
          <summary>{labels.assumptions}</summary>
          <ul>
            {answer.assumptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
